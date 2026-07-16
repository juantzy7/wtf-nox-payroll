# 📝 Feedback on iExec Nox — ConfidentialPayroll (WTF Hackathon)

This document records our hands-on experience building **ConfidentialPayroll**
on iExec Nox during the WTF!! Hackathon — Summer Edition.

## What we built

A confidential payroll contract: employers assign **encrypted salaries**
(`euint256`), employees decrypt only their own figure (gasless, ACL-gated),
and claiming resets the owed amount to an encrypted zero. The public
contract, events, and ERC-20 rails stay transparent — **only the numbers
are private**. This is a direct answer to the brief: take a
public-by-design pattern (payroll) and add privacy with Nox without
modifying any underlying protocol.

- Contract: `0xDA1D18CA8b5f1aDc5735Ff60726F1b4fD1cFEc3B` (Sepolia)
- Stack: Solidity 0.8.36 + ethers v6 + `@iexec-nox/handle` + `@iexec-nox/nox-protocol-contracts`

## What worked well ✅

1. **The JS SDK (`@iexec-nox/handle`) is clean.** `createEthersHandleClient`,
   `encryptInput(value, 'uint256', contract)`, and `decrypt(handle)` cover the
   whole confidential-data lifecycle with minimal boilerplate. EIP-712
   gasless decryption is a genuinely nice developer experience.
2. **Composability is real.** We store encrypted handles and still emit
   normal events and expose public view functions (`employeeCount()`).
   Privacy is added without fragmenting the app.
3. **`safeSub` / `select` in the Nox Solidity SDK** made the "claim and reset
   to zero" logic safe and obvious — no custom underflow handling needed.
4. **TEE confidentiality model is easy to explain.** "Encrypted in an Intel
   TDX enclave, only a handle hits the chain" is a story non-crypto
   stakeholders immediately get.

## Pain points & suggestions 🛠️

1. **ACL quirk on raw `externalEuint256` handles.**
   Storing a raw external handle directly and then calling `Nox.allow(...)`
   fails at decrypt time with `403 access_denied: not a viewer`. The fix that
   worked: route the value through a contract-owned handle first —
   `owed = Nox.add(Nox.toEuint256(0), amount)` — before granting permissions.
   **Suggestion:** document this explicitly in the Solidity SDK README; it is
   the single most likely stumbling block for newcomers.

2. **Handle Gateway rate / propagation timing.**
   Right after `addEmployee`, an immediate `decrypt` sometimes returned
   `403` for a second or two before succeeding. We added a small retry
   (5×2s) and it became reliable. **Suggestion:** either document expected
   propagation latency or return a clearer "handle not yet ready" status.

3. **SDK Typescript-only runtime types.** Only `bool, uint16, uint256,
   int16, int256` are supported at runtime — fine for payroll, but worth
   surfacing prominently so builders don't design around unsupported types.

4. **No Hardhat required.** We compiled with a tiny `solc` script + a
   node_modules import resolver. Works, but a first-class "no-Hardhat" path
   in the docs would help lightweight setups.

## Verdict

Nox delivers on its promise: confidential smart contracts that stay
composable. The developer surface is small and pleasant; the two sharp
edges (ACL routing, gateway latency) are easy to work around once known.
We'd happily build a production payroll product on this.

— ConfidentialPayroll team
