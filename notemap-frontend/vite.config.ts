import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Excalidraw references `process.env` at module scope. Vite does not provide
  // a Node-style process object in the browser, so define it explicitly.
  define: {
    "process.env": {},
  },
  server: {
    port: 5173,
  },
  build: {
    // Excalidraw is intentionally loaded as a large, lazily-fetched workspace
    // chunk. Keep the build output clean without hiding real errors.
    chunkSizeWarningLimit: 4000,
  },
});
