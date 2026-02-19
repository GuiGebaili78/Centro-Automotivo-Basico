import { Trash2, Edit, DollarSign } from "lucide-react";
import { ActionButton } from "../ui/ActionButton";
import { formatCurrency } from "../../utils/formatCurrency";
import { Card } from "../ui/Card";

interface OsItemsTableProps {
  items: any[];
  isLocked: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
}

export const OsItemsTable = ({
  items,
  isLocked,
  onEdit,
  onDelete,
}: OsItemsTableProps) => {
  return (
    <Card className="p-0 overflow-hidden">
      <table className="tabela-limpa w-full">
        <thead>
          <tr>
            <th className="w-[40%] text-left pl-6">Item</th>
            <th className="w-[15%] text-left">Ref/Código</th>
            <th className="w-[10%] text-center">Qtd</th>
            <th className="w-[15%] text-center">Unit.</th>
            <th className="w-[15%] text-center">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {items.map((item) => (
            <tr
              key={item.id_iten}
              className="hover:bg-neutral-50 transition-colors group"
            >
              <td className="pl-6 py-3">
                <div className="font-bold text-sm text-neutral-700 flex flex-wrap items-center gap-2">
                  {item.descricao}
                  {/* STATUS PAGO */}
                  {item.pagamentos_peca &&
                    item.pagamentos_peca.length > 0 &&
                    item.pagamentos_peca.some(
                      (pp: any) => pp.pago_ao_fornecedor,
                    ) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-700 tracking-wider border border-green-200">
                        PAGO
                      </span>
                    )}
                  {/* STATUS ESTOQUE */}
                  {item.id_pecas_estoque && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700 tracking-wider border border-blue-200">
                      ESTOQUE
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3">
                <div className="text-[10px] text-neutral-400 font-medium font-mono px-2 py-0.5 rounded-md w-fit">
                  {item.codigo_referencia || "-"}
                </div>
              </td>
              <td className="text-center font-bold text-neutral-600 text-xs py-3">
                {item.quantidade}
              </td>
              <td className="text-center text-neutral-500 text-xs py-3">
                {formatCurrency(Number(item.valor_venda))}
              </td>
              <td className="text-center font-bold text-neutral-600 text-xs py-3">
                {formatCurrency(Number(item.valor_total))}
              </td>
              <td className="text-right pr-4 py-3">
                {!isLocked && (
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Lock actions if paid */}
                    {item.pagamentos_peca &&
                    item.pagamentos_peca.length > 0 &&
                    item.pagamentos_peca.some(
                      (pp: any) => pp.pago_ao_fornecedor,
                    ) ? (
                      <span className="text-[9px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                        <DollarSign size={10} /> Pago
                      </span>
                    ) : (
                      <>
                        <ActionButton
                          icon={Edit}
                          label="Editar Item"
                          onClick={() => onEdit(item)}
                          variant="accent"
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir Item"
                          onClick={() => onDelete(item.id_iten)}
                          variant="danger"
                        />
                      </>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="p-8 text-center text-neutral-300 text-xs italic"
              >
                Nenhum item adicionado à lista.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
};
