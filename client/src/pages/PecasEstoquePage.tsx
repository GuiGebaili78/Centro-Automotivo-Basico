import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import type { IPecasEstoque } from "../types/backend";
import { Modal } from "../components/ui/Modal";
import {
  Search,
  Trash2,
  Edit,
  Package,
  CheckCircle,
  ShoppingCart,
} from "lucide-react";
import { StatusBanner } from "../components/ui/StatusBanner";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";

export const PecasEstoquePage = () => {
  const navigate = useNavigate();
  const [pecas, setPecas] = useState<IPecasEstoque[]>([]);

  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // Search
  const [searchId, setSearchId] = useState("");
  const [listSearchTerm, setListSearchTerm] = useState(""); // Global filter

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<IPecasEstoque | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    fabricante: "",
    descricao: "",
    unidade_medida: "UN",
    valor_custo: "",
    margem_lucro: "",
    valor_venda: "",
    estoque_atual: "",
  });

  useEffect(() => {
    loadPecas();
  }, []);

  // FILTERED LIST
  const filteredPecas = pecas.filter((p) => {
    if (!listSearchTerm) return true;
    const term = listSearchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      p.descricao.toLowerCase().includes(term) ||
      (p.fabricante && p.fabricante.toLowerCase().includes(term)) ||
      String(p.id_pecas_estoque).includes(term)
    );
  });

  const handleRecalcMargin = (saleVal: string) => {
    setFormData((prev) => {
      const sale = Number(saleVal);
      const cost = Number(prev.valor_custo);
      let margin = prev.margem_lucro;
      if (cost > 0 && sale > 0) {
        margin = (((sale - cost) / cost) * 100).toFixed(2);
      }
      return { ...prev, valor_venda: saleVal, margem_lucro: margin };
    });
  };

  const handleRecalcSale = (marginVal: string) => {
    setFormData((prev) => {
      const margin = Number(marginVal);
      const cost = Number(prev.valor_custo);
      let sale = prev.valor_venda;
      if (cost > 0) {
        sale = (cost + cost * (margin / 100)).toFixed(2);
      }
      return { ...prev, margem_lucro: marginVal, valor_venda: sale };
    });
  };

  const loadPecas = async () => {
    try {
      const response = await api.get("/pecas-estoque");
      setPecas(response.data);
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao carregar estoque." });
    }
  };

  const handleSearch = async () => {
    if (!searchId) return;
    try {
      const response = await api.get(`/pecas-estoque/${searchId}`);
      // Setup Form Data
      const p = response.data;
      setEditData(p);

      // Calc Margin
      let margin = "";
      if (Number(p.valor_custo) > 0) {
        margin = (
          ((Number(p.valor_venda) - Number(p.valor_custo)) /
            Number(p.valor_custo)) *
          100
        ).toFixed(2);
      }

      setFormData({
        nome: p.nome,
        fabricante: p.fabricante || "",
        descricao: p.descricao || "",
        unidade_medida: p.unidade_medida || "UN",
        valor_custo: Number(p.valor_custo).toFixed(2),
        margem_lucro: margin,
        valor_venda: Number(p.valor_venda).toFixed(2),
        estoque_atual: String(p.estoque_atual),
      });

      setEditModalOpen(true);
      setSearchId(""); // Clear search ID after opening
    } catch (error) {
      setStatusMsg({ type: "error", text: "Peça não encontrada por ID." });
      setEditData(null);
    }
  };

  const handleOpenEdit = (p: IPecasEstoque) => {
    setEditData(p);
    // Calc Margin
    let margin = "";
    if (Number(p.valor_custo) > 0) {
      margin = (
        ((Number(p.valor_venda) - Number(p.valor_custo)) /
          Number(p.valor_custo)) *
        100
      ).toFixed(2);
    }

    setFormData({
      nome: p.nome,
      fabricante: p.fabricante || "",
      descricao: p.descricao || "",
      unidade_medida: p.unidade_medida || "UN",
      valor_custo: Number(p.valor_custo).toFixed(2),
      margem_lucro: margin,
      valor_venda: Number(p.valor_venda).toFixed(2),
      estoque_atual: String(p.estoque_atual),
    });
    setEditModalOpen(true);
  };

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: "warning" | "info" | "danger";
  }>({ show: false, title: "", msg: "", onConfirm: () => {}, type: "info" });

  const handleCloseModal = () => {
    if (editData) {
      setConfirmModal({
        show: true,
        title: "Descartar Alterações?",
        msg: "Existem dados carregados. Deseja sair sem salvar?",
        type: "warning",
        onConfirm: () => {
          setEditModalOpen(false);
          setEditData(null);
          setConfirmModal((prev) => ({ ...prev, show: false }));
        },
      });
    } else {
      setEditModalOpen(false);
    }
  };

  const executeUpdate = async () => {
    if (!editData) return;
    try {
      // Build a clean payload with only editable fields
      const payload = {
        nome: formData.nome,
        fabricante: formData.fabricante,
        descricao: formData.descricao,
        unidade_medida: formData.unidade_medida,
        valor_custo: Number(formData.valor_custo),
        valor_venda: Number(formData.valor_venda),
        estoque_atual: Number(formData.estoque_atual),
      };

      await api.put(`/pecas-estoque/${editData.id_pecas_estoque}`, payload);

      setStatusMsg({ type: "success", text: "Peça atualizada com sucesso!" });
      setEditModalOpen(false); // Close edit modal
      setEditData(null);
      loadPecas(); // Refresh list
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao atualizar peça. Verifique os dados.";
      setStatusMsg({ type: "error", text: errorMsg });
      // Do NOT close edit modal so user can fix
    }
    setConfirmModal((prev) => ({ ...prev, show: false })); // Always close confirm modal
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      show: true,
      title: "Salvar Alterações",
      msg: "Deseja confirmar as atualizações neste item?",
      type: "info",
      onConfirm: executeUpdate,
    });
  };

  const executeDelete = async () => {
    if (!editData) return;
    try {
      await api.delete(`/pecas-estoque/${editData.id_pecas_estoque}`);
      setStatusMsg({ type: "success", text: "Peça removida do sistema." });
      loadPecas();
      setEditModalOpen(false);
      setEditData(null);
      setSearchId("");
    } catch (error) {
      setStatusMsg({ type: "error", text: "Erro ao deletar peça." });
    }
    setConfirmModal((prev) => ({ ...prev, show: false }));
  };

  const handleDelete = () => {
    if (!editData) return;
    setConfirmModal({
      show: true,
      title: "Excluir Item",
      msg: "Tem certeza que deseja remover este item permanentemente?",
      type: "danger",
      onConfirm: executeDelete,
    });
  };

  return (
    <div className="w-full mx-auto px-4 md:px-8 py-6 space-y-6">
      <StatusBanner
        msg={statusMsg}
        onClose={() => setStatusMsg({ type: null, text: "" })}
      />

      {/* CONFIRMATION MODAL */}
      {confirmModal.show && (
        <Modal
          title={confirmModal.title}
          onClose={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
          zIndex={60}
        >
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border ${confirmModal.type === "danger" ? "bg-red-50 border-red-100 text-red-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}
            >
              <p className="font-bold text-center">{confirmModal.msg}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, show: false }))
                }
              >
                Cancelar
              </Button>
              <Button
                variant={confirmModal.type === "danger" ? "danger" : "primary"}
                onClick={confirmModal.onConfirm}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Estoque de Peças
          </h1>
          <p className="text-neutral-500">
            Gerencie o inventário de peças e serviços.
          </p>
        </div>
        <Button
          onClick={() => navigate("/entrada-estoque")}
          variant="primary"
          icon={ShoppingCart}
          className="shadow-lg shadow-primary-500/20"
        >
          Nova Compra / Entrada
        </Button>
      </div>

      {/* ACTION CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Maintenance By ID (Left) */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2 mb-4">
            Manutenção de Item (Por ID)
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="ID da Peça"
                type="number"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="123"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchId}
              variant="primary"
              className="mb-1"
              icon={Search}
            >
              ABRIR
            </Button>
          </div>
        </div>

        {/* 2. Global Search / Filtering (Right) */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-neutral-600 uppercase tracking-widest border-b border-neutral-100 pb-2 mb-4">
            Localizar / Filtrar Lista
          </h2>
          <div className="relative">
            <Input
              label="Buscar em todas as colunas"
              value={listSearchTerm}
              onChange={(e) => setListSearchTerm(e.target.value)}
              placeholder="Nome, Fabricante, Descrição..."
            />
            <Search
              className="absolute right-3 top-[34px] text-neutral-400 pointer-events-none"
              size={18}
            />
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-50 border-b border-neutral-100">
            <tr>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                ID
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Produto / Peça
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Fornecedor / Data
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
                Estoque
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
                Custo Unit.
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
                Valor Venda
              </th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filteredPecas.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="p-8 text-center text-neutral-400 italic"
                >
                  Nenhum item encontrado.
                </td>
              </tr>
            ) : (
              filteredPecas.map((p) => {
                const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
                const fornecedorName = lastEntry?.fornecedor?.nome || "-";
                const dataCompra = lastEntry?.data_compra
                  ? new Date(lastEntry.data_compra).toLocaleDateString()
                  : "-";
                const nf = lastEntry?.nota_fiscal || "-";

                return (
                  <tr
                    key={p.id_pecas_estoque}
                    className="hover:bg-neutral-50 group transition-colors"
                  >
                    <td className="p-4 text-neutral-500 font-mono text-xs font-bold">
                      #{p.id_pecas_estoque}
                    </td>
                    <td className="p-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
                          <Package size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900">
                            {p.nome}
                          </div>
                          <div className="text-xs text-neutral-500 max-w-[200px] truncate">
                            {p.descricao}
                          </div>
                          {p.fabricante && (
                            <div className="text-[10px] text-neutral-400 uppercase font-bold">
                              {p.fabricante}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        <div className="font-bold text-neutral-700">
                          {fornecedorName}
                        </div>
                        <div className="text-neutral-400 font-medium">
                          {dataCompra} • NF: {nf}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-bold ${p.estoque_atual > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                      >
                        {p.estoque_atual} {p.unidade_medida || "UN"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-medium text-neutral-600">
                      {formatCurrency(Number(p.valor_custo))}
                    </td>
                    <td className="p-4 text-right font-bold text-neutral-900">
                      {formatCurrency(Number(p.valor_venda))}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        onClick={() => handleOpenEdit(p)}
                        variant="secondary"
                        size="sm"
                        icon={Edit}
                        className="py-1 px-2"
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editModalOpen && (
        <Modal
          title={`Manutenção de Item: ${editData?.nome}`}
          onClose={handleCloseModal}
          className="max-w-4xl"
        >
          <form onSubmit={handleUpdate} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Nome do Item"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Fabricante"
                    value={formData.fabricante}
                    onChange={(e) =>
                      setFormData({ ...formData, fabricante: e.target.value })
                    }
                    placeholder="Marca..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unidade_medida}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unidade_medida: e.target.value,
                      })
                    }
                    className="w-full p-[10px] rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-bold text-sm h-[42px] transition-all"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="L">Litro (L)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="KIT">Kit</option>
                    <option value="PAR">Par</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Values Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  label="Estoque Atual"
                  type="number"
                  value={formData.estoque_atual}
                  onChange={(e) =>
                    setFormData({ ...formData, estoque_atual: e.target.value })
                  }
                  className="text-center font-bold"
                />
              </div>
              <div>
                <Input
                  label="Custo Unit (R$)"
                  type="number"
                  step="0.01"
                  value={formData.valor_custo}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_custo: e.target.value })
                  }
                  className="text-right font-medium"
                />
              </div>
              <div>
                <Input
                  label="Margem (%)"
                  type="number"
                  step="0.5"
                  value={formData.margem_lucro}
                  onChange={(e) => handleRecalcSale(e.target.value)}
                  className="text-center font-medium"
                />
              </div>
              <div>
                <Input
                  label="Venda Unit (R$)"
                  type="number"
                  step="0.01"
                  value={formData.valor_venda}
                  onChange={(e) => handleRecalcMargin(e.target.value)}
                  className="text-right font-bold border-primary-200 bg-primary-50 text-primary-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Descrição / Aplicação / Obs
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  className="w-full p-3 rounded-lg border border-neutral-200 bg-neutral-50 focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-24 resize-none transition-all"
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                onClick={handleDelete}
                variant="danger"
                icon={Trash2}
              >
                Excluir Item
              </Button>

              <Button
                type="submit"
                variant="primary"
                icon={CheckCircle}
                className="px-8 shadow-lg shadow-primary-500/20"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
