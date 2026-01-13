# Documentação Mestra do Projeto & Regras de Negócio (Guardrails)

> [!IMPORTANT]
> Este documento serve como **Fonte da Verdade** para o desenvolvimento do projeto. Qualquer alteração futura deve respeitar estritamente as regras de negócio, a arquitetura e as diretrizes de design definidas aqui para evitar quebras de funcionalidade ou regressões visuais.

---

## 1. Arquitetura e Tecnologias

O projeto utiliza uma arquitetura monolítica modular separada em `client` e `server` dentro do mesmo repositório, orquestrada via Docker.

- **Frontend**: React (Vite), TailwindCSS, Lucide Icons.
- **Backend**: Node.js (Express), Prisma ORM.
- **Banco de Dados**: PostgreSQL (Container `centroautomotivo_db`).
- **Infraestrutura**: Docker Compose (`api`, `client`, `db`).

### Convenções de Código
- **Backend**: Padrão **Repository Pattern**. A lógica de negócio pesada (ex: consolidação) DEVE residir nos repositórios (`src/repositories`), não nos controllers.
- **Frontend**: Componentização forte. Páginas em `src/pages`, componentes reutilizáveis em `src/components/ui`.

---

## 2. Regras de Negócio Críticas (NÃO QUEBRAR)

### 2.1. Módulo Financeiro & Consolidação de OS
Esta é a parte mais crítica e sensível do sistema.

#### Regra de Ouro da Consolidação (`consolidarOS`)
Ao finalizar uma OS financeiramente, o sistema processa os pagamentos de formas distintas dependendo do método:

1.  **PIX e DINHEIRO**:
    *   **Ação Imediata**: Deve atualizar o saldo da `ContaBancaria` selecionada (`saldo_atual + valor`).
    *   **Livro Caixa**: Deve criar um registro de `ENTRADA` no `LivroCaixa` vinculado à conta.
    *   **Extrato**: O valor deve aparecer imediatamente na tela de Extrato Bancário.
    *   **Regra de Validação**: É OBRIGATÓRIO informar uma conta bancária para estes métodos.

2.  **CARTÃO (Crédito/Débito)**:
    *   **NÃO Atualiza Saldo Imediatamente**: O saldo da conta bancária **NÃO** deve ser alterado na consolidação.
    *   **Criação de Recebíveis**: Deve gerar registros na tabela `RecebivelCartao` (parcelas calculadas conforme taxas da operadora).
    *   **Livro Caixa (Controle)**: Cria um registro no `LivroCaixa` com `id_conta_bancaria: null` apenas para registrar o faturamento bruto (não afeta extrato bancário).
    *   **Conciliação Manual**: O saldo bancário só é atualizado quando o usuário clica em "Confirmar/Dar Baixa" na aba de **Recebíveis**.

#### Regra do "Caixa Geral"
*   **Proibido**: Não existe uma conta "Caixa Geral" genérica. Todas as movimentações devem ser rastreáveis para contas reais (Nubank, Cofre Físico, etc.).

### 2.2. Ordens de Serviço (OS)
*   **Fluxo de Status**: `ABERTA` -> `PRONTO PARA FINANCEIRO` -> `FINALIZADA`.
*   **Edição**: Itens e Mão de Obra só podem ser editados enquanto a OS não estiver `FINALIZADA`.
*   **Pagamentos Mistos**: O sistema deve suportar múltiplos pagamentos (ex: parte em PIX, parte em Cartão) na mesma OS, aplicando as regras de consolidação acima para cada fração.

---

## 3. Diretrizes de Design (UI/UX)

O layout segue um estilo "Premium/Moderno". Regressões para estilos "padrão" ou "básicos" são inaceitáveis.

### 3.1. Paleta de Cores
*   **Ações Primárias**: Tons de **Azul** (`bg-blue-600`, `text-blue-600`).
*   **Sucesso/Dinheiro**: Tons de **Verde/Emerald** (`text-green-600`, `bg-green-50`).
*   **Alerta/Dívida**: Tons de **Vermelho** (`text-red-600`, `bg-red-50`).
*   **Neutros**: Evitar preto puro (`#000`). Usar `neutral-900` para textos escuros e `neutral-500` para secundários.
*   **Proibido**: Botões cinzas ou pretos para ações principais de "Salvar" ou "Confirmar". Usar sempre cores semânticas ou vibrantes.

### 3.2. Formas e Sombras
*   **Bordas**: Sempre arredondadas. Usar `rounded-xl` ou `rounded-2xl` para cards e containeres. `rounded-lg` para inputs e botões menores.
*   **Sombras**: Usar sombras suaves (`shadow-sm`, `shadow-md`) aliadas a bordas sutis (`border-neutral-100`) para criar profundidade.
*   **Superfícies**: Priorizar fundo branco (`bg-white`) sobre fundo cinza claro (`bg-neutral-50`) para destacar conteúdo.

### 3.3. Componentes Específicos
*   **Tabelas**: Cabeçalhos sempre em uppercase, fonte pequena e bold (`text-xs font-black uppercase text-neutral-400`). Linhas com hover suave.
*   **Modais**: Fundo com `backdrop-blur-sm`. Animações de entrada (`animate-in zoom-in-95`).
*   **Inputs**: Sem bordas padrão escuras. Usar `bg-neutral-50` com focus ring colorido.

---

## 4. Banco de Dados (Schema Notes)

*   **Tabelas Chave**:
    *   `livro_caixa`: Centraliza todas as movimentações. Campo `id_conta_bancaria` define se aparece no extrato.
    *   `recebivel_cartao`: Controla o fluxo futuro de entradas de cartão.
    *   `pagamento_cliente`: Registra a intenção de pagamento na OS. Deve ter vínculo (`id_livro_caixa`) após consolidação.

> [!WARNING]
> Nunca assuma que `id_conta_bancaria` em `pagamento_cliente` existe para cartões. Para cartões, o vínculo é via `id_operadora`.

---

## 5. Procedimentos de Deploy e Teste

1.  **Build**: Sempre validar se não há erros de tipagem (`tsc -b`) antes de subir, pois a Vercel/Build step irá falhar (como ocorreu com `implicit any`).
2.  **Docker**: Servidor roda em `npm run dev`. Não é necessário rebuildar containers para mudanças de código JS/TS, apenas para mudanças em `package.json` ou `Dockerfile`.
3.  **Testes Manuais Obrigatórios**:
    *   Criar OS -> Adicionar Peça e Mão de Obra -> Adicionar Pagamento Misto (PIX + Cartão) -> Finalizar.
    *   Verificar se o PIX caiu no Extrato.
    *   Verificar se o Cartão caiu em Recebíveis (e NÃO no Extrato).
