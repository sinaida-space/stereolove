import { defineConfig } from "vite";

export default defineConfig({
  base: "/stereolove/",
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
  },
});
