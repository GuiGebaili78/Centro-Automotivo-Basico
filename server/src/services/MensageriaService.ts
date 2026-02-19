import puppeteer from "puppeteer";
import { NotificationService } from "./NotificationService.js";
import { format } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MensageriaService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  private getStatusLabel(status: string) {
    if (!status) return "N/A";
    return status.toUpperCase();
  }

  private async getConfiguration() {
    return await prisma.configuracao.findFirst();
  }

  private async generateHtml(os: any): Promise<string> {
    const config = await this.getConfiguration();
    const isBudget = ["AGENDAMENTO", "ORCAMENTO", "ABERTA"].includes(
      os.status || "",
    );

    const dataAbertura = os.created_at
      ? format(new Date(os.created_at), "dd/MM/yyyy HH:mm")
      : "-";

    const totalPecas =
      os.itens_os?.reduce(
        (acc: number, item: any) => acc + Number(item.valor_total || 0),
        0,
      ) || 0;
    const totalServicos =
      os.servicos_mao_de_obra?.reduce(
        (acc: number, item: any) => acc + Number(item.valor || 0),
        0,
      ) || 0;
    const totalGeral = totalPecas + totalServicos;

    const logoHtml = config?.logoUrl
      ? `<img src="${process.env.API_URL || "http://localhost:3000"}${config.logoUrl}" style="max-height: 60px; margin-bottom: 10px;" />`
      : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 15px; }
          .header h1 { margin: 5px 0; font-size: 20px; text-transform: uppercase; }
          .company-info { font-size: 10px; color: #555; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; background: #eee; padding: 5px; margin-bottom: 5px; border-left: 4px solid #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #f9f9f9; font-weight: bold; font-size: 11px; }
          .totals { text-align: right; margin-top: 20px; font-size: 14px; border-top: 2px solid #eee; padding-top: 10px; }
          .watermark {
            color: red;
            border: 2px solid red;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin: 20px 0;
            background: #fff0f0;
          }
          .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHtml}
          <h1>${config?.nomeFantasia || "Centro Automotivo"}</h1>
          <div class="company-info">
             <strong>${config?.razaoSocial || ""}</strong><br/>
             CNPJ: ${config?.cnpj || "-"} 
             ${config?.inscricaoEstadual ? ` • IE: ${config.inscricaoEstadual}` : ""} <br/>
             ${config?.endereco || "Endereço não configurado"} <br/>
             Tel: ${config?.telefone || "-"} • Email: ${config?.email || "-"}
          </div>
        </div>

        <div style="text-align: right; margin-bottom: 20px;">
           <h2 style="margin: 0;">OS #${os.id_os}</h2>
           <span style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ${this.getStatusLabel(os.status)}
           </span>
        </div>

        ${
          isBudget
            ? `<div class="watermark">DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO</div>`
            : ""
        }

        <div class="info-grid">
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px; font-size: 13px;">DADOS DO CLIENTE</div>
            Nome: <strong>${os.cliente?.pessoa?.nome || os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.pessoa?.nome || "Consumidor"}</strong><br>
            CPF/CNPJ: ${os.cliente?.pessoa?.cpf || os.cliente?.pessoa?.cnpj || os.cliente?.pessoa_fisica?.pessoa?.cnpj || "-"}<br>
            Telefone: ${os.cliente?.pessoa?.telefone || os.cliente?.telefone_1 || "-"}<br>
            Endereço: ${os.cliente?.logradouro ? `${os.cliente.logradouro}, ${os.cliente.nr_logradouro} - ${os.cliente.cidade}/${os.cliente.estado}` : "-"}
          </div>
          <div style="flex: 1; text-align: right; padding-left: 20px;">
             <div style="font-weight: bold; margin-bottom: 5px; font-size: 13px;">DADOS DO VEÍCULO</div>
             Veículo: <strong>${os.veiculo?.modelo || "-"}</strong><br>
             Placa: <strong>${os.veiculo?.placa || "-"}</strong> • Km: ${os.km_entrada || "-"}<br>
             Marca: ${os.veiculo?.marca || "-"} • Cor: ${os.veiculo?.cor || "-"}
          </div>
        </div>

        <div class="section">
          <div class="section-title">RELATO DO DEFEITO / SERVIÇO SOLICITADO</div>
          <div style="padding: 10px; background: #fafafa; border: 1px solid #eee; min-height: 40px;">
             ${os.defeito_relatado || "Não informado."}
          </div>
        </div>

        <div class="section">
          <div class="section-title">PEÇAS E PRODUTOS</div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th style="width: 50px; text-align: center;">Qtd</th>
                <th style="width: 80px; text-align: right;">Unit.</th>
                <th style="width: 80px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${
                os.itens_os?.length
                  ? os.itens_os
                      .map(
                        (item: any) => `
                  <tr>
                    <td>${
                      item.descricao ||
                      (item.pecas_estoque ? item.pecas_estoque.nome : "-")
                    }</td>
                    <td style="text-align: center;">${item.quantidade}</td>
                    <td style="text-align: right;">R$ ${Number(item.valor_venda || 0).toFixed(2)}</td>
                    <td style="text-align: right;">R$ ${Number(item.valor_total || 0).toFixed(2)}</td>
                  </tr>
                `,
                      )
                      .join("")
                  : '<tr><td colspan="4" style="text-align: center; color: #999;">Nenhum item utilizado.</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">SERVIÇOS (MÃO DE OBRA)</div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Técnico Responsável</th>
                <th style="width: 80px; text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                os.servicos_mao_de_obra?.length
                  ? os.servicos_mao_de_obra
                      .map(
                        (svc: any) => `
                  <tr>
                    <td>${svc.descricao || "Serviço"}</td>
                    <td>${svc.funcionario?.pessoa_fisica?.pessoa?.nome || "-"}</td>
                    <td style="text-align: right;">R$ ${Number(svc.valor || 0).toFixed(2)}</td>
                  </tr>
                `,
                      )
                      .join("")
                  : '<tr><td colspan="3" style="text-align: center; color: #999;">Nenhum serviço lançado.</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="totals">
          <table style="width: 250px; margin-left: auto;">
             <tr>
                <td style="border: none; text-align: right;">Total Peças:</td>
                <td style="border: none; text-align: right; font-weight: bold;">R$ ${totalPecas.toFixed(2)}</td>
             </tr>
             <tr>
                <td style="border: none; text-align: right;">Total Serviços:</td>
                <td style="border: none; text-align: right; font-weight: bold;">R$ ${totalServicos.toFixed(2)}</td>
             </tr>
             <tr style="border-top: 2px solid #333;">
                <td style="border: none; text-align: right; font-size: 16px; font-weight: bold; padding-top: 10px;">TOTAL GERAL:</td>
                <td style="border: none; text-align: right; font-size: 16px; font-weight: bold; padding-top: 10px;">R$ ${totalGeral.toFixed(2)}</td>
             </tr>
          </table>
        </div>

        ${
          isBudget
            ? `<div class="watermark">DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO</div>`
            : ""
        }

        <div style="margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid;">
            <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px;">
                <div style="font-weight: bold;">${os.cliente?.pessoa?.nome || "Cliente"}</div>
                <div style="font-size: 10px; color: #777;">Assinatura do Cliente</div>
            </div>
            <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px;">
                <div style="font-weight: bold;">${config?.nomeFantasia || "Centro Automotivo"}</div>
                <div style="font-size: 10px; color: #777;">Responsável Técnico</div>
            </div>
        </div>

        <div class="footer">
          Documento gerado em ${format(new Date(), "dd/MM/yyyy HH:mm:ss")} pelo Sistema
        </div>
      </body>
      </html>
    `;
  }

  async gerarPdfOs(osData: any): Promise<Buffer> {
    const html = await this.generateHtml(osData);

    // Launch puppeteer with resilience args
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px",
        },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  async enviarEmail(to: string, osData: any, pdfBuffer: Buffer) {
    try {
      if (!to) {
        console.log(`[Mensageria] Email ignorado: Destinatário não informado.`);
        return;
      }

      // Mock check for credentials (in real app, check env vars or config)
      if (!process.env.EMAIL_USER && !process.env.RESEND_API_KEY) {
        console.warn(
          "[Mensageria] Credentials not configured. Adding fake delay to simulate success.",
        );
        return;
      }

      const subject = `Ordem de Serviço #${osData.id_os} - ${osData.cliente?.pessoa?.nome || "Cliente"}`;
      const html = `
          <p>Olá,</p>
          <p>Segue em anexo a Ordem de Serviço #${osData.id_os}.</p>
          <p>Atenciosamente,<br>Centro Automotivo</p>
        `;

      await this.notificationService.sendEmail(to, subject, html, [
        {
          filename: `OS-${osData.id_os}.pdf`,
          content: pdfBuffer,
        },
      ]);
      console.log(`[Mensageria] Email enviado com sucesso para ${to}`);
    } catch (error) {
      console.error(
        `[Mensageria] Erro ao enviar email (não bloqueante):`,
        error,
      );
      // Do not throw, so the client receives 200 OK for the PDF generation
    }
  }

  async enviarTelegram(chatId: string, osData: any, pdfBuffer: Buffer) {
    try {
      if (!chatId) return;

      const message = `Ordem de Serviço #${osData.id_os} - ${osData.cliente?.pessoa?.nome || "Cliente"}`;
      await this.notificationService.sendTelegram(
        chatId,
        message,
        pdfBuffer,
        `OS-${osData.id_os}.pdf`,
      );
      console.log(`[Mensageria] Telegram enviado com sucesso para ${chatId}`);
    } catch (error) {
      console.error(
        `[Mensageria] Erro ao enviar Telegram (não bloqueante):`,
        error,
      );
      // Do not throw
    }
  }
}
