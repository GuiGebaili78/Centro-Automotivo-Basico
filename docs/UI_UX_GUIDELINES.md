# Diretrizes de UI/UX — Centro Automotivo App

> [!CAUTION]
> Este arquivo é de leitura **OBRIGATÓRIA** antes de qualquer alteração no frontend.
> Regressões visuais para estilos "padrão", "básicos" ou "genéricos" são **inaceitáveis**.

---

## 1. Stack de Estilização

### 1.1. Framework CSS
- **TailwindCSS v3** — Todas as classes utilitárias devem vir do Tailwind.
- A paleta de cores é **centralizada** em `client/tailwind.config.js`. Novas cores devem ser adicionadas lá, **nunca** como classes arbitrárias inline (ex: `bg-[#FF5733]` é **PROIBIDO**).

### 1.2. Bibliotecas de Componentes (Aprovadas)
| Biblioteca | Uso |
|---|---|
| **Tremor** (`@tremor/react`) | Gráficos, KPIs, Cards analíticos, métricas financeiras |
| **Radix UI / Headless UI** (`@headlessui/react`) | Primitivos acessíveis (Dialog, Popover, Select, Tabs) |
| **Lucide Icons** | Ícones em todo o projeto |

### 1.3. Bibliotecas Proibidas
- **NÃO** instalar Material UI, Ant Design, Chakra UI ou Bootstrap.
- **NÃO** usar CSS Modules ou Styled Components — TailwindCSS é o padrão.

---

## 2. Paleta de Cores

A paleta completa está definida em [`tailwind.config.js`](file:///c:/workspace/Meus%20Projetos/Centro%20Automotivo%20APP/App%20Centro%20Automotivo/client/tailwind.config.js). Abaixo o resumo semântico:

### 2.1. Cores Semânticas

| Token | Hex | Uso |
|---|---|---|
| `primary-600` | `#0E2773` | Azul principal — Sidebar, headers, ações primárias |
| `primary-800` | `#1e40af` | Azul escuro — Sidebar background, hover states |
| `primary-500` | `#3b82f6` | Azul médio — Links, destaques suaves |
| `secondary-500` | `#f97316` | Laranja — Ações secundárias, CTAs alternativos |
| `success-500` | `#22c55e` | Verde — Lucros, status positivo, confirmações |
| `error-500` | `#ef4444` | Vermelho — Erros, dívidas, alertas críticos |
| `highlight-500` | `#a855f7` | Roxo — Destaques especiais, ações diferenciadas |

### 2.2. Neutros

| Token | Hex | Uso |
|---|---|---|
| `neutral-25` | `#FCFCFD` | Background mais claro |
| `neutral-50` | `#F9FAFB` | Background de inputs, áreas secundárias |
| `neutral-100` | `#F3F4F6` | Bordas sutis, dividers |
| `neutral-400` | `#9CA3AF` | Texto placeholder, labels de tabela |
| `neutral-500` | `#6B7280` | Texto secundário |
| `neutral-700` | `#374151` | Texto body |
| `neutral-900` | `#111827` | Texto principal (headings) |

### 2.3. Regras de Cor

> [!WARNING]
> **PROIBIDO**: Usar `bg-black`, `bg-gray-800`, `bg-gray-700` ou qualquer tom escuro genérico para botões de ação primária ("Salvar", "Confirmar", "Enviar").

- ✅ Botão primário: `bg-primary-600 hover:bg-primary-700 text-white`
- ✅ Botão de sucesso: `bg-success-500 hover:bg-success-600 text-white`
- ✅ Botão de perigo: `bg-error-500 hover:bg-error-600 text-white`
- ❌ Botão preto: `bg-black text-white`
- ❌ Botão cinza: `bg-gray-500 text-white`

> [!IMPORTANT]
> Preto puro (`#000000` / `bg-black`) é **proibido** em textos. Usar `text-neutral-900` para o texto mais escuro permitido.

---

## 3. Tipografia

### 3.1. Fonte Padrão
- **Roboto** (`font-sans`) — Definida globalmente via `tailwind.config.js`.
- Não sobrescrever com `font-family` inline.

### 3.2. Escala Tipográfica

| Elemento | Classes |
|---|---|
| Page Title (H1) | `text-2xl font-bold text-neutral-900` |
| Section Title (H2) | `text-xl font-semibold text-neutral-800` |
| Card Title (H3) | `text-lg font-semibold text-neutral-900` |
| Body Text | `text-sm text-neutral-700` |
| Caption / Label | `text-xs text-neutral-500` |
| Table Header | `text-xs font-black uppercase text-neutral-400` |
| Metric (KPI) | `text-tremor-metric font-semibold` |

---

## 4. Bordas e Formas

### 4.1. Border Radius

| Elemento | Classe | Valor |
|---|---|---|
| Cards e Containers | `rounded-xl` ou `rounded-2xl` | 12px / 16px |
| Botões | `rounded-lg` | 8px |
| Inputs | `rounded-lg` | 8px |
| Tags / Badges | `rounded-full` | Pill shape |
| Modais | `rounded-2xl` | 16px |

> [!WARNING]
> **PROIBIDO**: Usar `rounded` (4px) ou `rounded-md` (6px) para cards e containers. O mínimo é `rounded-xl`.

### 4.2. Bordas
- Cards: `border border-neutral-100` (sutil) ou `border border-neutral-200`.
- Inputs em repouso: `border border-neutral-200` ou sem borda com `bg-neutral-50`.
- Inputs em foco: `focus:ring-2 focus:ring-primary-500 focus:border-primary-500`.

---

## 5. Sombras e Elevação

| Nível | Classes | Uso |
|---|---|---|
| Nível 0 (Flat) | Sem sombra | Elementos inline |
| Nível 1 (Sutil) | `shadow-sm` | Cards de conteúdo |
| Nível 2 (Médio) | `shadow-md` ou `shadow-premium` | Cards de destaque, hover states |
| Nível 3 (Elevado) | `shadow-lg` | Modais, dropdowns, popovers |
| Nível 4 (Máximo) | `shadow-xl` | Overlays críticos |

---

## 6. Superfícies e Backgrounds

| Camada | Classe | Uso |
|---|---|---|
| Page Background | `bg-neutral-50` ou `bg-neutral-25` | Fundo geral da aplicação |
| Card Background | `bg-white` | Conteúdo principal sempre sobre branco |
| Input Background | `bg-neutral-50` | Campos de formulário em repouso |
| Sidebar Background | `bg-primary-800` | Navegação lateral (azul escuro) |
| Hover Row | `hover:bg-neutral-50` | Linhas de tabela em hover |

---

## 7. Componentes — Padrões Obrigatórios

### 7.1. Botões

```jsx
// Primário
<button className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md">
  Salvar
</button>

// Secundário (Outline)
<button className="border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-medium px-6 py-2.5 rounded-lg transition-colors duration-200">
  Cancelar
</button>

// Perigo
<button className="bg-error-500 hover:bg-error-600 text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200">
  Excluir
</button>
```

### 7.2. Tabelas

```jsx
// Cabeçalho
<th className="text-xs font-black uppercase text-neutral-400 px-4 py-3 text-left">
  Nome
</th>

// Linha
<tr className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
  <td className="px-4 py-3 text-sm text-neutral-700">...</td>
</tr>
```

### 7.3. Modais

```jsx
// Overlay
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50">
  {/* Container */}
  <div className="bg-white rounded-2xl shadow-xl p-6 animate-in zoom-in-95 duration-200">
    ...
  </div>
</div>
```

### 7.4. Inputs

```jsx
<input
  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white transition-all outline-none"
/>
```

### 7.5. Cards

```jsx
<div className="bg-white border border-neutral-100 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
  ...
</div>
```

---

## 8. Animações e Transições

### 8.1. Padrões de Transição
- **Cor/Fundo**: `transition-colors duration-200`
- **Sombra**: `transition-shadow duration-200`
- **Tudo**: `transition-all duration-200` (usar com moderação)
- **Modal entrada**: `animate-in zoom-in-95 duration-200`

### 8.2. Micro-interações
- Botões devem ter hover state visível (mudança de cor + sombra).
- Linhas de tabela devem reagir ao hover (`hover:bg-neutral-50`).
- Inputs devem ter transição suave ao receber foco.

---

## 9. Responsividade

### 9.1. Breakpoints (Tailwind padrão)
| Breakpoint | Tamanho | Uso |
|---|---|---|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |
| `2xl` | 1536px | Ultra-wide |

### 9.2. Layout Responsivo
- Sidebar colapsa em telas `< lg`.
- Grids de cards usam `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.
- Tabelas devem ter `overflow-x-auto` em containers menores.

---

## 10. Acessibilidade (A11y)

- Todos os inputs devem ter `<label>` associado ou `aria-label`.
- Botões de ícone devem ter `aria-label` descritivo.
- Modais devem travar o foco (Radix/Headless UI faz isso automaticamente).
- Contraste mínimo de 4.5:1 para texto sobre fundo.

---

## 11. Checklist Visual

Antes de entregar qualquer alteração de frontend, verificar:

- [ ] Botões de ação primária usam cores semânticas (azul/verde), **nunca** preto/cinza?
- [ ] Cards têm `rounded-xl` ou superior?
- [ ] Inputs têm `bg-neutral-50` e focus ring?
- [ ] Tabelas têm headers uppercase com `text-neutral-400`?
- [ ] Modais têm `backdrop-blur-sm` e animação de entrada?
- [ ] Nenhuma cor arbitrária (`bg-[#xxx]`) foi usada?
- [ ] A paleta vem exclusivamente do `tailwind.config.js`?

> [!IMPORTANT]
> O objetivo visual é sempre **premium e moderno**. Se o resultado parecer "genérico" ou "básico", houve uma falha.
