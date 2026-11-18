import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Nome do repositório no GitHub. No GitHub Pages o site fica em
// https://SEU-USUARIO.github.io/controle-financeiro/, por isso a versão
// final (build) precisa desse prefixo. Se o repositório tiver outro nome, troque aqui.
const REPO_NAME = 'controle-financeiro'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // No servidor de teste (npm run dev) continua em http://localhost:5173/
  base: command === 'build' ? `/${REPO_NAME}/` : '/',
  plugins: [react(), tailwindcss()],
}))
