import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
const root = path.resolve(__dirname, "../../..");
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  css: { postcss: path.join(root, "postcss.config.js") },
  resolve: {
    alias: [
      { find: /^@\/lib\/serverApi$/, replacement: path.join(__dirname, "serverApi.mock.js") },
      { find: /^@\/lib\/progress\/progressClient$/, replacement: path.join(__dirname, "progressClient.mock.js") },
      { find: /^@\/api\/base44Client$/, replacement: path.join(__dirname, "base44Client.mock.js") },
      { find: /^@\/lib\/AuthContext$/, replacement: path.join(__dirname, "AuthContext.mock.jsx") },
      { find: "@", replacement: path.join(root, "src") },
    ],
  },
  server: { port: 5199, strictPort: true, fs: { allow: [root] } },
});
