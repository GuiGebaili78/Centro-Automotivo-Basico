import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AuditLogRepository } from './auditLog.repository.js';

const auditRepo = new AuditLogRepository();

export class OrdemDeServicoRepository {
  async create(data: Prisma.OrdemDeServicoCreateInput) {
    const created = await prisma.ordemDeServico.create({
      data,
    });
    
    await auditRepo.create({
        tabela: 'ordem_de_servico',
        registro_id: created.id_os,
        acao: 'CREATE',
        valor_novo: created
    });
    
    return created;
  }

  async createUnified(data: any) {
    return await prisma.$transaction(async (tx) => {
        let finalClientId = data.client.id_cliente;

        // 1. Handle Client Creation if needed
        if (!finalClientId) {
             const isJuridica = data.client.tipo === 'JURIDICA';
             
             // Base Pessoa
             const pessoa = await tx.pessoa.create({
                 data: { nome: data.client.nome }
             });

             let idPessoaFisica = null;
             let idPessoaJuridica = null;
             let tipoId = 1; // Default Default 1=Fisica

             if (isJuridica) {
                 tipoId = 2; // Default 2=Juridica
                 const pj = await tx.pessoaJuridica.create({
                     data: {
                         id_pessoa: pessoa.id_pessoa,
                         razao_social: data.client.nome,
                         cnpj: data.client.cnpj || null
                     }
                 });
                 idPessoaJuridica = pj.id_pessoa_juridica;
             } else {
                 const pf = await tx.pessoaFisica.create({
                     data: {
                         id_pessoa: pessoa.id_pessoa,
                         cpf: data.client.cpf || null
                     }
                 });
                 idPessoaFisica = pf.id_pessoa_fisica;
             }

             const newClient = await tx.cliente.create({
                 data: {
                     id_pessoa_fisica: idPessoaFisica,
                     id_pessoa_juridica: idPessoaJuridica,
                     tipo_pessoa: tipoId,
                     telefone_1: data.client.telefone,
                     logradouro: data.client.logradouro,
                     nr_logradouro: data.client.numero,
                     bairro: data.client.bairro,
                     cidade: data.client.cidade,
                     estado: data.client.estado
                 }
             });
             finalClientId = newClient.id_cliente;
        }

        // 2. Handle Vehicle Creation if needed
        let finalVehicleId = data.vehicle.id_veiculo;
        if (!finalVehicleId) {
             // Check if vehicle exists by Plate to avoid duplicates
             const existingVehicle = await tx.veiculo.findUnique({
                 where: { placa: data.vehicle.placa }
             });

             if (existingVehicle) {
                 // If vehicle exists, update owner to new client and use it
                 if (existingVehicle.id_cliente !== finalClientId) {
                     await tx.veiculo.update({
                         where: { id_veiculo: existingVehicle.id_veiculo },
                         data: { id_cliente: finalClientId }
                     });
                 }
                 finalVehicleId = existingVehicle.id_veiculo;
             } else {
                 const newVehicle = await tx.veiculo.create({
                     data: {
                         id_cliente: finalClientId,
                         placa: data.vehicle.placa,
                         marca: data.vehicle.marca,
                         modelo: data.vehicle.modelo,
                         cor: data.vehicle.cor || 'BRANCO',
                         ano_modelo: data.vehicle.ano,
                         combustivel: data.vehicle.combustivel || 'FLEX'
                     }
                 });
                 finalVehicleId = newVehicle.id_veiculo;
             }
        }

        // 3. Create OS
        const os = await tx.ordemDeServico.create({
            data: {
                id_cliente: finalClientId,
                id_veiculo: finalVehicleId,
                id_funcionario: Number(data.os.id_funcionario),
                km_entrada: Number(data.os.km_entrada),
                defeito_relatado: data.os.defeito_relatado,
                status: 'ABERTA',
                valor_total_cliente: 0,
                valor_mao_de_obra: 0,
                parcelas: 1 // Default
            }
        });

        await auditRepo.create({
            tabela: 'ordem_de_servico',
            registro_id: os.id_os,
            acao: 'CREATE',
            valor_novo: os
        });

        return os;
    });
  }

  async findAll() {
    return await prisma.ordemDeServico.findMany({
      where: { deleted_at: null },
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } }
          }
        },
        veiculo: true,
        funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } },
        itens_os: { where: { deleted_at: null } },
        fechamento_financeiro: true,
        servicos_mao_de_obra: {
            where: { deleted_at: null },
            include: { funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } } }
        }
      }
    });
  }

  async findById(id: number) {
    return await prisma.ordemDeServico.findUnique({
      where: { id_os: id },
      include: {
        cliente: {
          include: {
            pessoa_fisica: { include: { pessoa: true } },
            pessoa_juridica: { include: { pessoa: true } }
          }
        },
        veiculo: true,
        funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } },
        itens_os: {
          where: { deleted_at: null },
          include: {
            pagamentos_peca: true,
            pecas_estoque: true
          }
        },
        fechamento_financeiro: true,
        pagamentos_cliente: true,
        servicos_mao_de_obra: {
            where: { deleted_at: null },
            include: { funcionario: { include: { pessoa_fisica: { include: { pessoa: true } } } } }
        }
      }
    });
  }

  async findByVehicleId(vehicleId: number) {
    return await prisma.ordemDeServico.findMany({
      where: { id_veiculo: vehicleId, deleted_at: null },
      orderBy: { dt_abertura: 'desc' },
      select: {
        id_os: true,
        dt_abertura: true,
        dt_entrega: true,
        km_entrada: true,
        status: true,
        defeito_relatado: true,
        diagnostico: true,
        obs_final: true,
        valor_total_cliente: true,
        valor_mao_de_obra: true,
        valor_pecas: true,
        funcionario: {
          select: {
            id_funcionario: true,
            pessoa_fisica: { select: { pessoa: { select: { nome: true } } } }
          }
        },
        itens_os: {
          select: {
            id_iten: true,
            descricao: true,
            quantidade: true,
            valor_venda: true,
            valor_total: true
          }
        },
        servicos_mao_de_obra: {
            select: {
                id_servico_mao_de_obra: true,
                valor: true,
                descricao: true,
                funcionario: {
                  select: {
                    id_funcionario: true,
                    pessoa_fisica: { select: { pessoa: { select: { nome: true } } } }
                  }
                }
            }
        },
        pagamentos_cliente: true
      }
    });
  }

  async update(id: number, data: Prisma.OrdemDeServicoUpdateInput) {
    const current = await this.findById(id);
    if (!current) throw new Error('OS not found');
    
    // Check lock if finalized or paid (unless it's a specific internal update we might allow, but user said disable for users)
    // Assuming this repo usage is for general updates.
    // If status is FINALIZADA or PAGA, prevent update?
    // "Implementar uma trava onde, após a OS ser marcada como "Finalizada" ou "Paga", o salvamento automático e as edições sejam desabilitados"
    // This is best enforced in Controller or Service, but Repo is the last line of defense.
    // However, sometimes we need to update status FROM Finalizada TO Something else (Reopen).
    // So assume the Caller handles logic, or we check if data DOES NOT contain status change.
    
    const updated = await prisma.ordemDeServico.update({
      where: { id_os: id },
      data,
    });

    await auditRepo.create({
        tabela: 'ordem_de_servico',
        registro_id: id,
        acao: 'UPDATE',
        valor_antigo: current,
        valor_novo: updated
    });

    return updated;
  }

  async delete(id: number) {
    // Soft Delete
    const current = await this.findById(id);
    if (!current) throw new Error('OS not found');

    const updated = await prisma.ordemDeServico.update({
      where: { id_os: id },
      data: { deleted_at: new Date() }
    });
    
    await auditRepo.create({
        tabela: 'ordem_de_servico',
        registro_id: id,
        acao: 'SOFT_DELETE',
        valor_antigo: current
    });
    
    return updated;
  }

  // Recalculates the total values for the OS based on active items and labor
  async recalculateTotals(id_os: number) {
    const items = await prisma.itensOs.aggregate({
        where: { id_os, deleted_at: null },
        _sum: { valor_total: true }
    });
    
    const labor = await prisma.servicoMaoDeObra.aggregate({
        where: { id_os, deleted_at: null },
        _sum: { valor: true }
    });

    const valor_pecas = items._sum?.valor_total || new Prisma.Decimal(0);
    const valor_mao_de_obra = labor._sum?.valor || new Prisma.Decimal(0);
    
    // Ensure accurate decimal addition
    const valor_total_cliente = new Prisma.Decimal(valor_pecas).plus(new Prisma.Decimal(valor_mao_de_obra));

    await prisma.ordemDeServico.update({
        where: { id_os },
        data: {
            valor_pecas,
            valor_mao_de_obra,
            valor_total_cliente
        }
    });

    return { valor_pecas, valor_mao_de_obra, valor_total_cliente };
  }
}
