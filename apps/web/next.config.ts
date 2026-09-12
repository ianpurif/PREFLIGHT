import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@rovaulta/ledger-gate",
    "@rovaulta/chain-client",
    "@rovaulta/domain",
    "@rovaulta/simulation-core",
  ],
};

export default nextConfig;
