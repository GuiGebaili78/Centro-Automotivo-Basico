// server.ts

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000; // API rodará na porta 3000

// Middlewares
// 1. CORS: Permite que o frontend (Vite, rodando em outra porta/domínio) se comunique com esta API.
app.use(cors()); 

// 2. JSON: Garante que o Express consiga ler (parsear) JSON enviado no corpo das requisições (POST, PUT).
app.use(express.json());

// Rota de teste
app.get('/', (req, res) => {
    // Retorna um objeto JSON simples para confirmar que a API está funcionando
    return res.json({ message: 'API de Gestão Automotiva rodando com sucesso!' });
});

// A aplicação escuta as requisições na porta definida
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});