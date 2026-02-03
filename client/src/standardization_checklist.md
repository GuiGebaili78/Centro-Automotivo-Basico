# Checklist de Padronização

Este checklist define os padrões visuais e funcionais para páginas de "Gestão de Entidades" (Cliente, Veículo, Fornecedor, Funcionário) para garantir consistência.

## 1. Layout da Página (Visão Principal)

- **Componente**: `PageLayout` deve ser o wrapper raiz.
- **Título**: Título claro no plural (ex: "Gestão de Clientes"). Suporta string ou ReactNode complexo (ex: Título + Badge).
- **Subtítulo**: Descrição opcional em texto abaixo do título.
- **Ações**: Botão primário "Novo" no canto superior direito (`<Button variant="primary" icon={Plus}>...`).
- **Busca**:
  - Posicionada **diretamente** na div de espaçamento do layout (NÃO dentro de um `<Card>`).
  - Usar componente `Input` com `icon={Search}`.
  - Largura total (`w-full`).
- **Card da Tabela**:
  - Envolvido em `<Card className="p-0 overflow-hidden">`.
  - Classe da tabela: `tabela-limpa w-full`.
  - Colunas `<thead>` devem ser claras.
  - Linhas `<tbody>`: `className="hover:bg-neutral-50 transition-colors group"`.
- **Ações da Linha**:
  - Posicionadas na última coluna (`text-center` ou `pr-6`).
  - Envolvidas em uma div com `opacity-0 group-hover:opacity-100 transition-opacity`.
  - Usar componente `ActionButton`.

- **Botões de Filtro (Tipo Radio)**:
  - Container: `flex bg-neutral-50 p-1 rounded-lg border border-neutral-100 gap-1`.
  - Item Base: `px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer`.
  - **Estado Ativo**: `bg-blue-100 text-blue-700 ring-1 ring-blue-200 shadow-sm`.
  - **Estado Inativo**: `text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100`.

## 2. Layout do Formulário (Visão "Editar/Criar")

- **Padrão de Troca de Visão**: Se não estiver usando uma rota separada (como `Fornecedor` e `Funcionario`), o componente deve retornar o componente de Formulário quando `view === 'form'`.
- **Estrutura do Componente de Formulário**:
  - **Container Raiz**: `<div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6 animate-in fade-in duration-500">`
  - **Cabeçalho**:
    - Container Flex com Botão Voltar (`variant="ghost" size="sm"`) e Título/Subtítulo.
    - Título: "Novo [Entidade]" ou "Editar [Entidade]".
  - **Tag Form**: `<form className="space-y-6 text-neutral-900">` (SEM `pb-24` ou padding fixo).
  - **Conteúdo do Formulário**:
    - Agrupar campos logicamente (ex: Identificação, Contato, Endereço).
    - Usar padrões do componente `Input`.
    - Usar layouts de grid (`grid-cols-1 md:grid-cols-2`, etc.).
  - **Ações de Rodapé**:
    - **NÃO FIXADO**.
    - Localizado ao final do fluxo do formulário.
    - Estilizado como:
      ```tsx
      <div className="flex flex-col-reverse md:flex-row justify-end gap-4 pt-6 border-t border-neutral-200">
        <Button variant="ghost" onClick={onCancel}>
          CANCELAR
        </Button>
        <Button type="submit" variant="primary" icon={Save / CheckCircle}>
          SALVAR
        </Button>
      </div>
      ```

## 3. Feedback & Interação

- **Notificações Toast**:
  - Usar `react-toastify`.
  - Mensagem de sucesso deve ser disparada **após** a chamada de API bem-sucedida, tipicamente no `handleSuccess` da Página pai ou potencialmente no Formulário se ele gerenciar seu próprio redirecionamento/troca de visão.
  - **Específico de Funcionário**: `FuncionarioPage` lida com o toast de sucesso em `handleFormSuccess`. Garanta que `FuncionarioForm` chame `onSuccess` _após_ a chamada da API.
- **Confirmação de Exclusão**:
  - Usar componente `ConfirmModal`.
  - Nunca usar `window.confirm`.
- **Confirmação Salvar/Cancelar**:
  - (Opcional mas recomendado para formulários complexos) Usar `ConfirmModal` se o formulário estiver "sujo" (alterado).

## 4. Específicos da Tarefa Atual (Funcionário)

- [x] Layout: `PageLayout`.
- [x] Busca: Input fora do Card.
- [x] Tabela: Tabela limpa, ações no hover.
- [ ] Rodapé do Formulário: **Correção necessária**. Mudar de posição fixa para layout estático.
- [ ] Toast: Garantir que o callback `onSuccess` no Formulário permita que a Página dispare o Toast ou o Formulário o dispare. (Código atual da Página: `handleFormSuccess` dispara toast. Código do Formulário: `onSuccess()` chamado após API. Este é o fluxo correto, apenas precisa verificar o feedback visual).

## 5. Visão de Detalhes / Dashboard (ex: Detalhes da OS)

- **Layout**: Usar `PageLayout`.
- **Cabeçalho**:
  - Pode incluir "Botão Voltar" e Badges de Status na área do Título.
  - Subtítulo deve descrever o contexto (ex: "Gerencie os detalhes...").
- **Seções**:
  - Usar `Card` (`<Card className="p-4 ...">`) para agrupar informações relacionadas.
  - Usar layouts Grid (`grid-cols-1 lg:grid-cols-2`) para visões divididas (ex: Diagnóstico vs Mão de Obra).
- **Feedback**:
  - Usar `react-toastify` para todo feedback de operação assíncrona (Sucesso/Erro).
  - Evitar `StatusBanner` inline a menos que persista um estado crítico (ex: sistema offline).
- **Modais**:
  - Usar componente `Modal` Compartilhado para edições/confirmações.

  teste vercel 2
