import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@preflight/ledger-gate", "@preflight/chain-client", "@preflight/domain"],
};

export default nextConfig;
