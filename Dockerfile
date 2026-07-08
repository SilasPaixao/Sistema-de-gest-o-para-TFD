# ==========================================================
# Etapa 1: Build (builder)
# Compila o frontend React (Vite) e o backend (esbuild)
# ==========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copia arquivos de definição de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies necessárias para o build)
RUN npm ci

# Copia todo o restante do código fonte
COPY . .

# Executa o build (compila o React para HTML/JS/CSS estáticos e o Node com esbuild para dist/server.cjs)
RUN npm run build

# ==========================================================
# Etapa 2: Produção (runner)
# Cria uma imagem leve, contendo apenas o necessário para rodar
# ==========================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Define o ambiente como produção
ENV NODE_ENV=production

# Copia arquivos de dependências
COPY package*.json ./

# Instala apenas as dependências de produção (reduz tamanho e melhora segurança)
RUN npm ci --omit=dev

# Copia apenas os artefatos de build gerados na etapa anterior
COPY --from=builder /app/dist ./dist

# Cria o diretório para armazenamento do banco de dados local fallback (db.json)
# Garante que o usuário não-root 'node' possua permissões de escrita nele
RUN mkdir -p /app/data && chown -R node:node /app

# Altera para o usuário de sistema seguro e não-root da imagem oficial
USER node

# Expõe a porta padrão 3000 que a aplicação utiliza
EXPOSE 3000

# Executa a aplicação diretamente utilizando o node para máxima eficiência
CMD ["node", "dist/server.cjs"]
