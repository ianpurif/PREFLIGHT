import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@rovaulta/ledger-gate",
    "@rovaulta/chain-client",
    "@rovaulta/domain",
    "@rovaulta/simulation-core",
  ],
};

export default nextConfig;
