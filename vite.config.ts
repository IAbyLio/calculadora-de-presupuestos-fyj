import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
//
// Build mode:
//   - dev: Vite dev server con HMR.
//   - production: bundle estandar con assets separados (JS + CSS).
//     Razon: el bundle es ~1.5MB, demasiado para inline en Custom Code element
//     de GHL. Estrategia: subir los assets a GHL Media Library y referenciar
//     con URL absoluta desde el Custom Code element.
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Forzar UN solo bundle JS — sin chunks dinamicos. GHL Media Library asigna
    // URL con hash propio a cada archivo, por lo que imports relativos entre
    // chunks (./calc-chunk-x.js) no resolverian. Con inlineDynamicImports todo
    // queda en calc-app.js, y solo subimos 2 archivos (JS + CSS) a GHL.
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "calc-app.js",
        assetFileNames: (assetInfo) => {
          const names = assetInfo.names ?? [];
          if (names.some((n) => n.endsWith(".css"))) {
            return "calc-app.css";
          }
          return "calc-asset-[name].[ext]";
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
}));
