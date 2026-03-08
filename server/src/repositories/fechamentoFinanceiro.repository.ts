import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export class FechamentoFinanceiroRepository {
  async create(data: Prisma.FechamentoFinanceiroCreateInput) {
    return await prisma.fechamentoFinanceiro.create({
      data,
    });
  }

  async findAll() {
    return await prisma.fechamentoFinanceiro.findMany({
      include: {
        ordem_de_servico: {
          include: {
            veiculo: true,
            servicos_mao_de_obra: {
              where: { deleted_at: null },
              include: {
                funcionario: {
                  include: {
                    pessoa_fisica: {
                      include: {
                        pessoa: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findById(id: number) {
    return await prisma.fechamentoFinanceiro.findUnique({
      where: { id_fechamento_financeiro: id },
      include: { ordem_de_servico: true },
    });
  }

  async update(id: number, data: any) {
    const { itemsPecas, ...fechamentoData } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Atualizar Fechamento
      const fechamento = await tx.fechamentoFinanceiro.update({
        where: { id_fechamento_financeiro: id },
        data: fechamentoData,
      });

      // 2. Processar Pagamentos de Peças (UPSET em lote)
      if (itemsPecas && itemsPecas.length > 0) {
        for (const itemPeca of itemsPecas) {
          const {
            id_pagamento_peca,
            id_item_os,
            id_fornecedor,
            custo_real,
            pago_ao_fornecedor,
          } = itemPeca;

          if (id_pagamento_peca) {
            await tx.pagamentoPeca.update({
              where: { id_pagamento_peca },
              data: {
                id_fornecedor: Number(id_fornecedor),
                custo_real: Number(custo_real),
                pago_ao_fornecedor: Boolean(pago_ao_fornecedor),
              },
            });
          } else {
            await tx.pagamentoPeca.create({
              data: {
                id_item_os: Number(id_item_os),
                id_fornecedor: Number(id_fornecedor),
                custo_real: Number(custo_real),
                pago_ao_fornecedor: Boolean(pago_ao_fornecedor),
                data_compra: new Date(),
              },
            });
          }
        }
      }

      return fechamento;
    });
  }

  async delete(id: number) {
    return await prisma.fechamentoFinanceiro.delete({
      where: { id_fechamento_financeiro: id },
    });
  }

  /**
   * Consolida uma OS financeiramente
   * - Salva/Atualiza pagamentos de peças (PagamentoPeca)
   * - Cria lançamentos no Livro Caixa para TODOS os pagamentos
   * - PIX: Atualiza saldo bancário imediatamente
   * - Dinheiro: Apenas lançamento no caixa
   * - Débito/Crédito: Lançamento no caixa + cria recebível (NÃO atualiza saldo ainda)
   */
  async consolidarOS(
    idOs: number,
    custoTotalPecasReal: number,
    itemsPecas?: any[],
  ) {
    return await prisma.$transaction(async (tx) => {
      // 0. Processar Pagamentos de Peças (UPSET em lote dentro da transação)
      if (itemsPecas && itemsPecas.length > 0) {
        for (const itemPeca of itemsPecas) {
          const {
            id_pagamento_peca,
            id_item_os,
            id_fornecedor,
            custo_real,
            pago_ao_fornecedor,
          } = itemPeca;

          if (id_pagamento_peca) {
            await tx.pagamentoPeca.update({
              where: { id_pagamento_peca },
              data: {
                id_fornecedor: Number(id_fornecedor),
                custo_real: Number(custo_real),
                pago_ao_fornecedor: Boolean(pago_ao_fornecedor),
              },
            });
          } else {
            await tx.pagamentoPeca.create({
              data: {
                id_item_os: Number(id_item_os),
                id_fornecedor: Number(id_fornecedor),
                custo_real: Number(custo_real),
                pago_ao_fornecedor: Boolean(pago_ao_fornecedor),
                data_compra: new Date(),
              },
            });
          }
        }
      }

      // 1. Buscar OS com todos os pagamentos e detalhes para descrição e cálculo de lucro
      const os = await tx.ordemDeServico.findUnique({
        where: { id_os: idOs },
        include: {
          pagamentos_cliente: {
            where: { deleted_at: null },
          },
          cliente: {
            include: {
              pessoa_fisica: { include: { pessoa: true } },
              pessoa_juridica: true,
            },
          },
          veiculo: true,
          itens_os: {
            where: { deleted_at: null },
            include: { pecas_estoque: true },
          },
          servicos_mao_de_obra: {
            where: { deleted_at: null },
          },
        },
      });

      if (!os) {
        throw new Error("OS não encontrada");
      }

      if (os.status !== "FINANCEIRO") {
        throw new Error("OS não está pronta para consolidação financeira");
      }

      // Buscar Categoria 'Serviços' (Filho de Receita)
      const categoriaServicos = await tx.categoriaFinanceira.findFirst({
        where: {
          nome: "Serviços",
          parent: { nome: "Receita" },
        },
      });

      const idCategoriaServicos = categoriaServicos?.id_categoria;
      const nomeCategoriaServicos = categoriaServicos?.nome || "Serviços";

      // Formatar Descrição Padronizada
      const nomeCliente =
        os.cliente.pessoa_fisica?.pessoa.nome ||
        os.cliente.pessoa_juridica?.nome_fantasia ||
        "Cliente";
      const veiculoDesc = os.veiculo ? `${os.veiculo.modelo}` : "Veículo";
      const placa = os.veiculo?.placa || "S/Placa";
      const cor = os.veiculo?.cor || "";

      // "OS Nº {id} - {cliente} | {placa} | {veiculo} | {cor}"
      const descricaoPadrao = `OS Nº ${idOs} - ${nomeCliente} | ${placa} | ${veiculoDesc} | ${cor}`;

      // --- CÁLCULO DINÂMICO DE LUCRO ---
      let lucroPecas = 0;
      let lucroMaoDeObra = os.servicos_mao_de_obra.reduce(
        (acc, s) => acc + Number(s.valor),
        0,
      );

      // 1. Calcular Lucro e Prejuízo por Peça
      for (const item of os.itens_os) {
        const valorVenda = Number(item.valor_total);

        // Fallback: Priorizar custoReal do payload itemsPecas se houver, senão banco de dados
        const pecaPayload = itemsPecas?.find(
          (p: any) => Number(p.id_item_os) === item.id_iten,
        );
        const custoReal =
          pecaPayload?.custo_real !== undefined
            ? Number(pecaPayload.custo_real)
            : Number(item.pecas_estoque?.valor_custo || 0); // No ItemOS não tem valor_custo nativo, é no estoque ou via payload.

        if (item.id_pecas_estoque) {
          if (item.is_interno) {
            // Peça de Estoque para Uso Interno -> Impacto Neutro
            lucroPecas += 0;
          } else {
            // Peça de Estoque Vendida -> 100% lucro
            lucroPecas += valorVenda;
          }
        } else if (item.is_interno) {
          // Peça Externa para Uso Interno -> Subtrai o custo (prejuízo na OS)
          lucroPecas -= custoReal;
        } else {
          // Peça Externa Comum -> Lucro = Venda - Custo
          lucroPecas += valorVenda - custoReal;
        }
      }

      // 2. Regra de Abatimento
      if (lucroPecas < 0) {
        const prejuizo = Math.abs(lucroPecas);
        lucroMaoDeObra -= prejuizo;
        lucroPecas = 0;
      }

      const lucroTotal = lucroPecas + lucroMaoDeObra;
      // ---------------------------------

      // 2. Criar ou Atualizar Fechamento Financeiro
      let fechamento = await tx.fechamentoFinanceiro.findFirst({
        where: { id_os: idOs },
      });

      if (fechamento) {
        fechamento = await tx.fechamentoFinanceiro.update({
          where: {
            id_fechamento_financeiro: fechamento.id_fechamento_financeiro,
          },
          data: {
            custo_total_pecas_real: custoTotalPecasReal,
            lucro_pecas: lucroPecas,
            lucro_mao_de_obra: lucroMaoDeObra,
            lucro_total: lucroTotal,
            data_fechamento_financeiro: new Date(),
            deleted_at: null,
          },
        });
      } else {
        fechamento = await tx.fechamentoFinanceiro.create({
          data: {
            id_os: idOs,
            custo_total_pecas_real: custoTotalPecasReal,
            lucro_pecas: lucroPecas,
            lucro_mao_de_obra: lucroMaoDeObra,
            lucro_total: lucroTotal,
            data_fechamento_financeiro: new Date(),
          },
        });
      }

      // 3. Processar cada pagamento do cliente (STRICT MODE)
      console.log(
        `🔍 [CONSOLIDAÇÃO STRICT] Processando ${os.pagamentos_cliente.length} pagamento(s) para OS #${idOs}`,
      );

      for (const pagamento of os.pagamentos_cliente) {
        const metodo = (pagamento.metodo_pagamento || "").trim().toUpperCase();
        const valorPagamento = Number(pagamento.valor);
        const idContaBancaria = (pagamento as any).id_conta_bancaria;
        const idOperadora = pagamento.id_operadora;
        const idPagamentoCliente = pagamento.id_pagamento_cliente;

        console.log(
          `   🔸 Pagamento ${idPagamentoCliente}: ${metodo} | R$ ${valorPagamento}`,
        );

        // RE-FETCH Pagamento to ensure we have the latest id_livro_caixa (Paranoid Check)
        const pagamentoFresh = await tx.pagamentoCliente.findUnique({
          where: { id_pagamento_cliente: idPagamentoCliente },
        });

        if (!pagamentoFresh) continue;

        const pIdLivroCaixa = pagamentoFresh.id_livro_caixa;
        console.log(
          `   🔸 Pagamento #${idPagamentoCliente} (Fresh): ID_LC=${pIdLivroCaixa} | Metodo=${metodo}`,
        );

        // VALIDAÇÃO PRÉVIA (FAIL FAST)
        if ((metodo === "PIX" || metodo === "DINHEIRO") && !idContaBancaria) {
          if (metodo === "PIX" && !idContaBancaria) {
            // ... validation logic
          }
        }
        if ((metodo === "CREDITO" || metodo === "DEBITO") && !idOperadora) {
          throw new Error(
            `Pagamento ${metodo} (R$ ${valorPagamento}) sem Operadora definida!`,
          );
        }

        // --- SAFETY CHECK: Search for "Orphan" LivroCaixa to prevent Duplication ---
        if (!pIdLivroCaixa) {
          const potentialMatch = await tx.livroCaixa.findFirst({
            where: {
              valor: valorPagamento,
              descricao: {
                contains: `OS Nº ${idOs}`, // Matches both "OS Nº 5 - ..." and "Recebimento: OS Nº 5..."
              },
              dt_movimentacao: {
                gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // Last 24h
                lte: new Date(new Date().getTime() + 1 * 60 * 60 * 1000),
              },
              deleted_at: null,
            },
          });

          if (potentialMatch) {
            console.log(
              `      ⚠️ Encontrado LivroCaixa Órfão (#${potentialMatch.id_livro_caixa}). Vinculando para evitar duplicidade.`,
            );
            // Link found record to payment
            await tx.pagamentoCliente.update({
              where: { id_pagamento_cliente: idPagamentoCliente },
              data: { id_livro_caixa: potentialMatch.id_livro_caixa },
            });
            // Update local var to skip creation
            // pIdLivroCaixa is const, so we just won't enter the creation blocks because we check it below?
            // Wait, we need to update the flow logic.
            // Let's assign to a let variable if we want to mutate, or just rely on the 'if' checks using 'pIdLivroCaixa' (which is stale now).
            // Better: continue; or update pIdLivroCaixa (need to change to let)
          }
        }

        // Re-read after potential link
        const finalCheck = await tx.pagamentoCliente.findUnique({
          where: { id_pagamento_cliente: idPagamentoCliente },
        });
        const finalLcId = finalCheck?.id_livro_caixa;

        // --- FLUXO 1: PIX (IMEDIATO NO BANCO) ---
        if (metodo === "PIX") {
          // Check if already linked
          if (finalLcId) {
            console.log(
              `      ⚠️ Pagamento #${idPagamentoCliente} já possui Livro Caixa (#${finalLcId}). Pulando criação.`,
            );
          } else {
            // ... create
            // 1.1 Criar LivroCaixa (Vinculado a Conta)
            const livroCaixa = await tx.livroCaixa.create({
              data: {
                descricao: descricaoPadrao,
                valor: valorPagamento,
                tipo_movimentacao: "ENTRADA",
                categoria: nomeCategoriaServicos, // Fallback string
                id_categoria: idCategoriaServicos || null,
                dt_movimentacao: new Date(),
                origem: "AUTOMATICA",
                id_conta_bancaria: idContaBancaria,
              },
            });

            // 1.2 Atualizar Saldo Bancário
            await tx.contaBancaria.update({
              where: { id_conta: idContaBancaria },
              data: { saldo_atual: { increment: valorPagamento } },
            });

            // 1.3 Vincular ao PagamentoCliente
            await tx.pagamentoCliente.update({
              where: { id_pagamento_cliente: idPagamentoCliente },
              data: { id_livro_caixa: livroCaixa.id_livro_caixa },
            });

            console.log(
              `      ✅ [PIX] Consolidado: LC #${livroCaixa.id_livro_caixa} | Saldo Atualizado.`,
            );
          }
        }

        // --- FLUXO 2: DINHEIRO (CAIXA MAS SEM EXTRATO BANCÁRIO DIGITAL) ---
        else if (metodo === "DINHEIRO") {
          if (finalLcId) {
            console.log(
              `      ⚠️ Pagamento #${idPagamentoCliente} já possui Livro Caixa (#${finalLcId}). Pulando criação.`,
            );
          } else {
            // 2.1 Criar LivroCaixa
            const livroCaixa = await tx.livroCaixa.create({
              data: {
                descricao: descricaoPadrao,
                valor: valorPagamento,
                tipo_movimentacao: "ENTRADA",
                categoria: nomeCategoriaServicos,
                id_categoria: idCategoriaServicos || null,
                dt_movimentacao: new Date(),
                origem: "AUTOMATICA",
                id_conta_bancaria: null,
              },
            });

            // 2.2 Vincular ao PagamentoCliente
            await tx.pagamentoCliente.update({
              where: { id_pagamento_cliente: idPagamentoCliente },
              data: {
                id_livro_caixa: livroCaixa.id_livro_caixa,
              },
            });

            console.log(
              `      ✅ [DINHEIRO] Livro Caixa gerado (Sem impacto no Saldo Bancário Digital)`,
            );
          }
        }

        // --- FLUXO 3: CARTÃO (DIFERIDO) ---
        else if (metodo === "DEBITO" || metodo === "CREDITO") {
          // Check if Livro Caixa exists
          if (finalLcId) {
            console.log(
              `      ⚠️ Pagamento #${idPagamentoCliente} já possui Livro Caixa (#${finalLcId}). Pulando criação.`,
            );
          } else {
            // Prepara nome da operadora para descrição
            let operadoraNome = "";
            if (idOperadora) {
              const op = await tx.operadoraCartao.findUnique({
                where: { id_operadora: idOperadora },
              });
              operadoraNome = op?.nome || "";
            }

            // 3.1 Criar LivroCaixa
            const livroCaixa = await tx.livroCaixa.create({
              data: {
                descricao:
                  descricaoPadrao +
                  (operadoraNome ? ` (${operadoraNome})` : ""),
                valor: valorPagamento,
                tipo_movimentacao: "ENTRADA",
                categoria: nomeCategoriaServicos,
                id_categoria: idCategoriaServicos || null,
                dt_movimentacao: new Date(),
                origem: "AUTOMATICA",
                id_conta_bancaria: null,
              },
            });

            // 3.2 Vincular ao PagamentoCliente
            await tx.pagamentoCliente.update({
              where: { id_pagamento_cliente: idPagamentoCliente },
              data: {
                id_livro_caixa: (livroCaixa as any).id_livro_caixa,
              } as any,
            });
          }

          // 3.3 Check Recebíveis
          // Recebíveis are linked to OS, not directly to Payment (Schema limitiation)
          // But now we assume they are created at Payment Time.
          // How to verify?
          let existingRecebiveis = null;
          if (idOperadora) {
            existingRecebiveis = await tx.recebivelCartao.findFirst({
              where: {
                id_os: idOs,
                id_operadora: Number(idOperadora),
                valor_bruto: {
                  equals: valorPagamento / (pagamento.qtd_parcelas || 1),
                },
              }, // Rough check
            });
          }

          if (existingRecebiveis) {
            console.log(
              `      ⚠️ Pagamento #${idPagamentoCliente} parecem já existir recebíveis. Pulando.`,
            );
          } else {
            // Existing generation logic...
            if (idOperadora) {
              const operadora = await tx.operadoraCartao.findUnique({
                where: { id_operadora: idOperadora },
                include: { taxas_cartao: true },
              });

              if (operadora) {
                const qtdParcelas = pagamento.qtd_parcelas || 1;
                const tipoParcelamento =
                  (pagamento as any).tipo_parcelamento || "LOJA";

                let taxa = 0;
                let prazo = 0;

                const modalidade = metodo === "DEBITO" ? "DEBITO" : "CREDITO";
                const taxEntry = operadora.taxas_cartao?.find(
                  (t) =>
                    t.modalidade === modalidade &&
                    t.num_parcelas === (metodo === "DEBITO" ? 1 : qtdParcelas),
                );

                if (taxEntry) {
                  taxa = Number(taxEntry.taxa_total);
                  prazo =
                    modalidade === "DEBITO"
                      ? Number(operadora.prazo_debito)
                      : qtdParcelas === 1
                        ? Number(operadora.prazo_credito_vista)
                        : Number(operadora.prazo_credito_parc);
                } else {
                  // Fallback
                  taxa =
                    metodo === "DEBITO"
                      ? Number(operadora.taxa_debito)
                      : qtdParcelas === 1
                        ? Number(operadora.taxa_credito_vista)
                        : Number(operadora.taxa_credito_parc);

                  prazo =
                    metodo === "DEBITO"
                      ? Number(operadora.prazo_debito)
                      : qtdParcelas === 1
                        ? Number(operadora.prazo_credito_vista)
                        : Number(operadora.prazo_credito_parc);
                }

                if (
                  tipoParcelamento === "CLIENTE" &&
                  metodo === "CREDITO" &&
                  qtdParcelas > 1
                ) {
                  const vistaRate = operadora.taxas_cartao?.find(
                    (t) => t.modalidade === "CREDITO" && t.num_parcelas === 1,
                  );
                  if (vistaRate) taxa = Number(vistaRate.taxa_total);
                  else taxa = Number(operadora.taxa_credito_vista);
                }

                const taxaAplicada = (valorPagamento * taxa) / 100;
                const valorLiquido = valorPagamento - taxaAplicada;

                const dataPrevistaBase = new Date();
                if (operadora.antecipacao_auto) {
                  dataPrevistaBase.setDate(dataPrevistaBase.getDate() + 1);
                } else {
                  dataPrevistaBase.setDate(dataPrevistaBase.getDate() + prazo);
                }

                const valorPorParcela = valorPagamento / qtdParcelas;
                const valorLiquidoPorParcela = valorLiquido / qtdParcelas;
                const taxaPorParcela = taxaAplicada / qtdParcelas;

                for (let i = 1; i <= qtdParcelas; i++) {
                  const dataPrevistaParcela = new Date(dataPrevistaBase);
                  if (
                    !operadora.antecipacao_auto &&
                    modalidade === "CREDITO" &&
                    qtdParcelas > 1
                  ) {
                    dataPrevistaParcela.setMonth(
                      dataPrevistaParcela.getMonth() + (i - 1),
                    );
                  }

                  await tx.recebivelCartao.create({
                    data: {
                      id_os: idOs,
                      id_operadora: idOperadora,
                      num_parcela: i,
                      total_parcelas: qtdParcelas,
                      valor_bruto: valorPorParcela,
                      valor_liquido: valorLiquidoPorParcela,
                      taxa_aplicada: taxaPorParcela,
                      tipo_parcelamento: tipoParcelamento,
                      data_venda: new Date(),
                      data_prevista: dataPrevistaParcela,
                      status: "PENDENTE",
                    },
                  });
                }
                console.log(
                  `      ✅ [CARTÃO] ${qtdParcelas} parcela(s) criada(s) em Recebíveis (Taxa: ${taxa}%).`,
                );
              }
            }
          }
        }
      }

      // 4. Lançamento de Saída (Custo) no Livro Caixa para Peças Externas
      // Apenas peças não-estoque (id_pecas_estoque == null) geram saída imediata
      let custoPecasExternas = 0;
      for (const item of os.itens_os) {
         if (!item.id_pecas_estoque) {
            const pecaPayload = itemsPecas?.find(
              (p: any) => Number(p.id_item_os) === item.id_iten,
            );
            const custoReal = pecaPayload?.custo_real !== undefined
                ? Number(pecaPayload.custo_real)
                : Number(item.pecas_estoque?.valor_custo || 0);

            custoPecasExternas += custoReal;
         }
      }

      if (custoPecasExternas > 0) {
        // Buscar categoria 'Peças Externas' (Despesa)
        const categoriaPecas = await tx.categoriaFinanceira.findFirst({
           where: { nome: "Peças / Materiais", tipo: "DESPESA" }
        });

        await tx.livroCaixa.create({
          data: {
             descricao: `Custo de Peças Externas / Consumo Interno - OS #${idOs}`,
             valor: custoPecasExternas,
             tipo_movimentacao: "SAIDA",
             categoria: categoriaPecas?.nome || "Despesas Gerais",
             id_categoria: categoriaPecas?.id_categoria || null,
             dt_movimentacao: new Date(),
             origem: "AUTOMATICA"
          }
        });
        console.log(`      ✅ [DESPESA LIVRO CAIXA] Lançado custo externo de R$ ${custoPecasExternas}`);
      }

      await tx.ordemDeServico.update({
        where: { id_os: idOs },
        data: { status: "FINALIZADA" },
      });

      return fechamento;
    });
  }

  /**
   * Reverte uma Consolidação Financeira
   * - Bloqueia se houver comissões pagas ou recebíveis baixados
   * - Desfaz lançamentos de LivroCaixa e Saldos
   * - Remove Recebíveis
   * - Exclui Fechamento
   */
  async reverterConsolidacao(idFechamento: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Buscar dados completos
      const fechamento = await tx.fechamentoFinanceiro.findUnique({
        where: { id_fechamento_financeiro: idFechamento },
        include: {
          ordem_de_servico: {
            include: {
              pagamentos_cliente: { where: { deleted_at: null } },
              servicos_mao_de_obra: { where: { deleted_at: null } },
              recebiveis_cartao: true, // Needed to check status
            },
          },
        },
      });

      if (!fechamento) throw new Error("Fechamento não encontrado.");

      const os = fechamento.ordem_de_servico;

      // 2. BLOCKS DE SEGURANÇA

      // 2.1 Verificar Comissões Pagas
      const comissoesPagas = os.servicos_mao_de_obra.some(
        (s) => s.status_pagamento === "PAGO",
      );
      if (comissoesPagas) {
        throw new Error(
          "Não é possível desconsolidar: Existem comissões já pagas aos funcionários nesta OS.",
        );
      }

      // 2.2 Verificar Recebíveis Baixados
      // We need to fetch RecebiveisCartao separately if not in include or if implicit relation
      const recebiveis = await tx.recebivelCartao.findMany({
        where: { id_os: os.id_os },
      });
      const recebiveisBaixados = recebiveis.some(
        (r) => r.status === "RECEBIDO",
      );
      if (recebiveisBaixados) {
        throw new Error(
          "Não é possível desconsolidar: Existem recebíveis de cartão já confirmados/baixados.",
        );
      }

      console.log(`↺ [REVERSÃO] Iniciando reversão da OS #${os.id_os}`);

      // 3. EXECUTAR REVERSÃO

      // 3.1 Estornar Pagamentos (Livro Caixa e Saldo)
      for (const pag of os.pagamentos_cliente) {
        const p = pag as any;

        if (p.id_livro_caixa) {
          // Buscar info do LivroCaixa pra saber valor exato lançado (segurança)
          const lc = await tx.livroCaixa.findUnique({
            where: { id_livro_caixa: p.id_livro_caixa },
          });

          if (lc) {
            // Se PIX e tem conta, estornar saldo
            if (lc.id_conta_bancaria && p.metodo_pagamento === "PIX") {
              await tx.contaBancaria.update({
                where: { id_conta: lc.id_conta_bancaria },
                data: { saldo_atual: { decrement: Number(lc.valor) } },
              });
              console.log(
                `   - Saldo estornado Conta #${lc.id_conta_bancaria}: -${lc.valor}`,
              );
            }

            // Remover LivroCaixa
            await tx.livroCaixa.delete({
              where: { id_livro_caixa: p.id_livro_caixa },
            });
          }

          // Desvincular do pagamento
          await tx.pagamentoCliente.update({
            where: { id_pagamento_cliente: p.id_pagamento_cliente },
            data: { id_livro_caixa: null } as any,
          });
        }
      }

      // 3.2 Remover Recebíveis de Cartão
      const deletedRecebiveis = await tx.recebivelCartao.deleteMany({
        where: { id_os: os.id_os },
      });
      console.log(`   - Recebíveis removidos: ${deletedRecebiveis.count}`);

      // 3.3 Remover Fechamento Financeiro
      await tx.fechamentoFinanceiro.delete({
        where: { id_fechamento_financeiro: idFechamento },
      });

      await tx.ordemDeServico.update({
        where: { id_os: os.id_os },
        data: { status: "FINANCEIRO" },
      });

      return { success: true, message: "Consolidação revertida com sucesso." };
    });
  }
}
