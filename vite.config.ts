import fs from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

function copyStaticAssets() {
  return {
    name: "copy-static-assets",
    closeBundle() {
      const dirs = ["js", "assets"]
      for (const dir of dirs) {
        const src = path.resolve(__dirname, dir)
        const dest = path.resolve(__dirname, "dist", dir)
        if (!fs.existsSync(src)) continue
        fs.mkdirSync(dest, { recursive: true })
        for (const file of fs.readdirSync(src)) {
          fs.copyFileSync(path.join(src, file), path.join(dest, file))
        }
      }
    },
  }
}

// Multi-page config: ChatCat HTML files are served from project root.
// The React template (src/main.tsx) is kept for the design system but
// is NOT the default entry — index.html belongs to ChatCat.
export default defineConfig({
  plugins: [
    react({ include: ["src/**/*.tsx", "src/**/*.ts"] }),
    tailwindcss(),
    copyStaticAssets(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  appType: "mpa",
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        login: path.resolve(__dirname, "login.html"),
        register: path.resolve(__dirname, "register.html"),
        home: path.resolve(__dirname, "home.html"),
        chat: path.resolve(__dirname, "chat.html"),
        members: path.resolve(__dirname, "members.html"),
        friends: path.resolve(__dirname, "friends.html"),
        profile: path.resolve(__dirname, "profile.html"),
        admin: path.resolve(__dirname, "admin.html"),
      },
    },
  },
})
