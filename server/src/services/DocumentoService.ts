import { NotificationService } from "./NotificationService.js";
import { prisma } from "../prisma.js";

const notificationService = new NotificationService();
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
// @ts-ignore
import PdfPrinter from "pdfmake";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define fonts
const fonts = {
  Roboto: {
    normal: path.join(
      __dirname,
      "../../node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf",
    ),
    bold: path.join(
      __dirname,
      "../../node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf",
    ),
    italics: path.join(
      __dirname,
      "../../node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf",
    ),
    bolditalics: path.join(
      __dirname,
      "../../node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
    ),
  },
};

const formatDoc = (doc: string) => {
  if (!doc) return "";
  const cleaned = doc.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (cleaned.length === 14) {
    return cleaned.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return doc;
};

// Masking Helpers
const maskPhone = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  // (11) 98888-1234 -> (11) 9****-1234
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2****-$4");
  }
  // (11) 8888-1234 -> (11) ****-1234
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) ****-$3");
  }
  return phone;
};

const maskEmail = (email: string) => {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const maskedUser =
    user.length > 3 ? user.substring(0, 3) + "***" : user + "***";
  return `${maskedUser}@${domain}`;
};

const formatPhone = (phone: string) => {
  // Keep original formatter for internal use if needed,
  // but we will use maskPhone for the PDF output where requested.
  // Or just replace this function?
  // The requirement is "Implement data masking".
  // I'll use `maskPhone` in the PDF generation logic.
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
};

export class DocumentoService {
  async generatePdf(osId: number): Promise<Buffer> {
    try {
      console.log(`[PDF] Iniciando geração de PDF para OS Nº ${osId}`);

      const os = await prisma.ordemDeServico.findUnique({
        where: { id_os: osId },
        include: {
          cliente: {
            include: {
              pessoa_fisica: { include: { pessoa: true } },
              pessoa_juridica: true,
            },
          },
          veiculo: true,
          itens_os: true,
          servicos_mao_de_obra: {
            where: { deleted_at: null },
            include: {
              funcionario: {
                include: { pessoa_fisica: { include: { pessoa: true } } },
              },
            },
          },
        },
      });

      if (!os) throw new Error("OS não encontrada");

      const config = await prisma.configuracao.findFirst();

      // Prepare Data
      const clienteNome =
        os.cliente.pessoa_fisica?.pessoa.nome ||
        os.cliente.pessoa_juridica?.nome_fantasia ||
        "Cliente não identificado";
      const clienteDoc = formatDoc(
        os.cliente.pessoa_fisica?.cpf || os.cliente.pessoa_juridica?.cnpj || "",
      );
      const veiculoDesc = `${os.veiculo.modelo} - ${os.veiculo.placa}`;

      const totalPecas = os.itens_os.reduce(
        (acc, item) => acc + Number(item.valor_total),
        0,
      );
      const totalMaoDeObra = os.servicos_mao_de_obra.reduce(
        (acc, serv) => acc + Number(serv.valor),
        0,
      );
      const totalGeral = totalPecas + totalMaoDeObra;

      const isOrcamento =
        os.status !== "FINALIZADA" && os.status !== "PAGA_CLIENTE";

      // Logo Logic
      let logoImage = null;
      if (config?.logoUrl) {
        const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
        const logoFilename = path.basename(config.logoUrl);
        const logoPath = path.join(uploadsDir, logoFilename);

        console.log("[PDF] Tentando carregar logo:", {
          logoUrl: config.logoUrl,
          logoFilename,
          logoPath,
          exists: fs.existsSync(logoPath),
        });

        if (fs.existsSync(logoPath)) {
          logoImage = logoPath;
        } else {
          console.warn("[PDF] Logo não encontrado no caminho:", logoPath);
        }
      } else {
        console.log("[PDF] Nenhum logo configurado");
      }

      // Applied Masking
      const clienteTelefone = maskPhone(os.cliente.telefone_1 || "");
      const clienteEmail = maskEmail(os.cliente.email || "");

      const docDefinition: any = {
        defaultStyle: {
          font: "Roboto",
          fontSize: 10,
        },
        footer: function (currentPage: number, pageCount: number) {
          return {
            text: `Página ${currentPage} de ${pageCount} | Documento gerado automaticamente pelo Sistema. Este documento não possui valor fiscal.`,
            alignment: "center",
            fontSize: 8,
            color: "gray",
            margin: [0, 10, 0, 0],
          };
        },
        content: [
          // HEADER
          {
            columns: [
              logoImage
                ? { image: logoImage, width: 60 }
                : { text: "OFICINA", fontSize: 20, bold: true },
              {
                stack: [
                  {
                    text: config?.nomeFantasia || "Centro Automotivo",
                    fontSize: 16,
                    bold: true,
                  },
                  { text: config?.razaoSocial || "", fontSize: 10 },
                  {
                    text: `${config?.endereco || ""} - ${config?.telefone || ""}`,
                    fontSize: 9,
                  },
                  { text: config?.email || "", fontSize: 9 },
                ],
                margin: [10, 0, 0, 0],
              },
              {
                stack: [
                  {
                    text: isOrcamento ? "ORÇAMENTO" : "ORDEM DE SERVIÇO",
                    fontSize: 14,
                    bold: true,
                    alignment: "right",
                    color: isOrcamento ? "red" : "black",
                  },
                  {
                    text: `Nº ${os.id_os.toString().padStart(6, "0")}`,
                    fontSize: 12,
                    bold: true,
                    alignment: "right",
                  },
                  {
                    text: format(new Date(), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    }),
                    alignment: "right",
                    fontSize: 9,
                  },
                ],
              },
            ],
            margin: [0, 0, 0, 20],
          },

          // LINE
          {
            canvas: [
              { type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 },
            ],
          },
          { text: " ", fontSize: 5 },

          // CLIENT & VEHICLE INFO
          {
            columns: [
              {
                width: "50%",
                stack: [
                  {
                    text: "DADOS DO CLIENTE",
                    bold: true,
                    fontSize: 9,
                    margin: [0, 5, 0, 2],
                  },
                  { text: `Nome: ${clienteNome}` },
                  { text: `CPF/CNPJ: ${clienteDoc}` },
                  { text: `Telefone: ${clienteTelefone}` },
                  { text: `E-mail: ${clienteEmail}` },
                ],
              },
              {
                width: "50%",
                stack: [
                  {
                    text: "DADOS DO VEÍCULO",
                    bold: true,
                    fontSize: 9,
                    margin: [0, 5, 0, 2],
                  },
                  { text: `Veículo: ${veiculoDesc}` },
                  { text: `Cor: ${os.veiculo.cor}` },
                  { text: `KM: ${os.km_entrada}` },
                ],
              },
            ],
            margin: [0, 0, 0, 10],
          },

          // SERVICES TABLE
          {
            text: "SERVIÇOS (MÃO DE OBRA)",
            bold: true,
            fontSize: 11,
            margin: [0, 10, 0, 5],
          },
          {
            table: {
              headerRows: 1,
              widths: ["*", "auto", "auto"],
              body: [
                [
                  { text: "Descrição", style: "tableHeader" },
                  { text: "Mecânico", style: "tableHeader" },
                  { text: "Valor", style: "tableHeader" },
                ],
                ...os.servicos_mao_de_obra.map((s) => [
                  s.descricao || "Serviço",
                  s.funcionario?.pessoa_fisica?.pessoa.nome || "-",
                  {
                    text: `R$ ${Number(s.valor).toFixed(2)}`,
                    alignment: "right",
                  },
                ]),
              ],
            },
            layout: "lightHorizontalLines",
          },

          // PARTS TABLE
          {
            text: "PEÇAS E PRODUTOS",
            bold: true,
            fontSize: 11,
            margin: [0, 10, 0, 5],
          },
          {
            table: {
              headerRows: 1,
              widths: ["auto", "*", "auto", "auto", "auto"],
              body: [
                [
                  { text: "Qtd", style: "tableHeader" },
                  { text: "Descrição", style: "tableHeader" },
                  { text: "Cód.", style: "tableHeader" },
                  { text: "Unit.", style: "tableHeader" },
                  { text: "Total", style: "tableHeader" },
                ],
                ...os.itens_os.map((i) => [
                  i.quantidade,
                  i.descricao,
                  i.codigo_referencia || "-",
                  {
                    text: `R$ ${(Number(i.valor_total) / i.quantidade).toFixed(2)}`,
                    alignment: "right",
                  },
                  {
                    text: `R$ ${Number(i.valor_total).toFixed(2)}`,
                    alignment: "right",
                  },
                ]),
              ],
            },
            layout: "lightHorizontalLines",
          },

          // TOTALS
          {
            columns: [
              { width: "*", text: "" },
              {
                width: "auto",
                table: {
                  widths: [100, 80],
                  body: [
                    [
                      "Total Serviços:",
                      {
                        text: `R$ ${totalMaoDeObra.toFixed(2)}`,
                        alignment: "right",
                      },
                    ],
                    [
                      "Total Peças:",
                      {
                        text: `R$ ${totalPecas.toFixed(2)}`,
                        alignment: "right",
                      },
                    ],
                    [
                      { text: "TOTAL GERAL:", bold: true },
                      {
                        text: `R$ ${totalGeral.toFixed(2)}`,
                        bold: true,
                        alignment: "right",
                      },
                    ],
                  ],
                },
                layout: "noBorders",
                margin: [0, 20, 0, 0],
              },
            ],
          },

          // FOOTER NOTES (Body notes, separate from page footer)
          { text: "Observações:", bold: true, margin: [0, 20, 0, 2] },
          {
            text:
              os.obs_final || os.diagnostico || "Sem observações adicionais.",
            fontSize: 9,
            color: "gray",
          },

          // SIGNATURES
          {
            columns: [
              {
                stack: [
                  {
                    text: "___________________________________",
                    alignment: "center",
                  },
                  {
                    text: "Assinatura do Responsável",
                    alignment: "center",
                    fontSize: 8,
                  },
                ],
              },
              {
                stack: [
                  {
                    text: "___________________________________",
                    alignment: "center",
                  },
                  {
                    text: "Assinatura do Cliente",
                    alignment: "center",
                    fontSize: 8,
                  },
                ],
              },
            ],
            margin: [0, 50, 0, 0],
          },
        ],
        styles: {
          tableHeader: {
            bold: true,
            fontSize: 10,
            color: "black",
          },
        },
        watermark: isOrcamento
          ? {
              text: "ORÇAMENTO",
              color: "red",
              opacity: 0.1,
              bold: true,
              italics: false,
            }
          : undefined,
      };

      const printer = new (PdfPrinter as any)(fonts);
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        pdfDoc.on("data", (chunk: any) => chunks.push(chunk));
        pdfDoc.on("end", () => {
          console.log("[PDF] PDF gerado com sucesso");
          resolve(Buffer.concat(chunks));
        });
        pdfDoc.on("error", (err: any) => {
          console.error("[PDF] Erro no PDFKit:", err);
          reject(err);
        });
        pdfDoc.end();
      });
    } catch (error: any) {
      console.error("[PDF] Erro ao gerar PDF:", {
        message: error.message,
        stack: error.stack,
        osId,
      });
      throw error;
    }
  }

  async sendEmail(pdfBuffer: Buffer, email: string): Promise<void> {
    console.log(`[DocumentoService] Enviando e-mail para ${email}...`);
    await notificationService.sendEmail(
      email,
      "Seu Documento - Centro Automotivo",
      "<p>Segue em anexo o documento solicitado.</p>",
      [
        {
          filename: "documento.pdf",
          content: pdfBuffer,
        },
      ],
    );
  }

  async sendTelegram(pdfBuffer: Buffer, chatId: string): Promise<void> {
    console.log(
      `[DocumentoService] Enviando Telegram para chat_id ${chatId}...`,
    );
    await notificationService.sendTelegram(
      chatId,
      "Segue seu documento:",
      pdfBuffer,
      "documento.pdf",
    );
  }
}
