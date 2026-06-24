# Regras de Domínio: Estoque e Inventário (Kardex)

Este documento estabelece as diretrizes arquiteturais e de negócio para o módulo de Estoque. Nenhuma alteração de código deve violar os princípios de rastreabilidade, unicidade e catálogo estabelecidos aqui.

## 1. Separação Estrita: Catálogo Mestre vs. Kardex (Movimentação)
* **Catálogo Mestre de Peças**: Representa a identidade da peça (Nome, Categoria, Fabricante, Modelo/Referência). Uma peça só existe UMA VEZ no catálogo.
* **Movimentação de Estoque (Kardex)**: Entradas (compras, NF) e Saídas (vendas, uso em OS, descartes) são registos imutáveis (`INSERT` only) atrelados ao ID da peça no Catálogo Mestre.
* **Proibição de Duplicação por Preço**: Alterações de preço de custo devido a novas compras NUNCA devem duplicar o cadastro da peça. Devem apenas recalcular o custo médio e registar a nova entrada no Kardex.

## 2. Unicidade e Referência Cruzada (Cross-Reference)
* **Chave Composta Anti-Duplicidade**: O banco de dados deve barrar a criação de peças com a exata mesma combinação de `Tipo/Categoria + Fabricante + Modelo (Referência)`.
* **Peças Equivalentes (Cross-Reference)**: O sistema deve permitir atrelar modelos de fabricantes distintos (ex: Ikro 5045 = Gauss GH212). A busca por uma referência deve retornar todas as peças equivalentes em estoque.

## 3. Experiência do Usuário (UX) no Balcão
* **Busca em Cascata (Filtros)**: A interface de busca deve ser baseada em filtros progressivos (ex: Categoria -> Modelo) com realce visual (azul) quando o filtro estiver ativo. O carregamento de todos os itens da base de uma só vez está proibido (Lazy Loading obrigatório).
* **Edição Direta**: Eliminação de "modais rápidos" de edição. O clique num item da listagem redireciona para a visão completa do Catálogo da Peça.
* **Entrada em Lote (NF)**: A entrada de novas peças deve ser tratada como um fluxo específico (Entrada de Nota/Lote), isolado da "edição" do nome/fabricante da peça. O botão "Duplicar peça" está banido.

## 4. Proteção de Histórico e Ciclo de Vida
* **Exclusão Lógica (Soft Delete)**: É terminantemente proibida a exclusão física (`DELETE`) de itens do Catálogo ou de movimentações do Kardex. Peças fora de linha recebem a flag `ativo: false` para não quebrarem o histórico de Ordens de Serviço faturadas.
* **Reserva de OS**: Ao inserir uma peça numa Ordem de Serviço aberta, a quantidade entra em estado de "Reserva" (compõe o saldo virtual). A "Baixa" real (desconto do saldo físico) só ocorre mediante a aprovação/faturamento da OS.
* **Rastreabilidade Integrada**: No painel de Notas Fiscais/Entradas, a origem e o destino devem exibir textualmente o "Nome da Peça e o Modelo", eliminando a exibição genérica de "em estoque físico".
