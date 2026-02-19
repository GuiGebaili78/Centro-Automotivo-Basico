import { formatCurrency } from "../../utils/formatCurrency";
import { ActionButton } from "../ui/ActionButton";
import { Edit, Trash2 } from "lucide-react";
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
          <th className="w-[8%] text-left pl-4">ID</th>
          <th className="w-[20%] text-left">Produto / Peça</th>
          <th className="w-[20%] text-left">Descrição</th>
          <th className="w-[15%] text-left">Última Compra</th>
          <th className="w-[12%] text-left">Estoque</th>
          <th className="w-[12%] text-left">Venda</th>
          <th className="w-[13%] text-center">Ações</th>
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
              <td className="font-mono text-xs font-bold text-neutral-400 text-left pl-4">
                #{p.id_pecas_estoque}
              </td>
              <td className="text-left">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-neutral-700 text-sm">
                    {p.nome}
                  </span>
                  <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
                    {p.fabricante || "GENÉRICO"}
                  </span>
                </div>
              </td>
              <td
                className="text-left text-xs text-neutral-500 max-w-[200px] truncate px-2"
                title={p.descricao}
              >
                {p.descricao || "-"}
              </td>
              <td className="text-left">
                <div className="flex flex-col items-start">
                  <span
                    className="text-xs font-bold text-neutral-600 truncate max-w-[150px]"
                    title={fornecedorName}
                  >
                    {fornecedorName}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {dataCompra}
                  </span>
                </div>
              </td>
              <td className="text-left">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                    p.estoque_atual > 0
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-red-50 text-red-600 border border-red-100"
                  }`}
                >
                  {p.estoque_atual} {p.unidade_medida || "UN"}
                </span>
              </td>
              <td className="text-left text-sm font-bold text-neutral-800">
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
