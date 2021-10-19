// Copyright 2021 Binary Cat Ltd.

// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use
// this file except in compliance with the License. You may obtain a copy of the
// License at http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software distributed
// under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
// CONDITIONS OF ANY KIND, either express or implied. See the License for the
// specific language governing permissions and limitations under the License.

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./BinaryBet.sol";

contract Manager is Ownable {
    mapping(bytes32 => bool) public usedId;
    mapping(address => bool) public usedAddress;
    BinaryBet[] public assetContracts;

    event NewAsset (string assetId, address contractAddress);

    function assetCount() public view returns (uint) {
        return assetContracts.length;
    }

    function assetExists(string calldata asset) public view returns (bool) {
        return usedId[keccak256(bytes(asset))];
    }

    function addAsset(string calldata asset, address contractAddress) external onlyOwner {
        bytes32 id = keccak256(bytes(asset));
        require(!usedId[id], "Asset already exists");
        require(!usedAddress[contractAddress], "Address already used");
        usedId[id] = true;
        usedAddress[contractAddress] = true;

        assetContracts.push(BinaryBet(contractAddress));
        emit NewAsset(asset, contractAddress);
    }

    function updatePrice() external {
        for (uint i = 0; i < assetContracts.length; i++) {
            assetContracts[i].updatePrice();
        }
    }

    function claim() external {
        for (uint i = 0; i < assetContracts.length; i++) {
            assetContracts[i].updateBalance(msg.sender);
        }
    }

}
