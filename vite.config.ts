import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      // Block connections to Lovable's servers
      "Content-Security-Policy":
        "connect-src 'self' wss://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co https://cdn.gpteng.co; default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",
    },
  },
  plugins: [
    react(),
    // Strip any script tags injected by lovable-tagger's HTML transform
    {
      name: "remove-lovable-scripts",
      transformIndexHtml(html: string) {
        return html.replace(
          /<script[^>]*src=["'][^"']*lovableproject\.com[^"']*["'][^>]*><\/script>/gi,
          ""
        ).replace(
          /<script[^>]*src=["'][^"']*lovable[^"']*cdn[^"']*["'][^>]*><\/script>/gi,
          ""
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    root: path.resolve(__dirname),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  },
}));
