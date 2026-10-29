import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "node",
    include: [
      "src/lib/relish/__tests__/*.test.ts",
      "src/app/api/relish/assist/__tests__/*.test.ts",
      "src/components/relish/__tests__/*.test.ts",
    ],
    testTimeout: 10000,
  },
});
