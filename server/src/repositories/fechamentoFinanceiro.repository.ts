import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

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
                        include: {
                            funcionario: {
                                include: {
                                    pessoa_fisica: {
                                        include: {
                                            pessoa: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } 
        }
    });
  }

  async findById(id: number) {
    return await prisma.fechamentoFinanceiro.findUnique({
      where: { id_fechamento_financeiro: id },
        include: { ordem_de_servico: true }
    });
  }

  async update(id: number, data: Prisma.FechamentoFinanceiroUpdateInput) {
    return await prisma.fechamentoFinanceiro.update({
      where: { id_fechamento_financeiro: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.fechamentoFinanceiro.delete({
      where: { id_fechamento_financeiro: id },
    });
  }
}
