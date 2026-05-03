// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint) public balances;

    // Deposit funds into the bank
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // Vulnerability: Reentrancy
    function withdraw() public {
        uint bal = balances[msg.sender];
        require(bal > 0, "Insufficient balance");

        // External call before state update
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Failed to send Ether");

        balances[msg.sender] = 0;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
}
