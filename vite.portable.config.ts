import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import { releaseManifestPlugin } from "./src/build/release-manifest-plugin.js";

const publicApi = fileURLToPath(new URL("./src/public-api.ts", import.meta.url));

export default defineConfig({
  plugins: [releaseManifestPlugin("portable-offline")],
  base: "./",
  build: {
    target: ["chrome120", "edge120"],
    outDir: "dist/portable-offline",
    emptyOutDir: true,
    sourcemap: false,
    minify: "oxc",
    cssCodeSplit: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    lib: {
      entry: publicApi,
      name: "IHEngineeringCalculatorCore",
      formats: ["iife"],
      fileName: () => "ih-ec-core.js",
    },
  },
});
