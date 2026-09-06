// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title PreflightRegistry
/// @notice Records scoped clearance evidence for an exact evaluated robot build.
/// @dev The registry trusts authorized registrars to map validated P1 objects into the
/// fixed-size transport fields below. It does not parse canonical JSON, attest CRE execution,
/// authorize deployment, or claim that a robot is universally or physically safe.
contract PreflightRegistry {
    bytes32 public constant VERDICT_CLEAR = bytes32("CLEAR");
    uint64 public constant MAX_PROTOCOL_TIMESTAMP = 253_402_300_799;

    bytes32 private constant FIELD_CLEARANCE_DIGEST = bytes32("clearanceDigest");
    bytes32 private constant FIELD_CLEARANCE_ID = bytes32("clearanceIdHash");
    bytes32 private constant FIELD_EVALUATION_ID = bytes32("evaluationIdHash");
    bytes32 private constant FIELD_SITE_ID = bytes32("siteIdHash");
    bytes32 private constant FIELD_ROBOT_ID = bytes32("robotIdHash");
    bytes32 private constant FIELD_ROBOT_BUILD_ID = bytes32("robotBuildIdHash");
    bytes32 private constant FIELD_ROBOT_BUILD_DIGEST = bytes32("robotBuildDigest");
    bytes32 private constant FIELD_ENVELOPE_ID = bytes32("safetyEnvelopeIdHash");
    bytes32 private constant FIELD_ENVELOPE_COMMITMENT = bytes32("envelopeCommitment");
    bytes32 private constant FIELD_EVALUATOR_VERSION = bytes32("evaluatorVersionHash");
    bytes32 private constant FIELD_EVALUATION_INPUTS = bytes32("evaluationInputsDigest");

    struct ClearanceBindings {
        bytes32 clearanceIdHash;
        bytes32 evaluationIdHash;
        bytes32 siteIdHash;
        bytes32 robotIdHash;
        bytes32 robotBuildIdHash;
        bytes32 robotBuildDigest;
        bytes32 safetyEnvelopeIdHash;
        bytes32 safetyEnvelopeCommitment;
        bytes32 evaluatorVersionHash;
        bytes32 evaluationInputsDigest;
        uint64 issuedAt;
        uint64 expiresAt;
    }

    struct ClearanceInput {
        bytes32 clearanceDigest;
        ClearanceBindings bindings;
        bytes32 verdict;
    }

    struct Clearance {
        bytes32 clearanceDigest;
        ClearanceBindings bindings;
        bytes32 verdict;
        address issuer;
        bool revoked;
        bool exists;
    }

    error UnauthorizedOwner(address caller);
    error UnauthorizedRegistrar(address caller);
    error UnauthorizedRevocation(address caller, bytes32 clearanceDigest);
    error ZeroAddress();
    error ZeroBinding(bytes32 field);
    error RegistrarStatusUnchanged(address registrar, bool authorized);
    error UnsupportedVerdict(bytes32 verdict);
    error InvalidIssuedAt(uint64 issuedAt, uint256 currentTime);
    error InvalidExpiry(uint64 issuedAt, uint64 expiresAt, uint256 currentTime);
    error TimestampOutOfRange(uint64 timestamp);
    error ClearanceAlreadyExists(bytes32 clearanceDigest);
    error ClearanceIdAlreadyUsed(bytes32 clearanceIdHash, bytes32 clearanceDigest);
    error ClearanceNotFound(bytes32 clearanceDigest);
    error ClearanceAlreadyRevoked(bytes32 clearanceDigest);

    event RegistrarAuthorizationUpdated(address indexed registrar, bool authorized);
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

    address public immutable owner;
    mapping(address registrar => bool authorized) public registrars;
    mapping(bytes32 clearanceDigest => Clearance clearance) private clearances;
    mapping(bytes32 clearanceIdHash => bytes32 clearanceDigest) public clearanceDigestByIdHash;

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedOwner(msg.sender);
        _;
    }

    modifier onlyRegistrar() {
        if (!registrars[msg.sender]) revert UnauthorizedRegistrar(msg.sender);
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        registrars[initialOwner] = true;
        emit RegistrarAuthorizationUpdated(initialOwner, true);
    }

    /// @notice Adds or removes an address that may attest validated P1 clearances.
    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        if (registrar == address(0)) revert ZeroAddress();
        if (registrars[registrar] == authorized) {
            revert RegistrarStatusUnchanged(registrar, authorized);
        }
        registrars[registrar] = authorized;
        emit RegistrarAuthorizationUpdated(registrar, authorized);
    }

    /// @notice Records one immutable, currently live P1-compatible CLEAR clearance.
    /// @dev `issuer` is always msg.sender; it cannot be supplied by an untrusted caller.
    function recordClearance(ClearanceInput calldata input) external onlyRegistrar {
        _validateInput(input);

        if (clearances[input.clearanceDigest].exists) {
            revert ClearanceAlreadyExists(input.clearanceDigest);
        }

        bytes32 existingDigest = clearanceDigestByIdHash[input.bindings.clearanceIdHash];
        if (existingDigest != bytes32(0)) {
            revert ClearanceIdAlreadyUsed(input.bindings.clearanceIdHash, existingDigest);
        }

        Clearance storage clearance = clearances[input.clearanceDigest];
        clearance.clearanceDigest = input.clearanceDigest;
        clearance.bindings = input.bindings;
        clearance.verdict = input.verdict;
        clearance.issuer = msg.sender;
        clearance.exists = true;
        clearanceDigestByIdHash[input.bindings.clearanceIdHash] = input.clearanceDigest;

        emit ClearanceRecorded(
            input.clearanceDigest,
            input.bindings.clearanceIdHash,
            input.bindings.robotBuildDigest,
            input.verdict,
            msg.sender,
            input.bindings.issuedAt,
            input.bindings.expiresAt
        );
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
    }

    /// @notice Permanently revokes a clearance. The owner or original issuer may revoke it.
    /// @dev Removing an issuer from the registrar set stops new records but intentionally
    /// preserves its ability to revoke records it originally issued.
    function revokeClearance(bytes32 clearanceDigest) external {
        Clearance storage clearance = clearances[clearanceDigest];
        if (!clearance.exists) revert ClearanceNotFound(clearanceDigest);
        if (msg.sender != owner && msg.sender != clearance.issuer) {
            revert UnauthorizedRevocation(msg.sender, clearanceDigest);
        }
        if (clearance.revoked) revert ClearanceAlreadyRevoked(clearanceDigest);

        clearance.revoked = true;
        emit ClearanceRevoked(clearanceDigest, msg.sender, block.timestamp);
    }

    function getClearance(bytes32 clearanceDigest) external view returns (Clearance memory) {
        Clearance memory clearance = clearances[clearanceDigest];
        if (!clearance.exists) revert ClearanceNotFound(clearanceDigest);
        return clearance;
    }

    function isClearanceValid(bytes32 clearanceDigest) public view returns (bool) {
        return _isValid(clearances[clearanceDigest]);
    }

    /// @notice Returns true only when every supplied P1 binding equals the stored clearance.
    function isClearanceValidFor(bytes32 clearanceDigest, ClearanceBindings calldata expected)
        external
        view
        returns (bool)
    {
        Clearance storage clearance = clearances[clearanceDigest];
        return _isValid(clearance) && _bindingsEqual(clearance.bindings, expected);
    }

    function _validateInput(ClearanceInput calldata input) private view {
        _requireNonZero(input.clearanceDigest, FIELD_CLEARANCE_DIGEST);
        _requireNonZero(input.bindings.clearanceIdHash, FIELD_CLEARANCE_ID);
        _requireNonZero(input.bindings.evaluationIdHash, FIELD_EVALUATION_ID);
        _requireNonZero(input.bindings.siteIdHash, FIELD_SITE_ID);
        _requireNonZero(input.bindings.robotIdHash, FIELD_ROBOT_ID);
        _requireNonZero(input.bindings.robotBuildIdHash, FIELD_ROBOT_BUILD_ID);
        _requireNonZero(input.bindings.robotBuildDigest, FIELD_ROBOT_BUILD_DIGEST);
        _requireNonZero(input.bindings.safetyEnvelopeIdHash, FIELD_ENVELOPE_ID);
        _requireNonZero(input.bindings.safetyEnvelopeCommitment, FIELD_ENVELOPE_COMMITMENT);
        _requireNonZero(input.bindings.evaluatorVersionHash, FIELD_EVALUATOR_VERSION);
        _requireNonZero(input.bindings.evaluationInputsDigest, FIELD_EVALUATION_INPUTS);

        if (input.verdict != VERDICT_CLEAR) revert UnsupportedVerdict(input.verdict);
        if (input.bindings.issuedAt > MAX_PROTOCOL_TIMESTAMP) {
            revert TimestampOutOfRange(input.bindings.issuedAt);
        }
        if (input.bindings.expiresAt > MAX_PROTOCOL_TIMESTAMP) {
            revert TimestampOutOfRange(input.bindings.expiresAt);
        }
        if (input.bindings.issuedAt > block.timestamp) {
            revert InvalidIssuedAt(input.bindings.issuedAt, block.timestamp);
        }
        if (
            input.bindings.expiresAt <= input.bindings.issuedAt
                || input.bindings.expiresAt <= block.timestamp
        ) {
            revert InvalidExpiry(input.bindings.issuedAt, input.bindings.expiresAt, block.timestamp);
        }
    }

    function _isValid(Clearance storage clearance) private view returns (bool) {
        return clearance.exists && !clearance.revoked && clearance.verdict == VERDICT_CLEAR
            && block.timestamp < clearance.bindings.expiresAt;
    }

    function _bindingsEqual(ClearanceBindings storage stored, ClearanceBindings calldata expected)
        private
        view
        returns (bool)
    {
        return stored.clearanceIdHash == expected.clearanceIdHash
            && stored.evaluationIdHash == expected.evaluationIdHash
            && stored.siteIdHash == expected.siteIdHash
            && stored.robotIdHash == expected.robotIdHash
            && stored.robotBuildIdHash == expected.robotBuildIdHash
            && stored.robotBuildDigest == expected.robotBuildDigest
            && stored.safetyEnvelopeIdHash == expected.safetyEnvelopeIdHash
            && stored.safetyEnvelopeCommitment == expected.safetyEnvelopeCommitment
            && stored.evaluatorVersionHash == expected.evaluatorVersionHash
            && stored.evaluationInputsDigest == expected.evaluationInputsDigest
            && stored.issuedAt == expected.issuedAt && stored.expiresAt == expected.expiresAt;
    }

    function _requireNonZero(bytes32 value, bytes32 field) private pure {
        if (value == bytes32(0)) revert ZeroBinding(field);
    }
}
