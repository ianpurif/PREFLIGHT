// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { PreflightRegistry } from "../src/PreflightRegistry.sol";
import { TestBase } from "./TestBase.sol";

contract PreflightRegistryTest is TestBase {
    uint64 private constant NOW = 1_788_547_220;
    address private constant OWNER = address(0xA11CE);
    address private constant REGISTRAR = address(0xB0B);
    address private constant OTHER = address(0xCAFE);

    bytes32 private constant CLEARANCE_DIGEST =
        0xeae057bcdb07ac12c2b110a5bdb13ebbc30c0c0b25efc56379da2198fbce20e9;
    bytes32 private constant CLEARANCE_ID_HASH =
        0xa0ef25021e44a8596e028db416da632ff6c02581f26d62ad88d5684aa9bea180;
    bytes32 private constant EVALUATION_ID_HASH =
        0x9603e997a696851530897a157f06986dc99026435838812345582b8e04a0a5d8;
    bytes32 private constant SITE_ID_HASH =
        0x915981d0c81b7caf601da8e09706802ac6c8557c9fd616868cd4d0287939f75c;
    bytes32 private constant ROBOT_ID_HASH =
        0x97fd4f1da4d151cdf64fd5c41f72130b7cdd77036800060c12ca3746d57ebfc4;
    bytes32 private constant ROBOT_BUILD_ID_HASH =
        0x0650ab8ea1d001a7847d0a837f66653123cacf4467697f121c77291585f30145;
    bytes32 private constant ROBOT_BUILD_DIGEST =
        0x31a30bd81d7c1d989a977410389847925182f3c7f454bd75f8fc6612d408b5bd;
    bytes32 private constant ENVELOPE_ID_HASH =
        0x613b9b12ba109178d9e5c52cd507865c653cffaa1cc4ce7f7e8270fe97944907;
    bytes32 private constant ENVELOPE_COMMITMENT =
        0xf5b77c919b320d9cb16f834208b1842f493672010b5fbb59f72fa865c9edbdf8;
    bytes32 private constant EVALUATOR_VERSION_HASH =
        0x2a98346e1b17b6b4d0d0122841da247723c15c5fd0efa5b1e5b91275eab2b070;
    bytes32 private constant EVALUATION_INPUTS_DIGEST =
        0x38954b9164868b33c7afa9277410520fcdead18db6b1e1b93c45f366ef5fd0d8;

    event ClearanceRecorded(
        bytes32 indexed clearanceDigest,
        bytes32 indexed clearanceIdHash,
        bytes32 indexed robotBuildDigest,
        bytes32 verdict,
        address issuer,
        uint64 issuedAt,
        uint64 expiresAt
    );
    event ClearanceBindingsRecorded(
        bytes32 indexed clearanceDigest,
        bytes32 indexed siteIdHash,
        bytes32 indexed robotIdHash,
        bytes32 robotBuildIdHash,
        bytes32 safetyEnvelopeIdHash,
        bytes32 safetyEnvelopeCommitment,
        bytes32 evaluatorVersionHash,
        bytes32 evaluationIdHash,
        bytes32 evaluationInputsDigest
    );
    event ClearanceRevoked(
        bytes32 indexed clearanceDigest, address indexed actor, uint256 revokedAt
    );

    PreflightRegistry private registry;

    function setUp() public {
        vm.warp(NOW);
        registry = new PreflightRegistry(OWNER);
        vm.prank(OWNER);
        registry.setRegistrar(REGISTRAR, true);
    }

    function testAuthorizedRegistrarRecordsP1ClearanceAndEmitsPublicBindings() public {
        PreflightRegistry.ClearanceInput memory input = _input();

        vm.expectEmit(true, true, true, true);
        emit ClearanceRecorded(
            input.clearanceDigest,
            input.bindings.clearanceIdHash,
            input.bindings.robotBuildDigest,
            input.verdict,
            REGISTRAR,
            input.bindings.issuedAt,
            input.bindings.expiresAt
        );
        vm.expectEmit(true, true, true, true);
        emit ClearanceBindingsRecorded(
            input.clearanceDigest,
            input.bindings.siteIdHash,
            input.bindings.robotIdHash,
            input.bindings.robotBuildIdHash,
            input.bindings.safetyEnvelopeIdHash,
            input.bindings.safetyEnvelopeCommitment,
            input.bindings.evaluatorVersionHash,
            input.bindings.evaluationIdHash,
            input.bindings.evaluationInputsDigest
        );
        _recordAs(REGISTRAR, input);

        PreflightRegistry.Clearance memory stored = registry.getClearance(CLEARANCE_DIGEST);
        assertEq(stored.clearanceDigest, CLEARANCE_DIGEST);
        assertEq(stored.issuer, REGISTRAR);
        assertEq(stored.verdict, bytes32("CLEAR"));
        assertFalse(stored.revoked);
        assertTrue(stored.exists);
        assertEq(registry.clearanceDigestByIdHash(CLEARANCE_ID_HASH), CLEARANCE_DIGEST);
        assertTrue(registry.isClearanceValid(CLEARANCE_DIGEST));
        assertTrue(registry.isClearanceValidFor(CLEARANCE_DIGEST, input.bindings));
    }

    function testOwnerIsInitialRegistrar() public {
        _recordAs(OWNER, _input());
        assertTrue(registry.isClearanceValid(CLEARANCE_DIGEST));
    }

    function testUnauthorizedRegistrarCannotRecord() public {
        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.UnauthorizedRegistrar.selector, OTHER)
        );
        _recordAs(OTHER, _input());
    }

    function testOnlyOwnerCanManageRegistrars() public {
        vm.expectRevert(abi.encodeWithSelector(PreflightRegistry.UnauthorizedOwner.selector, OTHER));
        vm.prank(OTHER);
        registry.setRegistrar(OTHER, true);

        vm.prank(OWNER);
        registry.setRegistrar(REGISTRAR, false);
        assertFalse(registry.registrars(REGISTRAR));

        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.UnauthorizedRegistrar.selector, REGISTRAR)
        );
        _recordAs(REGISTRAR, _input());
    }

    function testZeroOwnerAndRegistrarReject() public {
        vm.expectRevert(PreflightRegistry.ZeroAddress.selector);
        new PreflightRegistry(address(0));

        vm.expectRevert(PreflightRegistry.ZeroAddress.selector);
        vm.prank(OWNER);
        registry.setRegistrar(address(0), true);
    }

    function testUnchangedRegistrarStatusRejects() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                PreflightRegistry.RegistrarStatusUnchanged.selector, REGISTRAR, true
            )
        );
        vm.prank(OWNER);
        registry.setRegistrar(REGISTRAR, true);
    }

    function testEveryZeroCriticalBindingRejects() public {
        for (uint256 field; field < 11; ++field) {
            PreflightRegistry.ClearanceInput memory candidate = _input();
            _zeroField(candidate, field);
            vm.expectPartialRevert(PreflightRegistry.ZeroBinding.selector);
            _recordAs(REGISTRAR, candidate);
        }
    }

    function testNonClearVerdictsReject() public {
        bytes32[3] memory verdicts = [bytes32("HOLD"), bytes32("REJECT"), bytes32("UNKNOWN")];
        for (uint256 index; index < verdicts.length; ++index) {
            PreflightRegistry.ClearanceInput memory candidate = _input();
            candidate.verdict = verdicts[index];
            vm.expectRevert(
                abi.encodeWithSelector(
                    PreflightRegistry.UnsupportedVerdict.selector, verdicts[index]
                )
            );
            _recordAs(REGISTRAR, candidate);
        }
    }

    function testMalformedTimesReject() public {
        PreflightRegistry.ClearanceInput memory candidate = _input();
        candidate.bindings.issuedAt = NOW + 1;
        vm.expectPartialRevert(PreflightRegistry.InvalidIssuedAt.selector);
        _recordAs(REGISTRAR, candidate);

        candidate = _input();
        candidate.bindings.expiresAt = candidate.bindings.issuedAt;
        vm.expectPartialRevert(PreflightRegistry.InvalidExpiry.selector);
        _recordAs(REGISTRAR, candidate);

        candidate = _input();
        candidate.bindings.issuedAt = NOW - 2;
        candidate.bindings.expiresAt = NOW;
        vm.expectPartialRevert(PreflightRegistry.InvalidExpiry.selector);
        _recordAs(REGISTRAR, candidate);
    }

    function testP1TimestampMaximumIsEnforced() public {
        uint64 maximum = registry.MAX_PROTOCOL_TIMESTAMP();
        vm.warp(uint256(maximum) - 1);
        PreflightRegistry.ClearanceInput memory candidate = _input();
        candidate.bindings.issuedAt = maximum - 1;
        candidate.bindings.expiresAt = maximum;
        _recordAs(REGISTRAR, candidate);
        assertTrue(registry.isClearanceValid(CLEARANCE_DIGEST));

        setUp();
        candidate = _input();
        candidate.bindings.expiresAt = maximum + 1;
        vm.expectPartialRevert(PreflightRegistry.TimestampOutOfRange.selector);
        _recordAs(REGISTRAR, candidate);
    }

    function testDuplicateDigestAndClearanceIdCannotOverwrite() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        PreflightRegistry.ClearanceInput memory sameDigest = _differentInput();
        sameDigest.clearanceDigest = input.clearanceDigest;
        vm.expectRevert(
            abi.encodeWithSelector(
                PreflightRegistry.ClearanceAlreadyExists.selector, input.clearanceDigest
            )
        );
        _recordAs(REGISTRAR, sameDigest);

        PreflightRegistry.ClearanceInput memory sameId = _differentInput();
        sameId.bindings.clearanceIdHash = input.bindings.clearanceIdHash;
        vm.expectPartialRevert(PreflightRegistry.ClearanceIdAlreadyUsed.selector);
        _recordAs(REGISTRAR, sameId);

        PreflightRegistry.Clearance memory stored = registry.getClearance(input.clearanceDigest);
        assertEq(stored.bindings.robotBuildDigest, input.bindings.robotBuildDigest);
        assertEq(stored.bindings.safetyEnvelopeCommitment, input.bindings.safetyEnvelopeCommitment);
    }

    function testEveryExactBindingMutationFails() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        for (uint256 field; field < 12; ++field) {
            PreflightRegistry.ClearanceBindings memory expected = input.bindings;
            _mutateBinding(expected, field, bytes32(uint256(1)));
            assertFalse(registry.isClearanceValidFor(input.clearanceDigest, expected));
        }

        assertFalse(registry.isClearanceValidFor(bytes32(uint256(1)), input.bindings));
    }

    function testTypeConfusedBindingsFailClosed() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        PreflightRegistry.ClearanceBindings memory expected = input.bindings;
        (expected.siteIdHash, expected.robotIdHash) = (expected.robotIdHash, expected.siteIdHash);
        assertFalse(registry.isClearanceValidFor(input.clearanceDigest, expected));

        expected = input.bindings;
        (expected.robotBuildDigest, expected.safetyEnvelopeCommitment) =
        (expected.safetyEnvelopeCommitment, expected.robotBuildDigest);
        assertFalse(registry.isClearanceValidFor(input.clearanceDigest, expected));
    }

    function testExpiryBoundaryBeforeAtAndAfter() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        vm.warp(uint256(input.bindings.expiresAt) - 1);
        assertTrue(registry.isClearanceValid(input.clearanceDigest));
        vm.warp(input.bindings.expiresAt);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));
        vm.warp(uint256(input.bindings.expiresAt) + 1);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));
    }

    function testIssuerRevocationIsImmediatePermanentAndEmits() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        vm.expectEmit(true, true, false, true);
        emit ClearanceRevoked(input.clearanceDigest, REGISTRAR, NOW);
        vm.prank(REGISTRAR);
        registry.revokeClearance(input.clearanceDigest);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));
        assertTrue(registry.getClearance(input.clearanceDigest).revoked);

        vm.expectRevert(
            abi.encodeWithSelector(
                PreflightRegistry.ClearanceAlreadyRevoked.selector, input.clearanceDigest
            )
        );
        vm.prank(REGISTRAR);
        registry.revokeClearance(input.clearanceDigest);

        vm.expectRevert(
            abi.encodeWithSelector(
                PreflightRegistry.ClearanceAlreadyExists.selector, input.clearanceDigest
            )
        );
        _recordAs(REGISTRAR, input);
    }

    function testOwnerMayRevokeAndUnrelatedPartyCannot() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);

        vm.expectRevert(
            abi.encodeWithSelector(
                PreflightRegistry.UnauthorizedRevocation.selector, OTHER, input.clearanceDigest
            )
        );
        vm.prank(OTHER);
        registry.revokeClearance(input.clearanceDigest);

        vm.prank(OWNER);
        registry.revokeClearance(input.clearanceDigest);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));
    }

    function testRemovedIssuerRetainsRevokeOnlyAuthority() public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);
        vm.prank(OWNER);
        registry.setRegistrar(REGISTRAR, false);

        vm.prank(REGISTRAR);
        registry.revokeClearance(input.clearanceDigest);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));

        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.UnauthorizedRegistrar.selector, REGISTRAR)
        );
        _recordAs(REGISTRAR, _differentInput());
    }

    function testUnknownClearanceReadsAndRevocationAreExplicit() public {
        assertFalse(registry.isClearanceValid(CLEARANCE_DIGEST));
        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.ClearanceNotFound.selector, CLEARANCE_DIGEST)
        );
        registry.getClearance(CLEARANCE_DIGEST);
        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.ClearanceNotFound.selector, CLEARANCE_DIGEST)
        );
        vm.prank(OWNER);
        registry.revokeClearance(CLEARANCE_DIGEST);
    }

    function testP1IdentifierTransportAndDigestGoldenVectors() public {
        assertEq(sha256(bytes("site:warehouse-a")), SITE_ID_HASH);
        assertEq(sha256(bytes("robot:picker-01")), ROBOT_ID_HASH);
        assertEq(sha256(bytes("robot-build:release-001")), ROBOT_BUILD_ID_HASH);
        assertEq(sha256(bytes("safety-envelope:warehouse-a-v1")), ENVELOPE_ID_HASH);
        assertEq(sha256(bytes("evaluator-version:deterministic-v1")), EVALUATOR_VERSION_HASH);
        assertEq(sha256(bytes("evaluation:eval-001")), EVALUATION_ID_HASH);
        assertEq(sha256(bytes("clearance:clear-001")), CLEARANCE_ID_HASH);

        _recordAs(REGISTRAR, _input());
        assertEq(registry.getClearance(CLEARANCE_DIGEST).clearanceDigest, CLEARANCE_DIGEST);
    }

    function testIntendedClearanceIdConstructionSeparatesIds() public pure {
        bytes32 first = sha256(bytes("clearance:clear-001"));
        bytes32 second = sha256(bytes("clearance:clear-002"));
        assertTrue(first != second);
    }

    function testFuzzMutatedBindingDoesNotValidate(uint8 field, bytes32 delta) public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);
        PreflightRegistry.ClearanceBindings memory expected = input.bindings;
        bytes32 nonZeroDelta = delta == bytes32(0) ? bytes32(uint256(1)) : delta;
        _mutateBinding(expected, uint256(field) % 12, nonZeroDelta);
        assertFalse(registry.isClearanceValidFor(input.clearanceDigest, expected));
    }

    function testFuzzUnauthorizedAddressCannotRecord(address caller) public {
        vm.assume(caller != OWNER && caller != REGISTRAR);
        vm.expectRevert(
            abi.encodeWithSelector(PreflightRegistry.UnauthorizedRegistrar.selector, caller)
        );
        _recordAs(caller, _input());
    }

    function testFuzzDuplicateIdCannotOverwrite(bytes32 otherDigest) public {
        PreflightRegistry.ClearanceInput memory input = _input();
        _recordAs(REGISTRAR, input);
        vm.assume(otherDigest != bytes32(0) && otherDigest != input.clearanceDigest);
        PreflightRegistry.ClearanceInput memory duplicateId = _differentInput();
        duplicateId.clearanceDigest = otherDigest;
        duplicateId.bindings.clearanceIdHash = input.bindings.clearanceIdHash;
        vm.expectPartialRevert(PreflightRegistry.ClearanceIdAlreadyUsed.selector);
        _recordAs(REGISTRAR, duplicateId);
        assertEq(
            registry.clearanceDigestByIdHash(input.bindings.clearanceIdHash), input.clearanceDigest
        );
    }

    function testFuzzExpiryBoundary(uint32 lifetimeSeed) public {
        uint64 lifetime = uint64(uint256(lifetimeSeed) % 1_000_000) + 1;
        PreflightRegistry.ClearanceInput memory input = _input();
        input.bindings.expiresAt = NOW + lifetime;
        _recordAs(REGISTRAR, input);
        vm.warp(uint256(input.bindings.expiresAt) - 1);
        assertTrue(registry.isClearanceValid(input.clearanceDigest));
        vm.warp(input.bindings.expiresAt);
        assertFalse(registry.isClearanceValid(input.clearanceDigest));
    }

    function _input() private pure returns (PreflightRegistry.ClearanceInput memory input) {
        input.clearanceDigest = CLEARANCE_DIGEST;
        input.bindings = PreflightRegistry.ClearanceBindings({
            clearanceIdHash: CLEARANCE_ID_HASH,
            evaluationIdHash: EVALUATION_ID_HASH,
            siteIdHash: SITE_ID_HASH,
            robotIdHash: ROBOT_ID_HASH,
            robotBuildIdHash: ROBOT_BUILD_ID_HASH,
            robotBuildDigest: ROBOT_BUILD_DIGEST,
            safetyEnvelopeIdHash: ENVELOPE_ID_HASH,
            safetyEnvelopeCommitment: ENVELOPE_COMMITMENT,
            evaluatorVersionHash: EVALUATOR_VERSION_HASH,
            evaluationInputsDigest: EVALUATION_INPUTS_DIGEST,
            issuedAt: NOW,
            expiresAt: 1_788_550_800
        });
        input.verdict = bytes32("CLEAR");
    }

    function _differentInput()
        private
        pure
        returns (PreflightRegistry.ClearanceInput memory input)
    {
        input = _input();
        input.clearanceDigest = bytes32(uint256(CLEARANCE_DIGEST) ^ 1);
        input.bindings.clearanceIdHash = bytes32(uint256(CLEARANCE_ID_HASH) ^ 1);
        input.bindings.robotBuildIdHash = bytes32(uint256(ROBOT_BUILD_ID_HASH) ^ 1);
        input.bindings.robotBuildDigest = bytes32(uint256(ROBOT_BUILD_DIGEST) ^ 1);
    }

    function _recordAs(address registrar, PreflightRegistry.ClearanceInput memory input) private {
        vm.prank(registrar);
        registry.recordClearance(input);
    }

    function _zeroField(PreflightRegistry.ClearanceInput memory input, uint256 field) private pure {
        if (field == 0) input.clearanceDigest = bytes32(0);
        else if (field == 1) input.bindings.clearanceIdHash = bytes32(0);
        else if (field == 2) input.bindings.evaluationIdHash = bytes32(0);
        else if (field == 3) input.bindings.siteIdHash = bytes32(0);
        else if (field == 4) input.bindings.robotIdHash = bytes32(0);
        else if (field == 5) input.bindings.robotBuildIdHash = bytes32(0);
        else if (field == 6) input.bindings.robotBuildDigest = bytes32(0);
        else if (field == 7) input.bindings.safetyEnvelopeIdHash = bytes32(0);
        else if (field == 8) input.bindings.safetyEnvelopeCommitment = bytes32(0);
        else if (field == 9) input.bindings.evaluatorVersionHash = bytes32(0);
        else input.bindings.evaluationInputsDigest = bytes32(0);
    }

    function _mutateBinding(
        PreflightRegistry.ClearanceBindings memory bindings,
        uint256 field,
        bytes32 delta
    ) private pure {
        if (field == 0) {
            bindings.clearanceIdHash ^= delta;
        } else if (field == 1) {
            bindings.evaluationIdHash ^= delta;
        } else if (field == 2) {
            bindings.siteIdHash ^= delta;
        } else if (field == 3) {
            bindings.robotIdHash ^= delta;
        } else if (field == 4) {
            bindings.robotBuildIdHash ^= delta;
        } else if (field == 5) {
            bindings.robotBuildDigest ^= delta;
        } else if (field == 6) {
            bindings.safetyEnvelopeIdHash ^= delta;
        } else if (field == 7) {
            bindings.safetyEnvelopeCommitment ^= delta;
        } else if (field == 8) {
            bindings.evaluatorVersionHash ^= delta;
        } else if (field == 9) {
            bindings.evaluationInputsDigest ^= delta;
        } else if (field == 10) {
            uint64 timestampDelta = uint64(uint256(delta));
            bindings.issuedAt ^= timestampDelta == 0 ? 1 : timestampDelta;
        } else {
            uint64 timestampDelta = uint64(uint256(delta));
            bindings.expiresAt ^= timestampDelta == 0 ? 1 : timestampDelta;
        }
    }
}
