// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { RovaultaRegistry } from "../src/RovaultaRegistry.sol";
import { TestBase } from "./TestBase.sol";

contract RegistryHandler {
    RovaultaRegistry public immutable registry;
    bytes32[] private recordedDigests;
    mapping(bytes32 digest => bool revoked) public everRevoked;

    uint256 public successfulRecords;
    uint256 public successfulRevocations;
    uint256 public nonClearAttempts;
    uint256 public nonClearAccepted;
    uint256 public nonClearUnexpectedFailure;
    uint256 public overwriteAttempts;
    uint256 public overwriteAccepted;
    uint256 public overwriteUnexpectedFailure;
    bytes32 public protectedDigest;

    constructor(RovaultaRegistry target) {
        registry = target;
    }

    function record(uint256 seed, uint32 lifetimeSeed) public {
        if (recordedDigests.length >= 32) return;
        uint64 lifetime = uint64(uint256(lifetimeSeed) % 2_592_000) + 1;
        RovaultaRegistry.ClearanceInput memory input = _input(seed, lifetime);
        (bool success,) =
            address(registry).call(abi.encodeCall(RovaultaRegistry.recordClearance, (input)));
        if (success) {
            recordedDigests.push(input.clearanceDigest);
            ++successfulRecords;
        }
    }

    function recordLongLived(uint256 seed) public {
        if (recordedDigests.length >= 32) return;
        RovaultaRegistry.ClearanceInput memory input = _input(seed, 315_360_000);
        (bool success,) =
            address(registry).call(abi.encodeCall(RovaultaRegistry.recordClearance, (input)));
        if (success) {
            recordedDigests.push(input.clearanceDigest);
            if (protectedDigest == bytes32(0)) protectedDigest = input.clearanceDigest;
            ++successfulRecords;
        }
    }

    function revoke(uint256 seed) public {
        uint256 length = recordedDigests.length;
        if (length == 0) return;
        bytes32 digest = recordedDigests[seed % length];
        if (digest == protectedDigest) return;
        (bool success,) =
            address(registry).call(abi.encodeCall(RovaultaRegistry.revokeClearance, (digest)));
        if (success) {
            everRevoked[digest] = true;
            ++successfulRevocations;
        }
    }

    function advanceTime(uint32 deltaSeed) public {
        uint256 delta = uint256(deltaSeed) % 604_800;
        VmHandler(address(uint160(uint256(keccak256("hevm cheat code")))))
            .warp(block.timestamp + delta);
    }

    function attemptNonClear(uint256 seed, bool reject) public {
        RovaultaRegistry.ClearanceInput memory input = _input(seed, 86_400);
        input.verdict = reject ? bytes32("REJECT") : bytes32("HOLD");
        ++nonClearAttempts;
        (bool success, bytes memory revertData) =
            address(registry).call(abi.encodeCall(RovaultaRegistry.recordClearance, (input)));
        if (success) {
            ++nonClearAccepted;
        } else if (_selector(revertData) != RovaultaRegistry.UnsupportedVerdict.selector) {
            ++nonClearUnexpectedFailure;
        }
    }

    function attemptOverwrite(uint256 seed) public {
        uint256 length = recordedDigests.length;
        if (length == 0) return;
        bytes32 digest = recordedDigests[seed % length];
        RovaultaRegistry.ClearanceInput memory input = _input(seed ^ type(uint256).max, 86_400);
        input.clearanceDigest = digest;
        ++overwriteAttempts;
        (bool success, bytes memory revertData) =
            address(registry).call(abi.encodeCall(RovaultaRegistry.recordClearance, (input)));
        if (success) {
            ++overwriteAccepted;
        } else if (_selector(revertData) != RovaultaRegistry.ClearanceAlreadyExists.selector) {
            ++overwriteUnexpectedFailure;
        }
    }

    function digestCount() external view returns (uint256) {
        return recordedDigests.length;
    }

    function digestAt(uint256 index) external view returns (bytes32) {
        return recordedDigests[index];
    }

    function _input(uint256 seed, uint64 lifetime)
        private
        view
        returns (RovaultaRegistry.ClearanceInput memory input)
    {
        bytes32 root = keccak256(abi.encode("rovaulta-invariant", seed));
        input.clearanceDigest = keccak256(abi.encode(root, "clearance-digest"));
        input.bindings = RovaultaRegistry.ClearanceBindings({
            clearanceIdHash: keccak256(abi.encode(root, "clearance-id")),
            evaluationIdHash: keccak256(abi.encode(root, "evaluation-id")),
            siteIdHash: keccak256(abi.encode(root, "site-id")),
            robotIdHash: keccak256(abi.encode(root, "robot-id")),
            robotBuildIdHash: keccak256(abi.encode(root, "build-id")),
            robotBuildDigest: keccak256(abi.encode(root, "build-digest")),
            safetyEnvelopeIdHash: keccak256(abi.encode(root, "envelope-id")),
            safetyEnvelopeCommitment: keccak256(abi.encode(root, "envelope-commitment")),
            evaluatorVersionHash: keccak256(abi.encode(root, "evaluator-version")),
            evaluationInputsDigest: keccak256(abi.encode(root, "evaluation-inputs")),
            issuedAt: uint64(block.timestamp),
            expiresAt: uint64(block.timestamp) + lifetime
        });
        input.verdict = bytes32("CLEAR");
    }

    function _selector(bytes memory revertData) private pure returns (bytes4 selector) {
        if (revertData.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(revertData, 0x20))
        }
    }
}

interface VmHandler {
    function warp(uint256 newTimestamp) external;
}

contract RovaultaRegistryInvariantTest is TestBase {
    struct FuzzSelector {
        address addr;
        bytes4[] selectors;
    }

    struct FuzzArtifactSelector {
        string artifact;
        bytes4[] selectors;
    }

    struct FuzzInterface {
        address addr;
        string[] artifacts;
    }

    RovaultaRegistry private registry;
    RegistryHandler private handler;
    bytes32 private activeAnchor;
    address[] private invariantTargets;

    function setUp() public {
        vm.warp(1_800_000_000);
        registry = new RovaultaRegistry(address(this));
        handler = new RegistryHandler(registry);
        registry.setRegistrar(address(handler), true);

        handler.record(1, 1_000);
        handler.revoke(0);
        handler.record(2, 1);
        vm.warp(block.timestamp + 2);
        handler.recordLongLived(3);
        activeAnchor = handler.digestAt(2);
        handler.attemptNonClear(4, false);
        handler.attemptNonClear(5, true);
        handler.attemptOverwrite(0);

        invariantTargets.push(address(handler));
    }

    function targetContracts() external view returns (address[] memory) {
        return invariantTargets;
    }

    function targetArtifactSelectors()
        external
        pure
        returns (FuzzArtifactSelector[] memory values)
    { }

    function targetArtifacts() external pure returns (string[] memory values) { }

    function excludeArtifacts() external pure returns (string[] memory values) { }

    function targetSenders() external pure returns (address[] memory values) { }

    function excludeSenders() external pure returns (address[] memory values) { }

    function excludeContracts() external pure returns (address[] memory values) { }

    function targetInterfaces() external pure returns (FuzzInterface[] memory values) { }

    function targetSelectors() external pure returns (FuzzSelector[] memory values) { }

    function excludeSelectors() external pure returns (FuzzSelector[] memory values) { }

    function invariantSeedStateMakesPropertiesNonVacuous() public view {
        assertTrue(handler.successfulRecords() >= 3);
        assertTrue(handler.successfulRevocations() >= 1);
    }

    function invariantRevokedAndExpiredClearancesAreNeverValid() public view {
        uint256 length = handler.digestCount();
        for (uint256 index; index < length; ++index) {
            bytes32 digest = handler.digestAt(index);
            RovaultaRegistry.Clearance memory clearance = registry.getClearance(digest);
            assertEq(clearance.verdict, bytes32("CLEAR"));
            if (handler.everRevoked(digest) || block.timestamp >= clearance.bindings.expiresAt) {
                assertFalse(registry.isClearanceValid(digest));
            }
        }
    }

    function invariantChangedBuildBindingNeverValidates() public view {
        uint256 length = handler.digestCount();
        for (uint256 index; index < length; ++index) {
            bytes32 digest = handler.digestAt(index);
            RovaultaRegistry.Clearance memory clearance = registry.getClearance(digest);
            clearance.bindings.robotBuildDigest ^= bytes32(uint256(1));
            assertFalse(registry.isClearanceValidFor(digest, clearance.bindings));
        }
    }

    function invariantLongLivedAnchorRemainsValid() public view {
        assertTrue(registry.isClearanceValid(activeAnchor));
    }

    function invariantInvalidRegistrationAndOverwriteNeverSucceed() public view {
        assertTrue(handler.nonClearAttempts() >= 2);
        assertTrue(handler.overwriteAttempts() >= 1);
        assertEq(handler.nonClearAccepted(), 0);
        assertEq(handler.nonClearUnexpectedFailure(), 0);
        assertEq(handler.overwriteAccepted(), 0);
        assertEq(handler.overwriteUnexpectedFailure(), 0);
    }
}
