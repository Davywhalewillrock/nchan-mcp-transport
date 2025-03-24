import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
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
      external: [],
      output: {
        // Provide global variables to use in the UMD build
        globals: {
        }
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
});
