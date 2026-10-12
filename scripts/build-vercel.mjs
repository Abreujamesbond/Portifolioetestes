import { spawnSync } from "node:child_process";
const preview = !process.env.DATABASE_URL;
const checked = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-b"],
  { stdio: "inherit" },
);
if (checked.status !== 0) process.exit(checked.status ?? 1);
if (!preview && !process.env.SETUP_TOKEN) {
  console.error(
    "Configure SETUP_TOKEN na Vercel para proteger a criação do proprietário. Sem DATABASE_URL, a publicação abre somente a prévia interativa.",
  );
  process.exit(1);
}
console.log(
  preview
    ? "Conecta: construindo prévia interativa, sem banco e sem dados reais."
    : "Conecta: construindo aplicativo com banco Neon e acesso protegido.",
);
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, VITE_PREVIEW_MODE: String(preview) },
  },
);
process.exit(result.status ?? 1);
