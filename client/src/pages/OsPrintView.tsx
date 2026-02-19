import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api"; // Or useOrdemServico hook if available globally without layout
import { format } from "date-fns";
import { formatCurrency } from "../utils/formatCurrency";
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
      setTimeout(() => {
        window.print();
      }, 500);
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

  return (
    <div className="min-h-screen bg-white p-8 print:p-0 print:m-0 print:w-full print:absolute print:top-0 print:left-0">
      {/* Print Controls - Hidden when printing */}
      <div className="mb-8 flex gap-4 print:hidden"></div>
      {/* Header with Config Data */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          {config?.logoUrl && (
            <img
              src={`${import.meta.env.VITE_API_URL}${config.logoUrl}`}
              alt="Logo"
              className="h-20 w-auto object-contain"
            />
          )}
          <div>
            <h1 className="text-xl font-black uppercase">
              {config?.nomeFantasia || "Centro Automotivo"}
            </h1>
            <p className="text-sm font-bold">{config?.razaoSocial}</p>
            <p className="text-xs">
              CNPJ: {config?.cnpj || "-"}
              {config?.inscricaoEstadual &&
                ` • IE: ${config.inscricaoEstadual}`}
            </p>
            <p className="text-xs">
              {config?.endereco || "Endereço não configurado"}
            </p>
            <p className="text-xs">Tel: {config?.telefone || "-"}</p>
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
        <div className="border-2 border-red-500 bg-red-50 text-red-600 font-bold text-center p-2 mb-6 uppercase text-sm print:border-black print:text-black print:bg-transparent">
          DOCUMENTO SEM VALOR FISCAL - SERVIÇO NÃO REALIZADO / APENAS ORÇAMENTO
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div className="border border-neutral-300 p-4 rounded-lg print:border-black">
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
            {os.cliente?.pessoa?.telefone || os.cliente?.telefone_1 || "-"}
          </p>
          <p>
            <span className="font-bold">Endereço:</span>{" "}
            {os.cliente?.logradouro}, {os.cliente?.nr_logradouro} -{" "}
            {os.cliente?.cidade}/{os.cliente?.estado}
          </p>
        </div>
        <div className="border border-neutral-300 p-4 rounded-lg print:border-black">
          <h3 className="font-bold uppercase border-b border-neutral-200 mb-2 pb-1 print:border-black">
            Veículo
          </h3>
          <p>
            <span className="font-bold">Modelo:</span> {os.veiculo?.modelo}
          </p>
          <p>
            <span className="font-bold">Placa:</span> {os.veiculo?.placa}
          </p>
          <p>
            <span className="font-bold">Marca:</span> {os.veiculo?.marca}
          </p>
          <p>
            <span className="font-bold">Cor:</span> {os.veiculo?.cor}
          </p>
          <p>
            <span className="font-bold">KM:</span> {os.km_entrada} km
          </p>
        </div>
      </div>

      {/* Defeito / Diagnostico */}
      <div className="mb-6 text-sm">
        <div className="mb-4">
          <h3 className="font-bold uppercase bg-neutral-100 p-1 mb-1 print:bg-transparent print:border-b print:border-black">
            Defeito Relatado
          </h3>
          <p className="p-2 border border-neutral-200 rounded print:border-black min-h-[40px]">
            {os.defeito_relatado || "-"}
          </p>
        </div>
        {os.diagnostico && (
          <div className="mb-4">
            <h3 className="font-bold uppercase bg-neutral-100 p-1 mb-1 print:bg-transparent print:border-b print:border-black">
              Diagnóstico Técnico
            </h3>
            <p className="p-2 border border-neutral-200 rounded print:border-black min-h-[40px]">
              {os.diagnostico}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-6">
        <h3 className="font-bold uppercase bg-neutral-800 text-white p-2 mb-0 print:bg-transparent print:text-black print:border-b-2 print:border-black">
          Peças e Produtos
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-100 print:bg-transparent border-b border-black">
              <th className="text-left p-2">Descrição</th>
              <th className="text-center p-2 w-[80px]">Qtd</th>
              <th className="text-right p-2 w-[100px]">Unit.</th>
              <th className="text-right p-2 w-[100px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {os.itens_os?.map((item: any, idx: number) => (
              <tr
                key={idx}
                className="border-b border-neutral-200 print:border-neutral-400"
              >
                <td className="p-2">
                  {item.descricao || item.pecas_estoque?.nome}
                </td>
                <td className="text-center p-2">{item.quantidade}</td>
                <td className="text-right p-2">
                  {formatCurrency(Number(item.valor_venda))}
                </td>
                <td className="text-right p-2 font-bold">
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
      <div className="mb-6">
        <h3 className="font-bold uppercase bg-neutral-800 text-white p-2 mb-0 print:bg-transparent print:text-black print:border-b-2 print:border-black">
          Mão de Obra
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-neutral-100 print:bg-transparent border-b border-black">
              <th className="text-left p-2">Descrição</th>
              <th className="text-left p-2">Profissional</th>
              <th className="text-right p-2 w-[100px]">Valor</th>
            </tr>
          </thead>
          <tbody>
            {os.servicos_mao_de_obra?.map((svc: any, idx: number) => (
              <tr
                key={idx}
                className="border-b border-neutral-200 print:border-neutral-400"
              >
                <td className="p-2">{svc.descricao || "Serviço"}</td>
                <td className="p-2">
                  {svc.funcionario?.pessoa_fisica?.pessoa?.nome || "-"}
                </td>
                <td className="text-right p-2 font-bold">
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
      <div className="flex justify-end mb-12">
        <div className="w-[300px]">
          <div className="flex justify-between py-1 border-b border-neutral-200">
            <span>Total Peças:</span>
            <span>{formatCurrency(totalPecas)}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-200">
            <span>Total Serviços:</span>
            <span>{formatCurrency(totalServicos)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-black font-black text-xl mt-2">
            <span>TOTAL GERAL:</span>
            <span>{formatCurrency(totalGeral)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-16 mt-20 pt-8 print:break-inside-avoid">
        <div className="text-center border-t border-black pt-2">
          <p className="font-bold">Assinatura do Cliente</p>
          <p className="text-xs text-neutral-500">
            Declaro estar ciente e de acordo com os serviços.
          </p>
        </div>
        <div className="text-center border-t border-black pt-2">
          <p className="font-bold">Responsável Técnico</p>
          <p className="text-xs text-neutral-500">Centro Automotivo</p>
        </div>
      </div>

      <div className="text-center text-[10px] text-neutral-400 mt-20 print:fixed print:bottom-0 print:left-0 print:w-full">
        Gerado em {format(new Date(), "dd/MM/yyyy HH:mm:ss")}
      </div>
    </div>
  );
};
