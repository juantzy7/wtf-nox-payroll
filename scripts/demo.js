// ConfidentialPayroll — narrated CLI demo.
// Shows a company running private payroll for multiple employees on Sepolia.
// Salaries are encrypted end-to-end; nothing sensitive appears in plaintext on-chain.
//
// Usage: node scripts/demo.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { createEthersHandleClient } = require("@iexec-nox/handle");

const DEPLOY = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployment.ConfidentialPayroll.json"), "utf8"));
const ABI = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "artifacts", "ConfidentialPayroll.json"), "utf8")).abi;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const line = (s = "") => console.log(s);
const rule = () => line("─".repeat(60));

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const employer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const CONTRACT = DEPLOY.address;
  const contract = new ethers.Contract(CONTRACT, ABI, employer);
  const hc = await createEthersHandleClient(employer);

  rule();
  line("  🔐  CONFIDENTIAL PAYROLL — powered by iExec Nox");
  line("      Private salaries on a public blockchain (Sepolia)");
  rule();
  line("  Employer : " + employer.address);
  line("  Contract : " + CONTRACT);
  line("  Explorer : https://sepolia.etherscan.io/address/" + CONTRACT);
  rule();
  await sleep(400);

  // Demo roster — different secret salaries. In production each employee is a
  // distinct wallet; here they share the demo wallet's ACL for a headless run.
  const roster = [
    { name: "Alice (Engineer)", salary: 9000n },
    { name: "Bob (Designer)",   salary: 6500n },
    { name: "Carol (PM)",       salary: 8200n },
  ];

  line("\n[1] EMPLOYER assigns encrypted salaries");
  line("    Each amount is encrypted off-chain in an Intel TDX enclave.");
  line("    On-chain, only a 32-byte handle is stored — never the number.\n");

  // Because a single demo wallet is used, we accumulate all salaries onto it,
  // then show per-assignment encryption. We reset first for a clean run.
  let total = 0n;
  for (const emp of roster) {
    const { handle, handleProof } = await hc.encryptInput(emp.salary, "uint256", CONTRACT);
    const tx = await contract.addEmployee(employer.address, handle, handleProof);
    await tx.wait();
    total += emp.salary;
    line(`    • ${emp.name.padEnd(20)} salary=•••••  handle=${handle.slice(0, 18)}…  ✅`);
    await sleep(200);
  }

  line("\n    What an outside observer sees on-chain: only opaque handles.");
  line("    Salary figures are NOWHERE in plaintext. 🔒");
  await sleep(400);

  line("\n[2] EMPLOYER decrypts the confidential total (ACL-gated, gasless)");
  const owedHandle = await contract.owedOf(employer.address);
  let owed;
  for (let i = 0; i < 5; i++) {
    try {
      ({ value: owed } = await hc.decrypt(owedHandle));
      break;
    } catch (e) {
      if (i === 4) throw e;
      await sleep(2000);
    }
  }
  line(`    Decrypted payroll owed = ${owed.toString()}  (expected ${total})  ` + (owed === total ? "✅" : "❌"));
  await sleep(400);

  line("\n[3] EMPLOYEE claims salary — owed resets to encrypted zero");
  let tx = await contract.claimSalary();
  await tx.wait();
  const afterHandle = await contract.owedOf(employer.address);
  let after;
  for (let i = 0; i < 5; i++) {
    try { ({ value: after } = await hc.decrypt(afterHandle)); break; }
    catch (e) { if (i === 4) throw e; await sleep(2000); }
  }
  line(`    Owed after claim = ${after.toString()}  ` + (after === 0n ? "✅ zeroed" : "❌"));

  rule();
  line("  ✅  DEMO COMPLETE");
  line("      • Salaries encrypted end-to-end via Nox (TEE)");
  line("      • Public infra (contract, events) stays transparent");
  line("      • Only the numbers are private — full composability kept");
  rule();
}

main().catch((e) => { console.error("❌", e.message || e); process.exit(1); });
