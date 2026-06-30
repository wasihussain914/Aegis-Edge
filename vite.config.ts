import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// CSP-clean, fully static build — deployable to S3/CloudFront or served from the edge.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
    sourcemap: false,
  },
});
