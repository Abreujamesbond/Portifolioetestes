import { spawnSync } from "node:child_process";
import { copyFileSync } from "node:fs";
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--mode", "preview"],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
copyFileSync("preview/index.html", "preview/Conecta-previa.html");
console.log("Prévia pronta: preview/Conecta-previa.html");
