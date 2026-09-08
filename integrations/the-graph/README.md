# Rovaulta The Graph integration

This integration indexes only the public Sepolia `RovaultaRegistry` clearance events. It never
indexes a private safety envelope, commitment blind, policy rule, behavior trace, credential, or
CRE secret. The checked-in manifest starts at the registry deployment block and handles the
record, exact-binding, and revocation events.

The API queries the deployed subgraph through The Graph Gateway with `THE_GRAPH_API_KEY` kept
server-side. The deployment agent treats the result as public context: a missing, stale, revoked,
expired, or mismatched record blocks preparation. The direct P5 Sepolia registry read remains the
final authority.

## Build locally

The package pins the Graph CLI and AssemblyScript runtime so the manifest can be reproduced without
global tooling:

```bash
bun install
bun run --cwd integrations/the-graph build
```

This runs codegen into the ignored `subgraph/generated` directory and compiles the WASM mapping.
The build is part of the repository verification path; it does not contact a provider or claim
that a hosted deployment exists.

## Deploy to Subgraph Studio

1. Create a Sepolia Subgraph Studio subgraph and copy its slug and deploy key.
2. Run the operator-only command below. It authenticates without echoing the deploy key:

   ```bash
   GRAPH_SUBGRAPH_SLUG='account/rovaulta-registry' \
   GRAPH_DEPLOY_KEY='do-not-log' \
   GRAPH_VERSION_LABEL='0.1.0' \
   bun run --cwd integrations/the-graph deploy
   ```

3. Wait for the deployment to index the Sepolia registry, then record the hosted subgraph ID and
   a redacted query response. Publishing to the decentralized network is not required for the
   provider-backed qualification proof; do not label a Studio deployment as a live DON.
4. Set `THE_GRAPH_API_KEY`, `THE_GRAPH_SUBGRAPH_ID`, and (if needed) `THE_GRAPH_API_URL` in the
   server environment. Never put the API key in the browser or committed files.

The provider endpoint is `https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>`.
The API sends a single GraphQL query by exact `clearance(id: $digest)` and validates every returned
public binding before the agent can proceed.

## Live account-agent evidence

After a real account-created `CLEAR` evaluation and a public Sepolia clearance exist, run:

```bash
ROVAULTA_P11_ACCOUNT_ID='account:<32 hex chars>' \
ROVAULTA_P11_CLEARANCE_PATH='./public-clearance.json' \
ROVAULTA_P11_SIGNER_ADDRESS='0x<public address>' \
bun run --cwd apps/api evidence:p11-graph
```

The command uses the actual configured provider and AI deployment-agent path. Its output is a
public audit projection only: target, Graph status/block identity, P5 policy result, and the
Ledger-required boundary. It never prints the Graph key, private policy, CRE payload, signatures,
or private model data. Use `bun run --cwd integrations/the-graph evidence:live` for a query-only
check of a public digest. Both commands fail closed when live configuration is absent.

The repository contains the manifest, schema, mapping, and minimal ABI so the provider is
reproducible. A deployed subgraph and a live Gateway response are external evidence; local
fixtures or a mocked Graph response do not qualify as prize evidence.
