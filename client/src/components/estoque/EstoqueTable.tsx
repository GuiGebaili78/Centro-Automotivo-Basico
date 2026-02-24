import { formatCurrency } from "../../utils/formatCurrency";
import { ActionButton } from "../ui/ActionButton";
import { Edit, Trash2, AlertCircle } from "lucide-react";

import type { IPecasEstoque } from "../../types/estoque.types";

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
            ? new Date(lastEntry.data_compra).toLocaleDateString()
            : "-";

          return (
            <tr
              key={p.id_pecas_estoque}
              className="hover:bg-neutral-50 transition-colors group"
            >
              <td className="font-mono text-base font-bold text-neutral-600 text-left pl-4">
                {p.id_pecas_estoque}
              </td>
              <td className="text-left">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-neutral-600 text-base uppercase">
                    {p.nome}
                  </span>
                </div>
              </td>
              <td
                className="text-left text-base text-neutral-600 max-w-[200px] truncate px-2 uppercase"
                title={p.fabricante || "GENÉRICO"}
              >
                {p.fabricante || "GENÉRICO"}
              </td>
              <td className="text-left">
                <div className="flex flex-col items-start">
                  <span
                    className="text-base font-bold text-neutral-600 truncate max-w-[200px] uppercase"
                    title={fornecedorName}
                  >
                    {fornecedorName}
                  </span>
                  <span className="text-base text-neutral-400">
                    {dataCompra}
                  </span>
                </div>
              </td>
              <td className="text-left">
                <div className="flex flex-col gap-1">
                  <span
                    className={`px-2 py-0.5 rounded text-base font-bold uppercase tracking-wider inline-block w-fit ${
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
                      <span className="text-base text-orange-600 font-bold uppercase flex items-center gap-0.5 animate-pulse">
                        <AlertCircle size={10} /> Estoque Baixo
                      </span>
                    )}
                  {p.estoque_atual === 0 && (
                    <span className="text-base text-red-600 font-bold uppercase flex items-center gap-0.5">
                      <AlertCircle size={10} /> Sem Estoque
                    </span>
                  )}
                </div>
              </td>

              <td className="text-left text-base font-bold text-neutral-600">
                {formatCurrency(Number(p.valor_venda))}
              </td>
              <td>
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
          );
        })}
      </tbody>
    </table>
  );
};
