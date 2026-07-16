# 🔐 ConfidentialPayroll — Private Salaries on a Public Chain

> Built for the **WTF!! Hackathon — Summer Edition** (iExec / Nox)
> Confidential smart contract layer: **iExec Nox** · Chain: **Ethereum Sepolia**

## The Problem

On-chain payroll is a privacy disaster. Put salaries on a normal smart
contract and **every amount is public forever** — competitors see your
comp bands, employees see each other's pay, acquirers see your burn.
That single leak is why real companies won't touch on-chain payroll.

## The Solution

**ConfidentialPayroll** stores each salary as an **encrypted `euint256`**
using iExec Nox. Amounts are encrypted off-chain inside an Intel TDX
enclave; on-chain only a 32-byte *handle* is stored — never the number.

- **Employer** assigns salaries — encrypted, invisible to the public.
- **Employee** decrypts *only their own* figure (gasless, ACL-gated).
- **Claim** resets owed to an encrypted zero.
- Public infrastructure (the contract, its events, ERC-20 rails) stays
  fully transparent and composable. **Only the numbers are private.**

This is exactly the challenge brief: take a transparent-by-design
pattern and add privacy with Nox **without breaking composability**.

## Architecture

```
Employer                Nox Handle Gateway (Intel TDX)         Sepolia
   |  encryptInput(5000, uint256, contract)  |                    |
   |---------------------------------------->|  encrypt in enclave |
   |         { handle, handleProof }         |                    |
   |<----------------------------------------|                    |
   |  addEmployee(employee, handle, proof)   |                    |
   |------------------------------------------------------------> | verify proof
   |                                         |     store euint256  | (handle only)
Employee                                     |                    |
   |  decrypt(handle)  (EIP-712, gasless)    |                    |
   |---------------------------------------->| ACL check on-chain  |
   |            plaintext salary             |                    |
   |<----------------------------------------|                    |
```

### Contract — `contracts/ConfidentialPayroll.sol`

| Function | Who | What |
|----------|-----|------|
| `addEmployee(addr, handle, proof)` | employer | register/top-up an **encrypted** salary |
| `claimSalary()` | employee | claim; owed resets to encrypted zero (`safeSub` + `select`) |
| `owedOf(addr)` | anyone | returns the encrypted **handle** (only owner/employee can decrypt) |
| `employeeCount()` | anyone | roster size (public, non-sensitive) |

Key Nox detail: salaries are routed through a **contract-owned handle**
(`Nox.add(Nox.toEuint256(0), amount)`) before ACL grants, so
`Nox.allow(...)` correctly authorizes the employer and employee to
decrypt. Every state-changing op re-grants `allowThis` + `allow`.

## Live Deployment (Sepolia)

- Contract: `0xDA1D18CA8b5f1aDc5735Ff60726F1b4fD1cFEc3B`
- Explorer: https://sepolia.etherscan.io/address/0xDA1D18CA8b5f1aDc5735Ff60726F1b4fD1cFEc3B

## Tech Stack

- **iExec Nox** — `@iexec-nox/nox-protocol-contracts` (Solidity SDK),
  `@iexec-nox/handle` (JS SDK for encrypt/decrypt)
- **Solidity** 0.8.36 (evmVersion cancun)
- **ethers** v6
- Custom `solc` compile script with a node_modules import resolver
  (no Hardhat needed — lightweight, VPS-friendly)

## Wallet Support

The dApp is **wallet-agnostic**:

- **Desktop:** MetaMask, Rabby, Coinbase Wallet, Brave Wallet (any EIP-1193
  browser extension) — click **Connect Wallet**, pick your extension.
- **Mobile / Safe (multisig):** WalletConnect — click **Connect Wallet** on a
  phone (no extension) and scan the QR with MetaMask mobile, Rainbow, Rabby,
  or a Safe vault.

To enable WalletConnect, set your **WalletConnect Cloud project id** in
`app/config.js`:

```js
export const WC_PROJECT_ID = "your_id_from_cloud.walletconnect.com";
```

(Get a free id at https://cloud.walletconnect.com.) Without it, the dApp still
works fully on desktop extensions — WalletConnect is an optional mobile path.

## Run It

```bash
npm install
cp .env.example .env          # add PRIVATE_KEY (testnet) + RPC_URL

# compile + deploy
node scripts/compile.js ConfidentialPayroll
node scripts/deploy.js  ConfidentialPayroll

# full narrated demo (3 employees, encrypt → decrypt → claim)
node scripts/demo.js
```

### Run the dApp locally

```bash
python3 -m http.server 8080
# open http://localhost:8080/  (or the GitHub Pages URL)
```

### Demo output

```
🔐  CONFIDENTIAL PAYROLL — powered by iExec Nox
[1] EMPLOYER assigns encrypted salaries
    • Alice (Engineer)     salary=•••••  handle=0x0000aa36a7230135…  ✅
    • Bob (Designer)       salary=•••••  handle=0x0000aa36a72301a2…  ✅
    • Carol (PM)           salary=•••••  handle=0x0000aa36a7230100…  ✅
    Salary figures are NOWHERE in plaintext. 🔒
[2] EMPLOYER decrypts the confidential total = 23700  ✅
[3] EMPLOYEE claims salary — owed resets to encrypted zero  ✅
```

## Why It Wins

- **Clean Nox integration** — minimal surface, idiomatic SDK usage.
- **Real privacy** — salary values never exist in plaintext on-chain.
- **Product-ready shape** — payroll is a concrete institutional use case
  (tags: DeFi, Institutional, Tokenisation).
- **Composability preserved** — public contract + events, private numbers.

## Roadmap

- [ ] ERC-20 funded payouts (encrypted amount → real token transfer)
- [ ] Per-employee distinct wallets + streaming (Sablier-style)
- [ ] Web dashboard (employer) + claim page (employee) with MetaMask

## License

MIT
