import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base: "./"` makes every built asset path relative, so the app works
// whether it's served from https://<user>.github.io/ or
// https://<user>.github.io/<repo-name>/ — no repo-name hardcoding needed.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
  },
});
