import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

/** `npm run dev:web` proxies to a node running on NODE_PORT (default 4001). */
const node = `http://localhost:${process.env.NODE_PORT ?? 4001}`;

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: {
    outDir: resolve(import.meta.dirname, "../dist/web"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: { "/api": node, "/sheet": node, "/menu": node },
  },
});
