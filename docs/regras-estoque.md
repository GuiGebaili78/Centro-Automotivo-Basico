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
* **Baixa Imediata e Transacional na OS**: Ao inserir uma peça do Estoque numa Ordem de Serviço, a quantidade é deduzida IMEDIATAMENTE do saldo físico e o Kardex registra uma `SAIDA`. Se a OS for CANCELADA ou o item for excluído da OS, o sistema reverte a quantidade no saldo e registra um `ESTORNO` no Kardex, garantindo rastreabilidade e prevenindo "estoque fantasma".
* **Rastreabilidade Integrada**: No painel de Notas Fiscais/Entradas, a origem e o destino devem exibir textualmente o "Nome da Peça e o Modelo", eliminando a exibição genérica de "em estoque físico".

## 5. Clean Architecture, Lógica FIFO e Sincronização de Banco (Post-Mortem & Arquitetura)

### Arquitetura Tipada e Camadas
* **Enum de Condição (`CondicaoPeca`)**: É proibido armazenar a condição de uma peça como texto livre (ex: no campo `obs`). A tabela `MovimentacaoEstoque` utiliza estritamente o Enum `CondicaoPeca` (`NOVO`, `USADO`, `RECONDICIONADO`) com valor padrão `NOVO`, garantindo higienização de dados e consultas limpas.
* **Lógica FIFO Estrita na OS**: A sugestão de lotes na Ordem de Serviço segue a regra FIFO (First-In, First-Out) baseada em `data_movimentacao asc`. O `PrecificacaoService` abate as saídas consolidadas lote a lote e sugere o lote mais antigo com saldo em aberto, maximizando o giro de estoque e o fluxo de caixa.

### Post-Mortem de Sincronização (Erro: The column condicao does not exist / HTTP 400 Bad Request)
* **Causa Raiz**: O ambiente de testes E2E (Playwright) utiliza um banco isolado (`automotivo_test_db` na porta 5434). O script `global-setup.ts` roda automaticamente `npx prisma db push` neste banco de testes, o que fez com que os testes de linha de comando passassem 100% com a nova coluna `condicao`. No entanto, ao abrir o Playwright em modo UI (`npm run test:e2e:ui`) ou navegar no sistema local (`http://localhost:5173`), as requisições apontavam para a API principal do Docker (`http://localhost:3000/api`), que roda sob o banco `automotivo_db` na porta 5432. Como o arquivo `docker-compose.dev.yml` original omitia o `npx prisma db push`, a tabela `MovimentacaoEstoque` no banco principal não possuía a coluna `condicao`, gerando falha no Prisma e estourando o erro `400 Bad Request` no Axios ao tentar cadastrar novas peças.
* **Solução e Regra Definitiva**: O arquivo `docker-compose.dev.yml` foi retificado para rodar obrigatoriamente `npx prisma db push` antes de iniciar a API em desenvolvimento. Adicionalmente, foi incluído o `Cenário 5` no `estoque.spec.ts` para certificar que os formulários tipados persistem corretamente e refletem o estado idêntico entre os bancos de teste e desenvolvimento.

## 6. Conferência de Inventário e Auditoria Física
* **Busca e Filtragem por Localização**: Para otimizar a contagem física e a conferência de balanço, o campo de busca global suporta a filtragem direta pela `localizacao` da peça (ex: `PRATELEIRA A1`, `GAVETA 3`). As cláusulas de busca no repositório (`findAll` e `search`) devem sempre englobar o campo `localizacao` na verificação `OR`, garantindo que o estoquista possa filtrar instantaneamente todas as peças de uma mesma prateleira ou setor.
