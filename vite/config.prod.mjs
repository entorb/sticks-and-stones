import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "/sticks-and-stones/",
  logLevel: "warning",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) return "phaser"
        },
      },
    },
    minify: "terser",
    terserOptions: {
      compress: { passes: 2 },
      mangle: true,
      format: { comments: false },
    },
  },
  preview: {
    port: 4173,
  },
  plugins: [
    VitePWA({
      // new versions take over on the next load; the village is autosaved, nothing to lose
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Sticks & Stones: Defend the Village",
        short_name: "Sticks & Stones",
        description: "Build a medieval village and defend it, wave by wave.",
        display: "standalone",
        orientation: "any",
        background_color: "#2b3a1f",
        theme_color: "#2b3a1f",
        categories: ["games"],
        id: "/sticks-and-stones/",
        icons: [
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // 512 px icons are only fetched on install; keep them out of the precache.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ogg,json,webmanifest}"],
        globIgnores: ["icons/*512x512.png"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
