import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

import { formatCurrency } from "../../utils/formatCurrency";

interface EditItemOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemData: any;
  setItemData: (data: any) => void;
  onSave: () => Promise<void>;
}

export const OsItemEditModal = ({
  isOpen,
  onClose,
  itemData,
  setItemData,
  onSave,
}: EditItemOsModalProps) => {
  if (!isOpen || !itemData) return null;

  return (
    <Modal title="Editar Item" onClose={onClose}>
      <div className="space-y-4">


        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">
            Descrição
          </label>
          <input
            className="w-full border border-neutral-200 p-2.5 rounded-xl text-base text-gray-900 outline-none focus:border-primary-500"
            value={itemData.descricao}
            onChange={(e) =>
              setItemData({
                ...itemData,
                descricao: e.target.value,
              })
            }
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">
            Código/Ref
          </label>
          <input
            className="w-full border border-neutral-200 p-2.5 rounded-xl text-base text-gray-900 outline-none focus:border-primary-500 placeholder:text-gray-400 placeholder:text-sm"
            placeholder="Anotações internas ou Referência"
            title="Utilize este campo para anotações internas da oficina."
            value={itemData.codigo_referencia || ""}
            onChange={(e) =>
              setItemData({
                ...itemData,
                codigo_referencia: e.target.value,
              })
            }
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              Qtd
            </label>
            <input
              type="number"
              className="w-full border border-neutral-200 p-2.5 rounded-xl text-center text-base text-gray-900 outline-none focus:border-primary-500"
              value={itemData.quantidade}
              onChange={(e) =>
                setItemData({
                  ...itemData,
                  quantidade: e.target.value,
                })
              }
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-600 block mb-1">
              Valor Unit.
            </label>
            <input
              type="number"
              step="0.01"
              className="w-full border border-neutral-200 p-2.5 rounded-xl text-center text-base text-gray-900 outline-none focus:border-primary-500 transition-colors"
              value={itemData.valor_venda}
              onChange={(e) =>
                setItemData({
                  ...itemData,
                  valor_venda: e.target.value,
                })
              }
            />
          </div>
        </div>
        <div className="p-3 bg-neutral-50 rounded-lg">
          <p className="text-sm font-medium text-gray-600 mb-1">
            Total do Item
          </p>
          <p className="text-xl font-bold text-primary-600">
            {formatCurrency(
              Number(itemData.quantidade) * Number(itemData.valor_venda),
            )}
          </p>
        </div>
        <Button onClick={onSave} className="w-full mt-2">
          Salvar Alterações
        </Button>
      </div>
    </Modal>
  );
};
