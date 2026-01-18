import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import type { IItensOs } from "../types/backend";
import { ItensOsForm } from "../components/forms/ItensOsForm";
import { Modal } from "../components/ui/Modal";
import { Plus, Search, Trash2, Edit, Package } from "lucide-react";

export const ItensOsPage = () => {
  const [itens, setItens] = useState<IItensOs[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [editData, setEditData] = useState<IItensOs | null>(null);
  const [selectedOsId, setSelectedOsId] = useState<number | null>(null);

  useEffect(() => {
    loadItens();
  }, []);

  const loadItens = async () => {
    try {
      const response = await api.get("/itens-os");
      setItens(response.data);
    } catch (error) {
      alert("Erro ao carregar itens");
    }
  };

  const handleSearch = async () => {
    try {
      const response = await api.get(`/itens-os/${searchId}`);
      setEditData(response.data);
    } catch (error) {
      alert("Item não encontrado");
      setEditData(null);
    }
  };

  const handleUpdate = async () => {
    if (!editData) return;
    try {
      await api.put(`/itens-os/${editData.id_iten}`, editData);
      alert("Item atualizado!");
      loadItens();
    } catch (error) {
      alert("Erro ao atualizar item");
    }
  };

  const handleDelete = async () => {
    if (!searchId) return;
    try {
      await api.delete(`/itens-os/${searchId}`);
      alert("Item deletado!");
      loadItens();
      setEditData(null);
      setSearchId("");
    } catch (error) {
      alert("Erro ao deletar item");
    }
  };

  const openCreateModal = () => {
    const osId = prompt("Digite o ID da OS para adicionar item:");
    if (osId) {
      setSelectedOsId(Number(osId));
      setShowModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Itens de Ordem de Serviço
          </h1>
          <p className="text-slate-500">Peças e serviços aplicados nas OS.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
        >
          <Plus size={20} />
          Novo Item
        </button>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                ID
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                OS
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                Descrição
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                Qtd
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                Valor Unit.
              </th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itens.map((item) => (
              <tr key={item.id_iten} className="hover:bg-slate-50">
                <td className="p-4 text-gray-500 font-mono">#{item.id_iten}</td>
                <td className="p-4 text-slate-600">OS #{item.id_os}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-lg text-green-600">
                      <Package size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {item.descricao}
                      </div>
                      {item.id_pecas_estoque && (
                        <div className="text-xs text-slate-500">
                          Peça ID: {item.id_pecas_estoque}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-700 font-bold">
                  {item.quantidade}
                </td>
                <td className="p-4 text-slate-700">
                  {formatCurrency(Number(item.valor_venda))}
                </td>
                <td className="p-4 text-green-700 font-bold">
                  {formatCurrency(Number(item.valor_total))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MANAGE */}
      <div className="bg-white p-4 rounded-xl border border-gray-200">
        <h2 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">
          Manutenção de Item (Por ID)
        </h2>
        <div className="flex gap-4 mb-4">
          <input
            type="number"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Digite o ID do Item..."
            className="border p-2 rounded w-64"
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded hover:bg-slate-700"
          >
            <Search size={18} /> Localizar
          </button>
          {searchId && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
            >
              <Trash2 size={18} /> Excluir
            </button>
          )}
        </div>

        {editData && (
          <div className="bg-slate-50 p-4 rounded border animate-in fade-in">
            <h3 className="font-bold mb-2">Editando: {editData.descricao}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs font-bold block mb-1">
                  Descrição
                </label>
                <input
                  value={editData.descricao}
                  onChange={(e) =>
                    setEditData({ ...editData, descricao: e.target.value })
                  }
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  value={editData.quantidade}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      quantidade: Number(e.target.value),
                    })
                  }
                  className="border p-2 w-full rounded"
                />
              </div>
            </div>
            <button
              onClick={handleUpdate}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 font-bold"
            >
              <Edit size={18} /> Salvar Alterações
            </button>
          </div>
        )}
      </div>

      {showModal && selectedOsId && (
        <Modal title="Novo Item na OS" onClose={() => setShowModal(false)}>
          <ItensOsForm
            osId={selectedOsId}
            onSuccess={() => {
              setShowModal(false);
              loadItens();
            }}
            onCancel={() => setShowModal(false)}
          />
        </Modal>
      )}
    </div>
  );
};
