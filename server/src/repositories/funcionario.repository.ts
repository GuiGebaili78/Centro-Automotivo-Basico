import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { dayjs, TIMEZONE, getDayBoundsSP } from '../utils/date.js';

export class FuncionarioRepository {
  async create(data: Prisma.FuncionarioCreateInput) {
    if (data.cnpj_mei) {
      const existing = await prisma.funcionario.findFirst({
        where: { cnpj_mei: data.cnpj_mei }
      });
      if (existing) {
        throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
      }
    }

    let idPessoaFisica: number | undefined;
    if (data.pessoa_fisica?.connect?.id_pessoa_fisica) {
      idPessoaFisica = data.pessoa_fisica.connect.id_pessoa_fisica;
    } else if ((data as any).id_pessoa_fisica) {
      idPessoaFisica = (data as any).id_pessoa_fisica;
    }

    if (idPessoaFisica) {
      const currentPf = await prisma.pessoaFisica.findUnique({
        where: { id_pessoa_fisica: idPessoaFisica }
      });
      if (currentPf && currentPf.cpf) {
        const duplicateCpf = await prisma.pessoaFisica.findFirst({
          where: {
            cpf: currentPf.cpf,
            id_pessoa_fisica: { not: currentPf.id_pessoa_fisica }
          }
        });
        if (duplicateCpf) {
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }

    return await prisma.funcionario.create({
      data,
    });
  }

  async findAll() {
    return await prisma.funcionario.findMany({
        include: { pessoa_fisica: { include: { pessoa: true } } }
    });
  }

  async findById(id: number) {
    return await prisma.funcionario.findUnique({
      where: { id_funcionario: id },
      include: { pessoa_fisica: { include: { pessoa: true } } }
    });
  }

  async update(id: number, data: Prisma.FuncionarioUpdateInput) {
    if (data.cnpj_mei) {
      const cnpjValue = typeof data.cnpj_mei === "string" ? data.cnpj_mei : (data.cnpj_mei as any).set;
      if (cnpjValue) {
        const existing = await prisma.funcionario.findFirst({
          where: {
            cnpj_mei: cnpjValue,
            id_funcionario: { not: id }
          }
        });
        if (existing) {
          throw new Error("CPF/CNPJ/IE/Placa já cadastrado em outro registro.");
        }
      }
    }
    return await prisma.funcionario.update({
      where: { id_funcionario: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.funcionario.delete({
      where: { id_funcionario: id },
    });
  }

  // --- CONTROLE DE DIÁRIAS ---

  async registrarDiarias(
    id_funcionario: number,
    lote: Array<{ data_trabalho: string | Date; presente: boolean; valor_diaria: number }>
  ) {
    const resultados = [];
    const ignoradosDatas: string[] = [];

    for (const item of lote) {
      // 1. Converter e isolar a data no fuso de SP (garantindo que seja o meio-dia local para salvar apenas a "Data")
      const localDate = dayjs(item.data_trabalho).tz(TIMEZONE).startOf('day');
      // No Prisma com @db.Date, é bom enviar um Date em UTC que represente a meia noite.
      const dbDate = localDate.utc(true).toDate();

      // 2. Verificar imutabilidade financeira
      const existente = await prisma.registroDiaria.findUnique({
        where: {
          id_funcionario_data_trabalho: {
            id_funcionario,
            data_trabalho: dbDate,
          },
        },
      });

      if (existente && existente.pago) {
        // Bloqueio rigoroso: Não alterar se já estiver consolidado
        console.warn(`[Diárias] Tentativa ignorada de alterar diária já paga. Colaborador: ${id_funcionario}, Data: ${localDate.format('YYYY-MM-DD')}`);
        ignoradosDatas.push(localDate.format('DD/MM/YYYY'));
        continue;
      }

      // 3. Upsert
      const atualizado = await prisma.registroDiaria.upsert({
        where: {
          id_funcionario_data_trabalho: {
            id_funcionario,
            data_trabalho: dbDate,
          },
        },
        create: {
          id_funcionario,
          data_trabalho: dbDate,
          presente: item.presente,
          pago: false,
          valor_diaria: new Prisma.Decimal(item.valor_diaria),
        },
        update: {
          presente: item.presente,
          valor_diaria: new Prisma.Decimal(item.valor_diaria),
        },
      });

      resultados.push(atualizado);
    }

    if (ignoradosDatas.length > 0) {
        // Lançamos um erro para o Frontend interceptar e exibir o Toast, 
        // mas as demais já foram processadas no banco.
        throw new Error(`Algumas diárias não foram alteradas pois já constam como pagas (${ignoradosDatas.join(', ')}).`);
    }

    return resultados;
  }

  async listarDiarias(id_funcionario: number, inicioMes: string | Date, fimMes: string | Date) {
    const start = dayjs(inicioMes).tz(TIMEZONE).startOf('day').utc(true).toDate();
    const end = dayjs(fimMes).tz(TIMEZONE).endOf('day').utc(true).toDate();

    return await prisma.registroDiaria.findMany({
      where: {
        id_funcionario,
        data_trabalho: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { data_trabalho: 'asc' },
    });
  }

  async marcarDiariasComoPagas(id_funcionario: number, ids: number[]) {
    return await prisma.registroDiaria.updateMany({
      where: {
        id_funcionario,
        id_registro: { in: ids },
        pago: false, // Double check
      },
      data: { pago: true },
    });
  }
}
