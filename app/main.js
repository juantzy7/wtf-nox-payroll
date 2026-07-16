import { BrowserProvider, Contract } from "ethers";
import { createEthersHandleClient } from "@iexec-nox/handle";
import deployment from "../deployment.ConfidentialPayroll.json";
import artifact from "../artifacts/ConfidentialPayroll.json";

const CONTRACT = deployment.address;
const ABI = artifact.abi;
const SEPOLIA = 11155111n;

const $ = (id) => document.getElementById(id);
const logEl = $("log");
function log(msg, cls) {
  const span = cls ? `<span class="${cls}">${msg}</span>` : msg;
  logEl.innerHTML += span + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

let provider, signer, contract, handleClient, account;

$("ctxLink").textContent = CONTRACT;
$("ctxLink").href = "https://sepolia.etherscan.io/address/" + CONTRACT;

$("connect").onclick = async () => {
  if (!window.ethereum) return log("❌ MetaMask not found. Install it first.", "");
  try {
    provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    const net = await provider.getNetwork();
    if (net.chainId !== SEPOLIA) {
      log("⚠️ Wrong network. Switching to Sepolia…", "");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
        provider = new BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
      } catch {
        return log("❌ Please switch MetaMask to Sepolia manually.", "");
      }
    }

    contract = new Contract(CONTRACT, ABI, signer);
    handleClient = await createEthersHandleClient(signer);

    $("status").textContent = "Connected: " + account.slice(0, 6) + "…" + account.slice(-4);
    ["assign", "viewSalary", "claim"].forEach((id) => ($(id).disabled = false));
    $("empAddr").value = account; // convenience: self as employee for demo
    log("✅ Connected " + account, "val");
    log("   Network: Sepolia ✓");
  } catch (e) {
    log("❌ " + (e.message || e), "");
  }
};

$("assign").onclick = async () => {
  const addr = $("empAddr").value.trim();
  const salary = $("empSalary").value.trim();
  if (!addr || !salary) return log("❌ Fill employee address + salary.", "");
  try {
    $("assign").disabled = true;
    log(`\n[Employer] Encrypting salary (hidden) for ${addr.slice(0, 8)}…`);
    const { handle, handleProof } = await handleClient.encryptInput(
      BigInt(salary), "uint256", CONTRACT
    );
    log("   handle: " + handle.slice(0, 22) + "… (only this goes on-chain)");
    log("   sending addEmployee tx… confirm in MetaMask");
    const tx = await contract.addEmployee(addr, handle, handleProof);
    await tx.wait();
    log("✅ Salary assigned — encrypted on-chain. Plaintext never exposed. 🔒", "val");
  } catch (e) {
    log("❌ " + (e.shortMessage || e.message || e), "");
  } finally {
    $("assign").disabled = false;
  }
};

$("viewSalary").onclick = async () => {
  try {
    log("\n[Employee] Decrypting my salary (gasless, ACL-gated)…");
    const h = await contract.owedOf(account);
    let val;
    for (let i = 0; i < 5; i++) {
      try { ({ value: val } = await handleClient.decrypt(h)); break; }
      catch (e) { if (i === 4) throw e; await new Promise(r => setTimeout(r, 2000)); }
    }
    log("✅ My salary = " + val.toString() + "  (only I can read this)", "val");
  } catch (e) {
    log("❌ " + (e.message || e), "");
  }
};

$("claim").onclick = async () => {
  try {
    $("claim").disabled = true;
    log("\n[Employee] Claiming salary…");
    const tx = await contract.claimSalary();
    await tx.wait();
    log("✅ Claimed. Owed reset to encrypted zero.", "val");
  } catch (e) {
    log("❌ " + (e.shortMessage || e.message || e), "");
  } finally {
    $("claim").disabled = false;
  }
};
