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

const maskDoc = (doc: string) => {
  if (!doc) return "";
  const cleaned = doc.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  }
  if (cleaned.length === 14) {
    return cleaned.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.***.***/$4-$5",
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

const formatPhone = (phone: string): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

const formatIE = (ie: string): string => {
  if (!ie) return "";
  const val = ie.toUpperCase();
  if (val.includes("ISENTO") || "ISENTO".startsWith(val) && val.length > 0) {
    return val;
  }
  const digits = val.replace(/[^0-9]/g, "");
  return digits.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
};

const formatCnpj = (cnpj: string): string => {
  if (!cnpj) return "";
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

export class DocumentoService {
  async generatePdf(osId: number): Promise<{ buffer: Buffer; filename: string }> {
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
          equipamento: true,
          itens_os: true,
          pagamentos_cliente: true,
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

      // Filename construction
      const clientNameRaw = os.cliente.pessoa_fisica?.pessoa.nome || os.cliente.pessoa_juridica?.nome_fantasia || os.cliente.pessoa_juridica?.razao_social || "Cliente";
      let itemDesc = "Documento";
      
      if (os.veiculo) {
        const marca = os.veiculo.marca || "";
        const modelo = os.veiculo.modelo || "";
        const cor = os.veiculo.cor || "";
        const placa = os.veiculo.placa || "";
        itemDesc = `${marca} ${modelo} ${cor} ${placa}`.trim();
      } else if (os.equipamento) {
        const peca = os.equipamento.nome_peca || "";
        const fabricante = os.equipamento.fabricante || "";
        const numeracao = os.equipamento.numeracao || "";
        itemDesc = `${peca} ${fabricante} ${numeracao}`.trim();
      }
      
      const isOrcamento = os.status !== "FINALIZADA" && os.status !== "PAGA_CLIENTE";
      const docType = isOrcamento ? "Orcamento" : "OS";
      const rawFilename = `${docType}_${os.id_os} - ${itemDesc} - ${clientNameRaw}`;
      const filename = rawFilename.replace(/[/\\?%*:|"<>\s]+/g, " ").trim() + ".pdf";

      const config = await prisma.configuracao.findFirst();

      // Prepare Data
      const clienteNome =
        os.cliente.pessoa_fisica?.pessoa.nome ||
        os.cliente.pessoa_juridica?.nome_fantasia ||
        "Cliente não identificado";
      const clienteDoc = maskDoc(
        os.cliente.pessoa_fisica?.cpf || os.cliente.pessoa_juridica?.cnpj || "",
      );
      const veiculoDesc = os.veiculo ? `${os.veiculo.modelo} - ${os.veiculo.placa}` : (os.equipamento ? `${os.equipamento.nome_peca}` : "Veículo/Peça Diversa");

      const totalPecas = os.itens_os
        .filter((item) => !item.is_interno)
        .reduce(
          (acc, item) => acc + Number(item.valor_total),
          0,
        );
      const totalMaoDeObra = os.servicos_mao_de_obra.reduce(
        (acc, serv) => acc + Number(serv.valor),
        0,
      );
      const totalGeral = totalPecas + totalMaoDeObra;

      const activePayments = os.pagamentos_cliente?.filter((p: any) => !p.deleted_at) || [];
      const totalPago = activePayments.reduce((acc, p) => acc + Number(p.valor), 0);
      const saldoRestante = totalGeral - totalPago;
      const isQuitada = totalPago >= totalGeral;

      // Logo Logic
      let logoImage = null;
      const logoBase = config?.logoImpressaoUrl ? config.logoImpressaoUrl : config?.logoUrl;
      if (logoBase) {
        const uploadsDir = path.resolve(__dirname, "..", "..", "uploads");
        const logoFilename = path.basename(logoBase);
        const logoPath = path.join(uploadsDir, logoFilename);

        console.log("[PDF] Tentando carregar logo:", {
          logoBase,
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
                  {
                    text: config?.razaoSocial || "",
                    fontSize: 10,
                  },
                  {
                    text: `CNPJ: ${config?.cnpj ? formatCnpj(config.cnpj) : "-"} ${config?.inscricaoEstadual ? ` | IE: ${formatIE(config.inscricaoEstadual)}` : ""}`,
                    fontSize: 9,
                  },
                  {
                    text: `${config?.endereco || ""} - Tel: ${config?.telefone ? formatPhone(config.telefone) : "-"}`,
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
                  os.veiculo
                    ? {
                        stack: [
                          { text: `Veículo: ${os.veiculo.marca || ""} ${os.veiculo.modelo || ""} - ${os.veiculo.cor || "N/A"}` },
                          { text: `Ano (Fab/Mod): ${os.veiculo.ano_fabricacao || "-"}/${os.veiculo.ano_modelo || "-"} | Placa: ${os.veiculo.placa}` },
                          { text: `KM: ${os.km_entrada || "-"} km | Combustível: ${os.veiculo.combustivel || "-"}` },
                        ]
                      }
                    : os.equipamento
                    ? {
                        stack: [
                          { text: `Peça: ${os.equipamento.nome_peca}` },
                          { text: `Fabricante: ${os.equipamento.fabricante || "-"}` },
                          { text: `Nº Série: ${os.equipamento.numeracao || "-"}` },
                        ]
                      }
                    : { text: "Nenhum veículo ou peça vinculado." },
                ],
              },
            ],
            margin: [0, 0, 0, 10],
          },

          // SERVICES TABLE
          {
            text: "SERVIÇOS EXECUTADOS (MÃO DE OBRA)",
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
                  s.descricao || s.funcionario?.cargo || s.funcionario?.especialidade || "Serviço Executado",
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
                ...os.itens_os
                  .filter((i) => !i.is_interno)
                  .map((i) => [
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

          // LINE
          {
            canvas: [
              { type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 },
            ],
            margin: [0, 10, 0, 10],
          },
          // PAYMENTS BLOCK
          {
            text: "INFORMAÇÕES DE PAGAMENTO",
            bold: true,
            fontSize: 9,
            margin: [0, 5, 0, 5],
          },
          {
            table: {
              widths: ["*", "auto", "auto"],
              body: [
                [
                  { text: "Forma de Pagamento", style: "tableHeader" },
                  { text: "Valor", style: "tableHeader" },
                  { text: "Data", style: "tableHeader" },
                ],
                ...(activePayments.length > 0
                  ? activePayments.map((p) => [
                      p.metodo_pagamento + (p.qtd_parcelas && p.qtd_parcelas > 1 ? ` (${p.qtd_parcelas}x)` : ""),
                      `R$ ${Number(p.valor).toFixed(2)}`,
                      format(new Date(p.data_pagamento), "dd/MM/yyyy"),
                    ])
                  : [["Nenhum pagamento registrado.", "", ""]]),
              ],
            },
            layout: "lightHorizontalLines",
          },
          {
            columns: [
              { text: `Total Pago: R$ ${totalPago.toFixed(2)}`, bold: true, fontSize: 9 },
              {
                text: isQuitada ? "OS QUITADA" : `Saldo Restante: R$ ${saldoRestante.toFixed(2)}`,
                bold: true,
                fontSize: 9,
                alignment: "right",
                color: isQuitada ? "green" : "red",
              },
            ],
            margin: [0, 5, 0, 10],
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
                    text: config?.nomeFantasia || "Responsável Técnico",
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
          // INSTITUTIONAL MESSAGE
          {
            text: "Agradecemos a preferência! Volte sempre!!",
            alignment: "center",
            bold: true,
            fontSize: 10,
            margin: [0, 20, 0, 0],
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
          resolve({ buffer: Buffer.concat(chunks), filename });
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

  async sendEmail(pdfBuffer: Buffer, email: string, filename: string = "documento.pdf"): Promise<void> {
    console.log(`[DocumentoService] Enviando e-mail para ${email}...`);
    await notificationService.sendEmail(
      email,
      "Seu Documento - Centro Automotivo",
      "<p>Segue em anexo o documento solicitado.</p>",
      [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    );
  }

  async sendTelegram(pdfBuffer: Buffer, chatId: string, filename: string = "documento.pdf"): Promise<void> {
    console.log(
      `[DocumentoService] Enviando Telegram para chat_id ${chatId}...`,
    );
    await notificationService.sendTelegram(
      chatId,
      "Segue seu documento:",
      pdfBuffer,
      filename,
    );
  }
}
