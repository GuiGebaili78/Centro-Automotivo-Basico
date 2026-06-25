import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/Button";
import type { IMovimentacaoEstoque } from "../../types/backend";

interface PecaHistoricoTableProps {
  movimentacoes: IMovimentacaoEstoque[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
}

// Helper null-safe para nome do fornecedor
const getFornecedorNome = (mov: IMovimentacaoEstoque): string => {
  const fornecedor = mov.item_entrada?.entrada?.fornecedor;
  if (!fornecedor) return "—"; // Entrada sem fornecedor (legado/migração)
  return fornecedor.nome_fantasia || fornecedor.nome || "Desconhecido";
};

// Helper null-safe para dados de cliente da OS
const getOsCliente = (mov: IMovimentacaoEstoque): string => {
  const os = mov.ordem_de_servico;
  if (!os) return "—";
  return (
    os.cliente?.pessoa_fisica?.pessoa?.nome ||
    os.cliente?.pessoa_juridica?.razao_social ||
    "Cliente não identificado"
  );
};

// Helper null-safe para dados do veículo da OS
const getOsVeiculo = (mov: IMovimentacaoEstoque): string => {
  const v = mov.ordem_de_servico?.veiculo;
  if (!v) return "—";
  return `${v.placa} · ${v.marca} ${v.modelo} · ${v.cor}`;
};

export const PecaHistoricoTable = ({
  movimentacoes,
  total,
  page,
  limit,
  onPageChange,
  isLoading,
}: PecaHistoricoTableProps) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) {
    return (
      <div className="p-12 text-center text-neutral-400 italic flex flex-col items-center justify-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span>Carregando histórico de movimentações...</span>
      </div>
    );
  }

  if (movimentacoes.length === 0) {
    return (
      <div className="p-12 text-center text-neutral-400 italic">
        Nenhuma movimentação registrada no histórico desta peça.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="overflow-x-auto">
        <table className="tabela-limpa w-full">
          <thead>
            <tr>
              <th className="w-[15%] text-left pl-4">Data</th>
              <th className="w-[15%] text-left">Tipo</th>
              <th className="w-[12%] text-right">Qtd</th>
              <th className="w-[15%] text-right">Saldo (Ant → Atual)</th>
              <th className="w-[28%] text-left pl-4">Origem / Detalhes</th>
              <th className="w-[15%] text-left pl-4">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((mov) => {
              const dataMov = new Date(mov.dt_movimentacao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              let badgeClass = "bg-neutral-100 text-neutral-600";
              let qtdClass = "text-neutral-600";
              let qtdPrefix = "";

              if (mov.tipo_movimento === "ENTRADA") {
                badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                qtdClass = "text-emerald-600 font-bold";
                qtdPrefix = "+";
              } else if (mov.tipo_movimento === "SAIDA") {
                badgeClass = "bg-rose-50 text-rose-700 border border-rose-200";
                qtdClass = "text-rose-600 font-bold";
              } else if (mov.tipo_movimento === "ESTORNO") {
                badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                qtdClass = mov.quantidade > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold";
                qtdPrefix = mov.quantidade > 0 ? "+" : "";
              } else if (mov.tipo_movimento === "SALDO_INICIAL") {
                badgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
                qtdClass = "text-blue-600 font-bold";
              } else if (mov.tipo_movimento === "RETIFICAÇÃO") {
                badgeClass = "bg-purple-50 text-purple-700 border border-purple-200";
                qtdClass = mov.quantidade > 0 ? "text-emerald-600 font-bold" : mov.quantidade < 0 ? "text-rose-600 font-bold" : "text-neutral-600 font-bold";
                qtdPrefix = mov.quantidade > 0 ? "+" : "";
              } else if (mov.tipo_movimento === "AJUSTE") {
                badgeClass = "bg-indigo-50 text-indigo-700 border border-indigo-200";
                qtdClass = mov.quantidade > 0 ? "text-emerald-600 font-bold" : mov.quantidade < 0 ? "text-rose-600 font-bold" : "text-neutral-600 font-bold";
                qtdPrefix = mov.quantidade > 0 ? "+" : "";
              } else if (mov.tipo_movimento === "ATUALIZACAO_CADASTRAL") {
                badgeClass = "bg-slate-100 text-slate-700 border border-slate-300";
                qtdClass = "text-slate-400 font-normal";
              }

              // Detalhes da Origem com os helpers null-safe
              let detalhesOrigem = mov.origem || "—";
              let subDetalhes = "";

              if (mov.tipo_movimento === "ENTRADA" && mov.item_entrada) {
                const fornec = getFornecedorNome(mov);
                const nf = mov.item_entrada.entrada.nf_numero ? ` (NF: ${mov.item_entrada.entrada.nf_numero})` : "";
                detalhesOrigem = `Fornecedor: ${fornec}${nf}`;
              } else if (mov.ordem_de_servico) {
                const cliente = getOsCliente(mov);
                const veiculo = getOsVeiculo(mov);
                detalhesOrigem = `OS #${mov.ordem_de_servico.id_os} · ${cliente}`;
                subDetalhes = veiculo !== "—" ? veiculo : "";
              }

              return (
                <tr key={mov.id_movimentacao} className="hover:bg-neutral-50 transition-colors">
                  <td className="text-sm text-neutral-600 text-left pl-4 font-mono">
                    {dataMov}
                  </td>
                  <td className="text-left">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badgeClass}`}>
                      {mov.tipo_movimento}
                    </span>
                  </td>
                  <td className={`text-right text-sm font-mono ${qtdClass}`}>
                    {mov.tipo_movimento === "ATUALIZACAO_CADASTRAL" ? "—" : `${qtdPrefix}${mov.quantidade} UN`}
                  </td>
                  <td className="text-right text-sm font-mono text-neutral-600">
                    {mov.saldo_anterior} → <span className="font-bold text-neutral-800">{mov.saldo_atual}</span>
                  </td>
                  <td className="text-left pl-4">
                    <div className="flex flex-col">
                      <span className={`text-sm ${mov.tipo_movimento === "ATUALIZACAO_CADASTRAL" ? "font-semibold text-primary-700" : "font-medium text-neutral-800"}`}>
                        {detalhesOrigem}
                      </span>
                      {subDetalhes && (
                        <span className="text-xs text-neutral-500 font-mono">
                          {subDetalhes}
                        </span>
                      )}
                      {mov.obs && (
                        <span className={`text-xs mt-0.5 ${mov.tipo_movimento === "ATUALIZACAO_CADASTRAL" ? "text-slate-700 font-medium bg-slate-50 p-1.5 rounded border border-slate-200 inline-block mt-1 shadow-sm" : "text-neutral-500 italic"}`}>
                          {mov.tipo_movimento === "ATUALIZACAO_CADASTRAL" ? mov.obs : `Obs: ${mov.obs}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-left pl-4 text-sm text-neutral-600 font-medium">
                    {mov.nome_usuario_snapshot || "Sistema"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINAÇÃO */}
      {total > 0 && (
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong> — <strong>{total}</strong>{" "}
            {total === 1 ? "movimentação" : "movimentações"}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={ChevronLeft}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
              className="h-9 px-3 text-sm"
            >
              Anterior
            </Button>

            <span className="text-sm font-medium text-neutral-700 min-w-[60px] text-center">
              {page} / {totalPages}
            </span>

            <Button
              variant="ghost"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || isLoading}
              className="h-9 px-3 text-sm flex-row-reverse"
              icon={ChevronRight}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
