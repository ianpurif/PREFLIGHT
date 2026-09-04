import { spawnSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import process from "node:process";

function git(args) {
  const result = spawnSync("git", args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const [action, rawSlug] = process.argv.slice(2);
if (!action || !["create", "list", "remove"].includes(action)) {
  console.error("Usage: node scripts/worktree.mjs <create|list|remove> [slug]");
  process.exit(2);
}

if (action === "list") {
  git(["worktree", "list"]);
  process.exit(0);
}

if (!rawSlug || !/^[A-Za-z0-9._-]+$/.test(rawSlug)) {
  console.error("Provide a safe slug, e.g. P3-cre");
  process.exit(2);
}

const repo = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
if (repo.status !== 0) {
  console.error("Run this inside an initialized Git repository.");
  process.exit(1);
}
const root = repo.stdout.trim();
const parent = dirname(root);
const path = resolve(parent, `${basename(root)}-${rawSlug}`);
const branch = `codex/${rawSlug}`;

if (action === "create") git(["worktree", "add", "-b", branch, path, "HEAD"]);
if (action === "remove") git(["worktree", "remove", path]);
