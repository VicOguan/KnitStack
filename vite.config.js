import { defineConfig } from "vite";

// Java and Go need SharedArrayBuffer, which browsers only allow on cross-origin isolated pages.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp"
};

export default defineConfig({
  server: { headers: isolation },
  preview: { headers: isolation },
  build: { target: "es2022", chunkSizeWarningLimit: 900 }
});
