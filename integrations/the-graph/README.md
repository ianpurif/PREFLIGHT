# Rovaulta The Graph integration

This integration indexes only the public Sepolia `RovaultaRegistry` clearance events. It never
indexes a private safety envelope, commitment blind, policy rule, or CRE secret.

The API queries the deployed subgraph through The Graph Gateway with `THE_GRAPH_API_KEY` kept
server-side. The deployment agent treats the result as public context: a missing, stale, revoked,
expired, or mismatched record blocks preparation. The direct P5 Sepolia registry read remains the
final authority.

## Build and publish

1. Create a Subgraph Studio subgraph and install the Graph CLI.
2. Run `graph codegen subgraph/subgraph.yaml` and `graph build subgraph/subgraph.yaml`.
3. Authenticate and deploy the generated manifest to Studio, then publish it for Sepolia.
4. Set `THE_GRAPH_API_KEY`, `THE_GRAPH_SUBGRAPH_ID`, and (if needed) `THE_GRAPH_API_URL` in the
   API environment. Never put the API key in the browser or committed files.

The repository contains the manifest, schema, mapping, and minimal ABI so the provider is
reproducible. A deployed subgraph and a live Gateway response are external evidence; local
fixtures or a mocked Graph response do not qualify as prize evidence.
