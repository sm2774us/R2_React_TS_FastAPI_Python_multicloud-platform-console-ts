import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:8000", ws: true } } },
  preview: { port: 4173, proxy: { "/api": { target: "http://localhost:8000", ws: true } } },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.tsx", "tests/integration/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/components/**", "src/pages/**", "src/hooks/**"],
      exclude: ["src/main.tsx"]
    }
  }
});
