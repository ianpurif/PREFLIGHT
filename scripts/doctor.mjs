import { spawnSync } from "node:child_process";

const checks = [
  ["git", ["--version"], true],
  ["bun", ["--version"], true],
  ["forge", ["--version"], false],
];

let hardFailure = false;
for (const [command, args, required] of checks) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  const ok = result.status === 0;
  console.log(
    `${ok ? "✓" : required ? "✗" : "!"} ${command}: ${ok ? result.stdout.trim().split("\\n")[0] : "not found"}`,
  );
  if (!ok && required) hardFailure = true;
}

if (hardFailure) {
  console.error("Install required tooling before dependency-backed verification.");
  process.exit(1);
}
