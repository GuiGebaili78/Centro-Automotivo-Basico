import { Modal, Button, Input } from "../ui";
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
        <Input
          label="Descrição"
          value={itemData.descricao}
          onChange={(e) =>
            setItemData({
              ...itemData,
              descricao: e.target.value,
            })
          }
        />
        <Input
          label="Código/Ref"
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
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="number"
              label="Qtd"
              className="text-center"
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
            <Input
              type="number"
              step="0.01"
              label="Valor Unit."
              className="text-center"
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

