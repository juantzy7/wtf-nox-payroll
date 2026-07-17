import { BrowserProvider, Contract } from "ethers";
import { createEthersHandleClient } from "@iexec-nox/handle";
import { EthereumProvider } from "@walletconnect/ethereum-provider";
import { WC_PROJECT_ID } from "./config.js";
import deployment from "../deployment.VeilPay.json";
import artifact from "../artifacts/VeilPay.json";

const CONTRACT = deployment.address;
const ABI = artifact.abi;
const SEPOLIA = 11155111n;
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";

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

// ---- Wallet connection (extension OR WalletConnect) ----
async function connectExtension() {
  if (!window.ethereum) throw new Error("no_extension");
  provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
}

async function connectWalletConnect() {
  if (!WC_PROJECT_ID || WC_PROJECT_ID === "YOUR_WALLETCONNECT_PROJECT_ID") {
    throw new Error("no_wc_id");
  }
  const wc = await EthereumProvider.init({
    projectId: WC_PROJECT_ID,
    chains: [11155111],
    optionalChains: [],
    rpcMap: { 11155111: RPC },
    showQrModal: true,
    methods: ["eth_sendTransaction", "personal_sign"],
  });
  await wc.connect();
  provider = new BrowserProvider(wc);
  signer = await provider.getSigner();
}

async function ensureSepolia() {
  const net = await provider.getNetwork();
  if (net.chainId !== SEPOLIA) {
    log("⚠️ Switching to Sepolia…");
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
      provider = new BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
    } catch {
      log("⚠️ Please switch to Sepolia manually in your wallet.", "");
    }
  }
}

$("connect").onclick = async () => {
  if ($("connect").disabled) return;
  $("connect").disabled = true;
  $("connect").innerHTML = '<span class="spinner"></span>Connecting…';
  log("Connecting…");
  try {
    try {
      await connectExtension();
      log("✅ Extension wallet connected.", "val");
    } catch (e) {
      if (e.message !== "no_extension") throw e;
      log("ℹ️ No browser wallet — trying WalletConnect (mobile/Safe)…");
      await connectWalletConnect();
      log("✅ WalletConnect connected.", "val");
    }
    await ensureSepolia();
    account = await signer.getAddress();
    contract = new Contract(CONTRACT, ABI, signer);
    handleClient = await createEthersHandleClient(signer);

    $("status").textContent = "Connected: " + account.slice(0, 6) + "…" + account.slice(-4);
    $("status").classList.add("ok");
    ["assign", "viewSalary", "claim"].forEach((id) => ($(id).disabled = false));
    $("empAddr").value = account;
    $("connect").disabled = false;
    $("connect").textContent = "Connected";
    log("   Network: Sepolia ✓  Ready.", "val");
  } catch (e) {
    if (e.message === "no_wc_id") {
      log("❌ WalletConnect not configured. Open in desktop browser with MetaMask/Rabby, or set WC_PROJECT_ID in app/config.js", "");
      window.toast && window.toast("WalletConnect not set", "Use desktop wallet or set WC_PROJECT_ID.", false);
    } else {
      log("❌ " + (e.message || e), "");
      window.toast && window.toast("Connection failed", e.message || String(e), false);
    }
  } finally {
    $("connect").disabled = false;
    if ($("connect").textContent.includes("Connecting")) {
      $("connect").textContent = "Connect Wallet";
    }
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
    log("   sending addEmployee tx… confirm in wallet");
    const tx = await contract.addEmployee(addr, handle, handleProof);
    await tx.wait();
    log("✅ Salary assigned — encrypted on-chain. Plaintext never exposed. 🔒", "val");
    window.toast && window.toast("Salary assigned", "Encrypted on-chain — plaintext never exposed 🔒");
  } catch (e) {
    log("❌ " + (e.shortMessage || e.message || e), "");
    window.toast && window.toast("Assignment failed", e.shortMessage || e.message || String(e), false);
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
    window.toast && window.toast("Salary decrypted", "Your figure: " + val.toString() + " (only you can read)");
  } catch (e) {
    log("❌ " + (e.message || e), "");
    window.toast && window.toast("Decrypt failed", e.message || String(e), false);
  }
};

$("claim").onclick = async () => {
  try {
    $("claim").disabled = true;
    log("\n[Employee] Claiming salary…");
    const tx = await contract.claimSalary();
    await tx.wait();
    log("✅ Claimed. Owed reset to encrypted zero.", "val");
    window.toast && window.toast("Claimed", "Owed reset to encrypted zero.");
  } catch (e) {
    log("❌ " + (e.shortMessage || e.message || e), "");
    window.toast && window.toast("Claim failed", e.shortMessage || e.message || String(e), false);
  } finally {
    $("claim").disabled = false;
  }
};
