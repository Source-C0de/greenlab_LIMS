import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 3000,
    watch: {
      ignored: ["**/.puku/**", "**/.puku"],
    },
    // Forward same-origin /api/* requests to the dev backend on localhost:8000.
    // Avoids CORS during development; in prod, the app talks to an absolute URL.
    //
    // If the backend is running inside Docker on a different host, override
    // the target via VITE_API_PROXY_TARGET=http://host.docker.internal:8000
    // in .env.local. (vite.config.ts itself can't read .env at config time,
    // so this stays as the default; users on Docker should run the backend
    // with --network host OR use port-forwarding that makes it visible at
    // http://localhost:8000 on the host.)
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
