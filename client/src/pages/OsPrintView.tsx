import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, STATIC_BASE } from "../services/api"; // Or useOrdemServico hook if available globally without layout
import { format } from "date-fns";
import { formatCurrency } from "../utils/formatCurrency";
import { formatPhone, formatIE } from "../utils/normalize";
import {
  ConfiguracaoService,
  type Configuracao,
} from "../services/ConfiguracaoService";

export const OsPrintView = () => {
  const { id } = useParams();
  const [os, setOs] = useState<any>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/ordem-de-servico/${id}`).then((res) => res.data),
      ConfiguracaoService.get(),
    ])
      .then(([osData, configData]) => {
        setOs(osData);
        setConfig(configData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (os && config && !loading) {
      const originalTitle = document.title;
      
      const clientNameRaw = os.cliente?.pessoa?.nome || os.cliente?.pessoa_fisica?.pessoa?.nome || os.cliente?.pessoa_juridica?.nome_fantasia || os.cliente?.pessoa_juridica?.razao_social || "Cliente";
      let itemDesc = "";
      
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
      
      const isOrcamentoPrint = ["AGENDAMENTO", "ORCAMENTO", "ABERTA"].includes(os.status);
      const docType = isOrcamentoPrint ? "Orcamento" : "OS";
      const rawFilename = `${docType}_${os.id_os} - ${itemDesc} - ${clientNameRaw}`;
      const filename = rawFilename.replace(/[/\\?%*:|"<>\s]+/g, " ").trim();
      
      document.title = filename;

      const timer = setTimeout(() => {
        window.print();
      }, 500);

      return () => {
        document.title = originalTitle;
        clearTimeout(timer);
      };
    }
  }, [os, config, loading]);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  if (!os) return <div className="p-8 text-center">OS não encontrada.</div>;

  const isBudget = ["AGENDAMENTO", "ORCAMENTO", "ABERTA"].includes(os.status);

  // Totals Calculation (if not present in OS object directly)
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

  const logoBase = config?.logoImpressaoUrl ? config.logoImpressaoUrl : config?.logoUrl;

  const activePayments = os.pagamentos_cliente?.filter((p: any) => !p.deleted_at) || [];
  const totalPago = activePayments.reduce((acc: number, p: any) => acc + Number(p.valor), 0);
  const saldoRestante = totalGeral - totalPago;
  const isQuitada = totalPago >= totalGeral;

  return (
    <div className="min-h-screen bg-white p-8 print-container print:p-0 print:m-0 print:w-full print:absolute print:top-0 print:left-0 text-xs md:text-sm">
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container {
            margin: 1cm !important;
            padding: 0 !important;
            width: auto !important;
            position: static !important;
          }
          /* Tighten spacing specifically to force exactly 1 via */
          .mb-6 { margin-bottom: 0.5rem !important; }
          .mb-4 { margin-bottom: 0.25rem !important; }
          .mb-3 { margin-bottom: 0.25rem !important; }
          .mt-6 { margin-top: 0.75rem !important; }
          .p-3 { padding: 0.5rem !important; }
          .p-2.5 { padding: 0.5rem !important; }
          table { width: 100% !important; }
          tr { page-break-inside: avoid !important; }
          td, th { padding-top: 2px !important; padding-bottom: 2px !important; }
        }
      `}</style>
      {/* Print Controls - Hidden when printing */}
      <div className="mb-8 flex gap-4 print:hidden"></div>
      {/* Header with Config Data */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          {logoBase ? (
            <img
              src={`${STATIC_BASE}${logoBase}`}
              alt="Logo"
              className="max-h-20 w-auto object-contain"
            />
          ) : null}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-black uppercase leading-tight">
              {config?.nomeFantasia || "Centro Automotivo"}
            </h1>
            <p className="text-sm font-bold leading-tight">{config?.razaoSocial}</p>
            <p className="text-xs leading-normal">
              CNPJ: {config?.cnpj ? config.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") : "-"}
              {config?.inscricaoEstadual &&
                ` • IE: ${formatIE(config.inscricaoEstadual)}`}
            </p>
            <p className="text-xs">
              {config?.endereco || "Endereço não configurado"}
            </p>
            <p className="text-xs">Tel: {config?.telefone ? formatPhone(config.telefone) : "-"}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-black text-neutral-800">
            OS #{os.id_os}
          </h2>
          <p className="font-bold text-sm uppercase mt-1">{os.status}</p>
          <p className="text-xs text-neutral-500">
            {format(
              new Date(os.dt_abertura || os.created_at || new Date()),
              "dd/MM/yyyy HH:mm",
            )}
          </p>
        </div>
      </div>

      {isBudget && (
        <div className="border-2 border-red-500 bg-red-50 text-red-600 font-bold text-center p-2 mb-6 uppercase text-sm print:border-black print:text-neutral-800 print:bg-transparent">
          DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="border border-neutral-300 p-3 rounded-lg print:border-black">
          <h3 className="font-bold uppercase border-b border-neutral-200 mb-2 pb-1 print:border-black">
            Cliente
          </h3>
          <p>
            <span className="font-bold">Nome:</span>{" "}
            {os.cliente?.pessoa?.nome ||
              os.cliente?.pessoa_fisica?.pessoa?.nome ||
              os.cliente?.pessoa_juridica?.pessoa?.nome}
          </p>
          <p>
            <span className="font-bold">CPF/CNPJ:</span>{" "}
            {os.cliente?.pessoa?.cpf || os.cliente?.pessoa?.cnpj || "-"}
          </p>
          <p>
            <span className="font-bold">Telefone:</span>{" "}
            {os.cliente?.pessoa?.telefone || os.cliente?.telefone_1 ? formatPhone(os.cliente.pessoa?.telefone || os.cliente.telefone_1 || "") : "-"}
          </p>
          <p>
            <span className="font-bold">Endereço:</span>{" "}
            {os.cliente?.logradouro}, {os.cliente?.nr_logradouro} -{" "}
            {os.cliente?.cidade}/{os.cliente?.estado}
          </p>
        </div>
        <div className="border border-neutral-300 p-3 rounded-lg print:border-black">
          <h3 className="font-bold uppercase border-b border-neutral-200 mb-2 pb-1 print:border-black">
            {os.veiculo ? "Veículo" : "Peça / Equipamento"}
          </h3>
          {os.veiculo ? (
            <div className="flex flex-col gap-0.5">
              <p>
                <span className="font-bold">Veículo:</span> {os.veiculo.marca} / {os.veiculo.modelo} / {os.veiculo.cor}
              </p>
              <p>
                <span className="font-bold">Ano (Fab/Mod):</span> {os.veiculo.ano_fabricacao || "-"}/{os.veiculo.ano_modelo || "-"} | <span className="font-bold">Placa:</span> {os.veiculo.placa}
              </p>
              <p>
                <span className="font-bold">KM:</span> {os.km_entrada || "-"} km | <span className="font-bold">Combustível:</span> {os.veiculo.combustivel || "-"}
              </p>
            </div>
          ) : os.equipamento ? (
            <div className="flex flex-col gap-0.5">
              <p>
                <span className="font-bold">Peça:</span> {os.equipamento.nome_peca}
              </p>
              <p>
                <span className="font-bold">Fabricante:</span> {os.equipamento.fabricante || "-"}
              </p>
              <p>
                <span className="font-bold">Nº Série:</span> {os.equipamento.numeracao || "-"}
              </p>
            </div>
          ) : (
             <p className="italic text-neutral-400">Nenhum veículo ou peça vinculado.</p>
          )}
        </div>
      </div>

      {/* Defeito / Diagnostico */}
      <div className="mb-3 text-xs">
        <div className="mb-2">
          <h3 className="font-bold uppercase bg-neutral-100 p-1 mb-1 print:bg-transparent print:border-b print:border-black">
            Defeito Relatado
          </h3>
          <p className="p-2 border border-neutral-200 rounded print:border-black min-h-[30px] py-1">
            {os.defeito_relatado || "-"}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="mb-3">
        <h3 className="font-bold uppercase bg-neutral-800 text-white p-1.5 mb-0 print:bg-transparent print:text-neutral-800 print:border-b-2 print:border-black">
          Peças e Produtos
        </h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100 print:bg-transparent border-b border-black">
              <th className="text-left py-1 px-2">Descrição</th>
              <th className="text-center py-1 px-2 w-[80px]">Qtd</th>
              <th className="text-right py-1 px-2 w-[100px]">Unit.</th>
              <th className="text-right py-1 px-2 w-[100px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {os.itens_os?.map((item: any, idx: number) => (
              <tr
                key={idx}
                className="border-b border-neutral-200 print:border-neutral-400"
              >
                <td className="py-0.5 px-2">
                  {item.descricao || item.pecas_estoque?.nome}
                </td>
                <td className="text-center py-0.5 px-2">{item.quantidade}</td>
                <td className="text-right py-0.5 px-2">
                  {formatCurrency(Number(item.valor_venda))}
                </td>
                <td className="text-right py-0.5 px-2 font-bold">
                  {formatCurrency(Number(item.valor_total))}
                </td>
              </tr>
            ))}
            {(!os.itens_os || os.itens_os.length === 0) && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center italic text-neutral-400"
                >
                  Nenhuma peça utilizada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Services */}
      <div className="mb-3">
        <h3 className="font-bold uppercase bg-neutral-800 text-white p-1.5 mb-0 print:bg-transparent print:text-neutral-800 print:border-b-2 print:border-black">
          Serviços Executados (Mão de Obra)
        </h3>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-100 print:bg-transparent border-b border-black">
              <th className="text-left py-1 px-2">Descrição</th>
              <th className="text-left py-1 px-2">Profissional</th>
              <th className="text-right py-1 px-2 w-[100px]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {os.servicos_mao_de_obra?.map((svc: any, idx: number) => (
              <tr
                key={idx}
                className="border-b border-neutral-200 print:border-neutral-400"
              >
                <td className="py-0.5 px-2">
                  {svc.descricao || svc.funcionario?.cargo || svc.funcionario?.cargo_funcao || svc.funcionario?.especialidade || svc.funcionario?.tipo_servico || "Serviço Executado"}
                </td>
                <td className="py-0.5 px-2">
                  {svc.funcionario?.pessoa_fisica?.pessoa?.nome || "-"}
                </td>
                <td className="text-right py-0.5 px-2 font-bold">
                  {formatCurrency(Number(svc.valor))}
                </td>
              </tr>
            ))}
            {(!os.servicos_mao_de_obra ||
              os.servicos_mao_de_obra.length === 0) && (
              <tr>
                <td
                  colSpan={3}
                  className="p-4 text-center italic text-neutral-400"
                >
                  Nenhum serviço lançado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-[300px] text-xs">
          <div className="flex justify-between py-0.5 border-b border-neutral-200">
            <span>Total Peças:</span>
            <span>{formatCurrency(totalPecas)}</span>
          </div>
          <div className="flex justify-between py-0.5 border-b border-neutral-200">
            <span>Total Serviços:</span>
            <span>{formatCurrency(totalServicos)}</span>
          </div>
          <div className="flex justify-between py-1 border-t-2 border-black font-black text-base mt-1">
            <span>TOTAL GERAL:</span>
            <span>{formatCurrency(totalGeral)}</span>
          </div>
        </div>
      </div>

      {/* Informações de Pagamento */}
      <div className="border border-neutral-300 rounded-lg p-2.5 mb-4 print:border-black text-[11px] leading-relaxed">
        <h4 className="font-bold uppercase border-b border-neutral-200 pb-0.5 mb-1.5 print:border-black text-xs">
          Informações de Pagamento
        </h4>
        {activePayments.length === 0 ? (
          <p className="italic text-neutral-400">Nenhum pagamento registrado.</p>
        ) : (
          <div className="space-y-0.5">
            {activePayments.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between text-neutral-700">
                <span className="capitalize">
                  {p.metodo_pagamento.toLowerCase()}
                  {p.qtd_parcelas && p.qtd_parcelas > 1 ? ` (${p.qtd_parcelas}x)` : ""}
                </span>
                <span className="font-bold">{formatCurrency(Number(p.valor))}</span>
                <span>{new Date(p.data_pagamento).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-dotted border-neutral-300 pt-1.5 mt-1.5 flex justify-between items-center print:border-black font-bold">
          <span>Total Pago: {formatCurrency(totalPago)}</span>
          {isQuitada ? (
            <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded uppercase tracking-wider text-[10px] print:border print:border-black print:bg-transparent print:text-black">
              OS Quitada
            </span>
          ) : (
            <span className="text-red-600 font-black uppercase text-[10px]">
              Saldo Restante: {formatCurrency(saldoRestante)}
            </span>
          )}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-6 pt-4 print:break-inside-avoid">
        <div className="text-center border-t border-black pt-2">
          <p className="font-bold">Assinatura do Cliente</p>
          <p className="text-xs text-neutral-500">
            Declaro estar ciente e de acordo com os serviços.
          </p>
        </div>
        <div className="text-center border-t border-black pt-2">
          <p className="font-bold">{config?.nomeFantasia || "Responsável Técnico"}</p>
          <p className="text-xs text-neutral-500">Responsável Técnico</p>
        </div>
      </div>

      <div className="text-center font-bold text-sm uppercase mt-6 border-t border-dashed border-neutral-300 pt-4 print:border-black">
        Agradecemos a preferência! Volte sempre!!
      </div>

      <div className="text-center text-[10px] text-neutral-400 mt-6 print:mt-4 print:text-neutral-500">
        Gerado em {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
      </div>
    </div>
  );
};
