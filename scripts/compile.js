// Compile a contract with solc, resolving node_modules imports.
// Usage: node scripts/compile.js <ContractName>
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const NAME = process.argv[2] || "ConfidentialPiggyBank";
const ROOT = __dirname + "/..";
const NM = path.join(ROOT, "node_modules");

function findImport(importPath) {
  const candidates = [
    path.join(NM, importPath),
    path.join(ROOT, "contracts", importPath),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return { contents: fs.readFileSync(c, "utf8") };
  }
  return { error: "File not found: " + importPath };
}

const source = fs.readFileSync(path.join(ROOT, "contracts", NAME + ".sol"), "utf8");

const input = {
  language: "Solidity",
  sources: { [NAME + ".sol"]: { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "cancun",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

if (output.errors) {
  let hasError = false;
  for (const e of output.errors) {
    if (e.severity === "error") { hasError = true; console.error("ERROR:", e.formattedMessage); }
    else console.warn("warn:", e.formattedMessage.split("\n")[0]);
  }
  if (hasError) { console.error("\n❌ Compile FAILED"); process.exit(1); }
}

const c = output.contracts[NAME + ".sol"][NAME];
const artifact = { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
fs.mkdirSync(path.join(ROOT, "artifacts"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "artifacts", NAME + ".json"), JSON.stringify(artifact, null, 2));
console.log("✅ Compile OK:", NAME, "| bytecode", c.evm.bytecode.object.length / 2, "bytes");
