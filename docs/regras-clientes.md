# Regras de Domínio: Clientes, Veículos e Peças

Este documento estabelece as diretrizes arquiteturais e de negócio exclusivas para os módulos de Clientes, Veículos e Peças/Equipamentos. Sempre que for solicitada qualquer alteração nestes módulos, estas regras devem ser rigorosamente validadas ANTES da escrita de código.

## 1. Single Source of Truth (Fonte Única da Verdade)
* **Cadastro Unificado**: O módulo de clientes opera sob a página unificada. O usuário sempre cadastra o cliente junto com seu ativo (Veículo ou Peça Avulsa) no mesmo fluxo, garantindo atomicidade na experiência do usuário.
* **Telas Avulsas Eliminadas**: Não existem mais páginas isoladas para cadastro de veículos ou peças. Toda inserção nasce a partir de um cliente (seja na página unificada, seja nos sub-modais de Cadastro/Edição de OS).

## 2. Experiência do Usuário (UX) e UX de Formulários
* **Feedback Visual e Validação Estrita**: Os formulários não podem utilizar "salvamento silencioso" ou ignorar erros. A validação das seções deve ocorrer e realçar visualmente em vermelho os campos obrigatórios/inválidos ANTES do envio para o backend.
* **Resiliência de Integrações (ViaCEP)**: Integrações externas de preenchimento automático, como busca de CEP (ViaCEP), devem ter um limite de tempo estrito (Timeout, ex: 3 segundos) e falhar elegantemente liberando os inputs imediatamente para preenchimento manual do usuário.
* **Posicionamento Estratégico**: Em formulários como o de Veículos, inputs de finalização de contexto como "Chassi" ficam no final (após Combustível) para respeitar o fluxo normal e prioritário de informações da oficina.

## 3. Performance: Lazy Loading e Cache
* **Minimização do Payload Base**: A listagem principal de clientes (`/api/cliente`) **nunca** deve carregar relacionamentos pesados de imediato (como veículos e equipamentos vinculados). Deve retornar apenas dados essenciais.
* **Lazy Loading em Tabela**: Os ativos atrelados ao cliente só são carregados através de uma requisição assíncrona dedicada (`/api/cliente/:id/ativos`) quando a linha da tabela correspondente é intencionalmente expandida.
* **Cache Local**: Para evitar redundância de rede, deve ser implementado um cache local simples no componente de listagem (ex: não refazer fetch caso os ativos já tenham sido carregados ao recolher e expandir).
* **Invalidação Ativa via Eventos**: Componentes que criam ou atualizam ativos para um cliente fora da tabela de listagem (ex: o modal rápido na listagem de OS) devem invalidar o cache de ativos assincronamente despachando eventos globais (ex: `CustomEvent`). Listeners que interceptam este evento precisam obrigatoriamente realizar o "cleanup" (`removeEventListener`) no desmonte.

## 4. Clean Architecture no Backend
* **Padronização do Repository**: A camada de repositório deve ser a única responsável por regras de manipulação e consolidação complexa no banco.
* **Queries Naturais e Dinâmicas**: Proibido o uso de concatenações de queries SQL puras (queryRaw) na busca paginada, a menos que haja severa limitação de performance comprovada. Utilize a construção padrão com `contains` do Prisma e `mode: 'insensitive'` para filtros textuais, mapeando as cláusulas em relacionamentos profundos dentro de um único bloco genérico de OR.
* **Agrupamento de Rotas**: Não crie endpoints isolados de pesquisa para paginação. Toda lógica de paginação (`limit`, `page`) e de busca textual (`search`) deve ser unificada e parametrizada através do endpoint pai de listagem principal (`GET /cliente`).
* **Performance do Prisma**: A extração da contagem total (`count`) e a pesquisa da página ativa (`findMany`) em dados paginados devem ocorrer numa mesma transação simultânea (`prisma.$transaction([])`) minimizando o uso de lock e overhead de requests consecutivas ao DB.
