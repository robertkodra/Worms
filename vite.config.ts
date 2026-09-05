import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
const hostConfig = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
);

export default defineConfig({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    headers: Object.fromEntries(
      hostConfig.headers[0].headers.map((h: { key: string; value: string }) => [
        h.key,
        h.value,
      ]),
    ),
  },
  build: { sourcemap: false, target: "es2022" },
});
