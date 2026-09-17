import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { nitro } from 'nitro/vite'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => ({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    command === 'build' && tanstackRouter({
      routeToken: "layout",
      autoCodeSplitting: false,
    }),
    tanstackStart(),
    nitro(),
    viteReact(),
  ].filter(Boolean),
}));