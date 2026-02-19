import puppeteer from "puppeteer";
import { NotificationService } from "./NotificationService.js";
import { format } from "date-fns";

export class MensageriaService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  private getStatusLabel(status: string) {
    if (!status) return "N/A";
    return status.toUpperCase();
  }

  private generateHtml(os: any): string {
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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ccc; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; background: #eee; padding: 5px; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
          th { background: #f9f9f9; }
          .totals { text-align: right; margin-top: 20px; font-size: 14px; }
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
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #777; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Ordem de Serviço #${os.id_os}</h1>
          <p>Centro Automotivo</p>
        </div>

        ${
          isBudget
            ? `<div class="watermark">DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO</div>`
            : ""
        }

        <div class="info-grid">
          <div>
            <strong>Cliente:</strong> ${os.cliente?.pessoa?.nome || "Consumidor"}<br>
            <strong>CPF/CNPJ:</strong> ${os.cliente?.pessoa?.cpf_cnpj || "-"}<br>
            <strong>Telefone:</strong> ${os.cliente?.pessoa?.telefone || "-"}
          </div>
          <div style="text-align: right;">
            <strong>Data:</strong> ${dataAbertura}<br>
            <strong>Status:</strong> ${this.getStatusLabel(os.status)}<br>
            <strong>Veículo:</strong> ${os.veiculo?.modelo || "-"} (${os.veiculo?.placa || "-"})
          </div>
        </div>

        <div class="section">
          <div class="section-title">Peças e Produtos</div>
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
                    <td style="text-align: right;">R$ ${Number(item.valor_venda).toFixed(2)}</td>
                    <td style="text-align: right;">R$ ${Number(item.valor_total).toFixed(2)}</td>
                  </tr>
                `,
                      )
                      .join("")
                  : '<tr><td colspan="4" style="text-align: center;">Nenhum item</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Mão de Obra</div>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Funcionário</th>
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
                    <td style="text-align: right;">R$ ${Number(svc.valor).toFixed(2)}</td>
                  </tr>
                `,
                      )
                      .join("")
                  : '<tr><td colspan="3" style="text-align: center;">Nenhum serviço</td></tr>'
              }
            </tbody>
          </table>
        </div>

        <div class="totals">
          <p>Total Peças: R$ ${totalPecas.toFixed(2)}</p>
          <p>Total Serviços: R$ ${totalServicos.toFixed(2)}</p>
          <h3 style="margin: 5px 0;">TOTAL GERAL: R$ ${totalGeral.toFixed(2)}</h3>
        </div>

        ${
          isBudget
            ? `<div class="watermark">DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO</div>`
            : ""
        }

        <div class="footer">
          <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</p>
        </div>
      </body>
      </html>
    `;
  }

  async gerarPdfOs(osData: any): Promise<Buffer> {
    const html = this.generateHtml(osData);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Needed for some docker envs
    });
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

    await browser.close();
    return Buffer.from(pdfBuffer);
  }

  async enviarEmail(to: string, osData: any, pdfBuffer: Buffer) {
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
  }

  async enviarTelegram(chatId: string, osData: any, pdfBuffer: Buffer) {
    const message = `Ordem de Serviço #${osData.id_os} - ${osData.cliente?.pessoa?.nome || "Cliente"}`;
    await this.notificationService.sendTelegram(
      chatId,
      message,
      pdfBuffer,
      `OS-${osData.id_os}.pdf`,
    );
  }
}
