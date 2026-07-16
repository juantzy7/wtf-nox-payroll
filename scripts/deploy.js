// Deploy a compiled contract to Sepolia using ethers v6.
// Usage: node scripts/deploy.js <ContractName>
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const NAME = process.argv[2] || "ConfidentialPiggyBank";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpc = process.env.RPC_URL;
  if (!pk || !rpc) throw new Error("PRIVATE_KEY / RPC_URL missing in .env");

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(pk, provider);

  const net = await provider.getNetwork();
  console.log("Network chainId:", net.chainId.toString(), "(Sepolia = 11155111)");
  console.log("Deployer:", wallet.address);

  const bal = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH");
  if (bal === 0n) throw new Error("Wallet has 0 Sepolia ETH — fund via faucet.");

  const artifact = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "artifacts", NAME + ".json"), "utf8")
  );

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log("\nDeploying " + NAME + "...");
  const contract = await factory.deploy();
  const txHash = contract.deploymentTransaction().hash;
  console.log("Tx sent:", txHash);
  await contract.waitForDeployment();

  const addr = await contract.getAddress();
  console.log("\n✅ DEPLOYED " + NAME + " at:", addr);
  console.log("Etherscan:", "https://sepolia.etherscan.io/address/" + addr);

  const outFile = path.join(__dirname, "..", "deployment." + NAME + ".json");
  fs.writeFileSync(outFile, JSON.stringify({
    name: NAME, address: addr, deployer: wallet.address, txHash, chainId: net.chainId.toString()
  }, null, 2));
  console.log("Saved:", outFile);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
