import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "preview" ? [viteSingleFile()] : [])],
  base: mode === "preview" ? "./" : "/",
  define:
    mode === "preview"
      ? { "import.meta.env.VITE_PREVIEW_MODE": JSON.stringify("true") }
      : {},
  build: mode === "preview" ? { outDir: "preview", emptyOutDir: true } : {},
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: false },
    },
  },
}));
