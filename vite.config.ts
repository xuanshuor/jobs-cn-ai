/// <reference types="vite/client" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * GitHub Pages：
 * - 项目站：https://<用户>.github.io/<仓库名>/  → base 为 /<仓库名>/
 * - 用户站：仓库名为 <用户>.github.io 时站点在根路径 → base 为 /
 * 可用环境变量 VITE_BASE_PATH 强制覆盖（末尾建议带 /）
 */
function githubPagesBase(): string {
  if (process.env.VITE_BASE_PATH) {
    const b = process.env.VITE_BASE_PATH;
    return b.endsWith("/") ? b : `${b}/`;
  }
  const full = process.env.GITHUB_REPOSITORY;
  if (!full) return "/";
  const [owner, repo] = full.split("/");
  if (!owner || !repo) return "/";
  if (repo === `${owner}.github.io`) return "/";
  return `/${repo}/`;
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
