# Usa uma imagem leve do Node
FROM node:20-alpine

# Define o diretório de trabalho
WORKDIR /app/client

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta padrão do Vite
EXPOSE 5173

# Inicia o servidor de desenvolvimento com host 0.0.0.0 para acesso externo
CMD ["npm", "run", "dev", "--", "--host"]
