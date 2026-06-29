import { Fragment, useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { ActionButton } from "../ui/ActionButton";
import { Edit, Trash2, AlertCircle, Package, Info, Tag, Layers, Calendar } from "lucide-react";

import type { IPecasEstoque } from "../../types/estoque.types";
import { NfSyncBadge } from "../financeiro/NfSyncBadge";

interface EstoqueTableProps {
  pecas: IPecasEstoque[];
  onEdit: (peca: IPecasEstoque) => void;
  onDelete: (peca: IPecasEstoque) => void;
}

export const EstoqueTable = ({
  pecas,
  onEdit,
  onDelete,
}: EstoqueTableProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (pecas.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-400 italic">
        Nenhum item encontrado.
      </div>
    );
  }

  return (
    <table className="tabela-limpa w-full">
      <thead>
        <tr>
          <th className="w-[4%] text-left pl-4">ID</th>
          <th className="w-[30%] text-left">Produto / Peça</th>
          <th className="w-[15%] text-left">Fabricante</th>
          <th className="w-[20%] text-left">Última Compra</th>
          <th className="w-[12%] text-left">Estoque</th>
          <th className="w-[12%] text-left">Venda</th>
          <th className="w-[8%] text-center">Ações</th>
        </tr>
      </thead>
      <tbody>
        {pecas.map((p) => {
          const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
          const fornecedorName =
            lastEntry?.fornecedor?.nome_fantasia ||
            lastEntry?.fornecedor?.nome ||
            "-";
          const dataCompra = lastEntry?.data_compra
            ? new Date(lastEntry.data_compra).toLocaleDateString("pt-BR")
            : p.dt_ultima_compra
              ? new Date(p.dt_ultima_compra).toLocaleDateString("pt-BR")
              : p.dt_cadastro
                ? new Date(p.dt_cadastro).toLocaleDateString("pt-BR")
                : "SEM DATA";

          const condicaoItem = p.condicao || (p as any).itens_entrada?.[0]?.condicao || "NOVO";
          const aplicacaoItem = p.aplicacao || (p as any).itens_entrada?.[0]?.aplicacao || "Geral";
          const refCodItem = p.ref_cod || (p as any).itens_entrada?.[0]?.ref_cod;

          let badgeCondicao = "bg-emerald-50 text-emerald-700 border-emerald-200";
          if (condicaoItem.toUpperCase() === "ORIGINAL") {
            badgeCondicao = "bg-blue-50 text-blue-700 border-blue-200";
          } else if (condicaoItem.toUpperCase() === "USADO" || condicaoItem.toUpperCase() === "USADA") {
            badgeCondicao = "bg-orange-50 text-orange-700 border-orange-200";
          } else if (condicaoItem.toUpperCase() === "RECONDICIONADO") {
            badgeCondicao = "bg-purple-50 text-purple-700 border-purple-200";
          }

          return (
            <Fragment key={p.id_pecas_estoque}>
              <tr
                onClick={() => toggleRow(p.id_pecas_estoque)}
                className={`hover:bg-neutral-50 transition-colors group cursor-pointer ${expandedRows.has(p.id_pecas_estoque) ? "bg-neutral-50" : ""}`}
              >
                <td className="font-mono text-base font-bold text-neutral-600 text-left pl-4">
                  {p.id_pecas_estoque}
                </td>
                <td className="text-left">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold text-neutral-600 text-base uppercase">
                      {p.nome}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500 font-medium uppercase truncate max-w-[200px]" title={aplicacaoItem}>
                        Aplica: <span className="text-primary-600">{aplicacaoItem}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.localizacao && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded uppercase">
                          Loc: {p.localizacao}
                        </span>
                      )}
                      {refCodItem && (
                        <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded uppercase">
                          Ref: {refCodItem}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-left px-2">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-base text-neutral-600 max-w-[150px] truncate uppercase font-medium" title={p.fabricante || "GENÉRICO"}>
                      {p.fabricante || "GENÉRICO"}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${badgeCondicao}`}>
                      {condicaoItem}
                    </span>
                  </div>
                </td>
                <td className="text-left">
                  <div className="flex flex-col items-start">
                    <span className="text-base font-bold text-neutral-600">
                      {dataCompra}
                    </span>
                    {lastEntry?.nf_numero && (
                      <div className="flex flex-col gap-1 mt-1">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-sm text-center w-fit"
                          title={`Sincronização com a NF ${lastEntry.nf_numero}`}
                        >
                          NF: {lastEntry.nf_numero}
                        </span>
                        <div className="scale-90 origin-left">
                          <NfSyncBadge 
                            nf_numero={lastEntry.nf_numero} 
                            id_fornecedor={lastEntry.id_pessoa || lastEntry.fornecedor?.id_fornecedor} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="text-left">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wider inline-block w-fit ${
                        p.estoque_atual > (p.estoque_minimo || 0)
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : p.estoque_atual > 0
                            ? "bg-orange-50 text-orange-600 border border-orange-100"
                            : "bg-red-50 text-red-600 border border-red-100"
                      }`}
                    >
                      {p.estoque_atual} {p.unidade_medida || "UN"}
                    </span>
                    {p.estoque_atual <= (p.estoque_minimo || 0) &&
                      p.estoque_atual > 0 && (
                        <span className="text-sm text-orange-600 font-bold uppercase flex items-center gap-0.5 animate-pulse">
                          <AlertCircle size={10} /> Estoque Baixo
                        </span>
                      )}
                    {p.estoque_atual === 0 && (
                      <span className="text-sm text-red-600 font-bold uppercase flex items-center gap-0.5">
                        <AlertCircle size={10} /> Sem Estoque
                      </span>
                    )}
                  </div>
                </td>

                <td className="text-left text-base font-bold text-neutral-600">
                  {formatCurrency(Number(p.valor_venda))}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton
                      icon={Edit}
                      label="Editar"
                      variant="neutral"
                      onClick={() => onEdit(p)}
                    />
                    <ActionButton
                      icon={Trash2}
                      label="Excluir"
                      variant="danger"
                      onClick={() => onDelete(p)}
                    />
                  </div>
                </td>
              </tr>

              {expandedRows.has(p.id_pecas_estoque) && (
                <tr className="bg-neutral-50/50 shadow-inner">
                  <td colSpan={7} className="p-0">
                    <div className="px-8 py-6 border-l-4 border-primary-500 ml-5 my-2">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Package size={20} className="text-primary-600" />
                          <h4 className="text-base font-bold uppercase text-neutral-800 tracking-tight">
                            Ficha Completa da Peça • {p.nome}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                            className="px-3 py-1.5 bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 rounded-lg text-xs font-bold shadow-sm uppercase flex items-center gap-1.5 transition-all"
                          >
                            <Edit size={14} className="text-primary-600" /> Editar Cadastro
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Info size={14} /> Identidade
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-neutral-400 block text-xs">Fabricante:</span>
                              <span className="font-bold text-neutral-700 uppercase">{p.fabricante || "NÃO INFORMADO"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-xs">Modelo:</span>
                              <span className="font-bold text-neutral-700 uppercase">{p.modelo || "GERAL"}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-xs">Condição:</span>
                              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded uppercase border mt-0.5 ${badgeCondicao}`}>
                                {condicaoItem}
                              </span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block text-xs">Categoria:</span>
                              <span className="font-bold text-neutral-700 uppercase">{p.categoria?.nome || "SEM CATEGORIA"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Tag size={14} /> Valores e Estoque
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-1">
                              <span className="text-neutral-500 text-xs font-medium">Custo Médio:</span>
                              <span className="font-bold text-neutral-700">{formatCurrency(Number(p.valor_custo || 0))}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-1">
                              <span className="text-neutral-500 text-xs font-medium">Valor Venda:</span>
                              <span className="font-bold text-emerald-700">{formatCurrency(Number(p.valor_venda || 0))}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-1">
                              <span className="text-neutral-500 text-xs font-medium">Margem Estimada:</span>
                              <span className="font-bold text-primary-700">
                                {Number(p.valor_custo) > 0 ? (((Number(p.valor_venda) - Number(p.valor_custo)) / Number(p.valor_custo)) * 100).toFixed(1) + "%" : "0%"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-neutral-500 text-xs font-medium">Estoque Mínimo:</span>
                              <span className="font-bold text-orange-600">{p.estoque_minimo || 0} {p.unidade_medida || "UN"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers size={14} /> Aplicação e Equivalência
                          </h5>
                          <p className="text-xs font-medium text-neutral-600 uppercase leading-relaxed whitespace-pre-wrap">
                            {p.aplicacao || "NENHUMA APLICAÇÃO INFORMADA"}
                          </p>
                          <div className="pt-2 border-t border-neutral-100 flex flex-col gap-1">
                            <span className="text-[11px] text-neutral-400 uppercase font-bold">Localização no Estoque:</span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded w-fit border border-amber-200 uppercase">
                              {p.localizacao || "NÃO INFORMADA"}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                          <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={14} /> Última Entrada / NF
                          </h5>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-neutral-400 block">Data de Referência:</span>
                              <span className="font-bold text-neutral-700 text-sm">{dataCompra}</span>
                            </div>
                            <div>
                              <span className="text-neutral-400 block">Fornecedor:</span>
                              <span className="font-bold text-neutral-700 uppercase line-clamp-2">{fornecedorName}</span>
                            </div>
                            {lastEntry?.nf_numero && (
                              <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                                <span className="block font-bold text-neutral-700">NF: {lastEntry.nf_numero}</span>
                                <div className="scale-90 origin-left">
                                  <NfSyncBadge 
                                    nf_numero={lastEntry.nf_numero} 
                                    id_fornecedor={lastEntry.id_pessoa || lastEntry.fornecedor?.id_fornecedor} 
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

