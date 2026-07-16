// Full confidential payroll flow on Sepolia using Nox.
//   1. Employer encrypts a salary (off-chain) and registers an employee.
//   2. Employee decrypts their own owed salary (ACL-gated, gasless).
//   3. Employee claims salary; owed resets to encrypted zero.
//   4. Verify owed is now 0 after claim.
//
// Usage:
//   node scripts/payroll-flow.js
// Requires .env: PRIVATE_KEY (employer), RPC_URL, and optionally
//   EMPLOYEE_PK (a second throwaway key). If EMPLOYEE_PK is absent,
//   a random employee wallet is generated (it can't claim without gas,
//   so for the claim step we fall back to employer as self-employee demo).

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { createEthersHandleClient } = require("@iexec-nox/handle");

const DEPLOY = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "deployment.VeilPay.json"), "utf8")
);
const ABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "artifacts", "VeilPay.json"), "utf8")
).abi;

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const employer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const CONTRACT = DEPLOY.address;

  console.log("Contract:", CONTRACT);
  console.log("Employer:", employer.address);

  // For the demo we use the employer address AS the employee too
  // (so it has gas + ACL to claim). In production these are distinct.
  const employee = employer;
  console.log("Employee (demo = employer):", employee.address);

  const contract = new ethers.Contract(CONTRACT, ABI, employer);
  const handleClient = await createEthersHandleClient(employer);

  // ---- STEP 1: employer encrypts salary + registers employee ----
  const SALARY = 5000n; // secret salary — never appears in plaintext on-chain
  console.log("\n[1] Encrypting salary (", SALARY.toString(), ") off-chain via Nox gateway...");
  const { handle, handleProof } = await handleClient.encryptInput(SALARY, "uint256", CONTRACT);
  console.log("    handle:", handle);

  console.log("    addEmployee tx...");
  let tx = await contract.addEmployee(employee.address, handle, handleProof);
  await tx.wait();
  console.log("    ✅ employee registered. count:", (await contract.employeeCount()).toString());

  // ---- STEP 2: employee decrypts their own owed salary ----
  console.log("\n[2] Employee decrypting owed salary (gasless, ACL-gated)...");
  const owedHandle = await contract.owedOf(employee.address);
  const { value: owedVal } = await handleClient.decrypt(owedHandle);
  console.log("    decrypted owed =", owedVal.toString(), owedVal === SALARY ? "✅ matches" : "❌ MISMATCH");

  // ---- STEP 3: employee claims salary ----
  console.log("\n[3] Claiming salary...");
  tx = await contract.claimSalary();
  await tx.wait();
  console.log("    ✅ claim tx mined");

  // ---- STEP 4: verify owed reset to 0 ----
  console.log("\n[4] Verifying owed reset to encrypted zero...");
  const owedAfter = await contract.owedOf(employee.address);
  const { value: afterVal } = await handleClient.decrypt(owedAfter);
  console.log("    decrypted owed after claim =", afterVal.toString(), afterVal === 0n ? "✅ zero" : "❌ NOT ZERO");

  console.log("\n🎉 Confidential payroll flow complete. Salary never exposed in plaintext on-chain.");
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
