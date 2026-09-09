import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const source = resolve(import.meta.dir, "../p13-setup.example.json");
const target = resolve(process.cwd(), ".data/p13-setup.json");

if (existsSync(target)) {
  throw new Error(
    "P13 setup file already exists at .data/p13-setup.json; edit it or remove it before regenerating",
  );
}

mkdirSync(dirname(target), { recursive: true });
chmodSync(dirname(target), 0o700);
copyFileSync(source, target);
chmodSync(target, 0o600);

console.log(
  JSON.stringify(
    {
      status: "READY",
      setupPath: relative(process.cwd(), target).replaceAll("\\", "/"),
      source: "safe template; replace the site policy and artifact digest before setup",
    },
    null,
    2,
  ),
);
