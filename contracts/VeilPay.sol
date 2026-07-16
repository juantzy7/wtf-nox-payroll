// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

// VeilPay — private on-chain salaries powered by Nox.
//
// Problem: normal on-chain payroll leaks every salary. Anyone reading the
// chain sees exactly what each employee earns. That kills adoption for real
// companies.
//
// Solution: store each salary as an encrypted euint256. Amounts stay hidden
// on-chain; only employer and the specific employee can decrypt their own
// figure off-chain via the JS SDK. Public infra (ERC-20 funding, event log)
// stays transparent — only the numbers are confidential.

import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

contract VeilPay {
    address public employer;

    // Encrypted salary owed to each employee (accrued, claimable).
    mapping(address => euint256) private owed;
    // Track registered employees for enumeration / demo.
    address[] public employees;
    mapping(address => bool) public isEmployee;

    event EmployeeAdded(address indexed employee);
    event SalaryAssigned(address indexed employee);
    event SalaryClaimed(address indexed employee);

    modifier onlyEmployer() {
        require(msg.sender == employer, "not employer");
        _;
    }

    constructor() {
        employer = msg.sender;
    }

    // Employer registers an employee with an encrypted salary amount.
    // The amount is encrypted off-chain (JS SDK) and passed as a handle+proof.
    function addEmployee(
        address employee,
        externalEuint256 inputHandle,
        bytes calldata inputProof
    ) external onlyEmployer {
        require(employee != address(0), "zero addr");
        euint256 amount = Nox.fromExternal(inputHandle, inputProof);

        if (!isEmployee[employee]) {
            isEmployee[employee] = true;
            employees.push(employee);
            // Route through a contract-produced handle so ACL grants apply
            // to a handle owned by this contract (not the raw external one).
            owed[employee] = Nox.add(Nox.toEuint256(0), amount);
            emit EmployeeAdded(employee);
        } else {
            // top-up existing owed balance
            owed[employee] = Nox.add(owed[employee], amount);
        }

        // Permissions: contract can reuse handle; employer + employee can decrypt.
        Nox.allowThis(owed[employee]);
        Nox.allow(owed[employee], employer);
        Nox.allow(owed[employee], employee);

        emit SalaryAssigned(employee);
    }

    // Employee claims their full owed salary. Amount stays encrypted:
    // after claim, owed is reset to encrypted zero. Uses safeSub so an
    // underflow can never leak or revert-based-leak information.
    function claimSalary() external {
        require(isEmployee[msg.sender], "not employee");

        euint256 current = owed[msg.sender];
        // full withdrawal: owed - owed = 0, guaranteed no underflow
        (ebool ok, euint256 remaining) = Nox.safeSub(current, current);
        // select keeps result well-defined even if ok is false (defensive)
        euint256 newOwed = Nox.select(ok, remaining, Nox.toEuint256(0));

        owed[msg.sender] = newOwed;

        Nox.allowThis(owed[msg.sender]);
        Nox.allow(owed[msg.sender], employer);
        Nox.allow(owed[msg.sender], msg.sender);

        emit SalaryClaimed(msg.sender);
    }

    // Returns the encrypted owed handle for a given employee.
    // Only decryptable off-chain by employer or that employee (ACL enforced).
    function owedOf(address employee) external view returns (euint256) {
        return owed[employee];
    }

    function employeeCount() external view returns (uint256) {
        return employees.length;
    }
}
