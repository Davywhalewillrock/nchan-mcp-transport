import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts({
    exclude: ["__tests__/*"],
  })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'httmcp',
      fileName: (format) => `index.${format}.js`,
    },
    outDir: 'dist',
    rollupOptions: {
      // Make sure to externalize dependencies that shouldn't be bundled
      // into your library
      external: [
        "express",
        "node:crypto",
        "@modelcontextprotocol/sdk/server/mcp.js",
        "@modelcontextprotocol/sdk/types.js",
      ],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
          express: "express",
          "node:crypto": "crypto",
          "@modelcontextprotocol/sdk/server/mcp.js": "McpServer",
          "@modelcontextprotocol/sdk/types.js": "ErrorCode",
        }
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
});
