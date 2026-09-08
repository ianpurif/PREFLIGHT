// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { RovaultaRegistry } from "../src/RovaultaRegistry.sol";

interface VmScript {
    function addr(uint256 privateKey) external returns (address keyAddr);
    function envUint(string calldata name) external returns (uint256 value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployRovaultaRegistry {
    VmScript private constant vm =
        VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    error WrongChain(uint256 actualChainId);

    function run() external returns (RovaultaRegistry registry) {
        if (block.chainid != 11_155_111) revert WrongChain(block.chainid);

        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_DEPLOYER_PRIVATE_KEY");
        address initialOwner = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        registry = new RovaultaRegistry(initialOwner);
        vm.stopBroadcast();
    }
}
