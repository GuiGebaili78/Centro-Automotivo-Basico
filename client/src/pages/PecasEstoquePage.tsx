import { useState, useEffect } from "react";
import { formatCurrency } from "../utils/formatCurrency";
import { api } from "../services/api";
import type { IPecasEstoque } from "../types/backend";
import { Search, Trash2, Edit, CheckCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/input";
import { PageLayout } from "../components/ui/PageLayout";
import { Card } from "../components/ui/Card";
import { ActionButton } from "../components/ui/ActionButton";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { Modal } from "../components/ui/Modal";
import { toast } from "react-toastify";

export const PecasEstoquePage = () => {
  const navigate = useNavigate();
  const [pecas, setPecas] = useState<IPecasEstoque[]>([]);

  // Search
  // Unificado: Um único termo para filtrar tudo
  const [searchTerm, setSearchTerm] = useState("");

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

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    msg: string;
    onConfirm: () => void;
    type: "warning" | "info" | "danger";
  }>({ show: false, title: "", msg: "", onConfirm: () => {}, type: "info" });

  useEffect(() => {
    loadPecas();
  }, []);

  const loadPecas = async () => {
    try {
      const response = await api.get("/pecas-estoque");
      setPecas(response.data);
    } catch (error) {
      toast.error("Erro ao carregar estoque.");
    }
  };

  // FILTERED LIST
  const filteredPecas = pecas.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    // Safely access nested properties
    const lastEntry = (p as any).itens_entrada?.[0]?.entrada;
    const fornecedor =
      lastEntry?.fornecedor?.nome_fantasia || lastEntry?.fornecedor?.nome || "";

    return (
      p.nome.toLowerCase().includes(term) ||
      (p.descricao && p.descricao.toLowerCase().includes(term)) ||
      (p.fabricante && p.fabricante.toLowerCase().includes(term)) ||
      String(p.id_pecas_estoque).includes(term) ||
      (fornecedor && fornecedor.toLowerCase().includes(term))
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

  const executeUpdate = async () => {
    if (!editData) return;
    try {
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

      toast.success("Peça atualizada com sucesso!");
      setEditModalOpen(false);
      setEditData(null);
      loadPecas();
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao atualizar peça. Verifique os dados.";
      toast.error(errorMsg);
    }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Simplified confirmation for save inside modal
    executeUpdate();
  };

  const executeDelete = async () => {
    if (!editData) return;
    try {
      await api.delete(`/pecas-estoque/${editData.id_pecas_estoque}`);
      toast.success("Peça removida do sistema.");
      loadPecas();
      setEditModalOpen(false);
      setEditData(null);
    } catch (error) {
      toast.error("Erro ao deletar peça.");
    }
    setConfirmModal((prev) => ({ ...prev, show: false }));
  };

  const handleDeleteClick = (p: IPecasEstoque) => {
    setEditData(p); // Temporarily set editData for deletion context
    setConfirmModal({
      show: true,
      title: "Excluir Item",
      msg: "Tem certeza que deseja remover este item permanentemente?",
      type: "danger",
      onConfirm: executeDelete,
    });
  };

  // Delete from within Edit Modal
  const handleDeleteFromModal = () => {
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
    <PageLayout
      title="Estoque de Peças"
      subtitle="Gerencie o inventário de peças e serviços."
      actions={
        <Button
          onClick={() => navigate("/entrada-estoque")}
          variant="primary"
          icon={Plus}
        >
          Nova Compra / Entrada
        </Button>
      }
    >
      <div className="space-y-6">
        {/* BUSCA UNIFICADA */}
        <div className="relative">
          <Input
            variant="default"
            icon={Search}
            placeholder="Buscar por nome, fabricante, descrição ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* TABELA */}
        <Card className="p-0 overflow-hidden border-neutral-200">
          <div className="overflow-x-auto">
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
                              onClick={() => handleOpenEdit(p)}
                            />
                            <ActionButton
                              icon={Trash2}
                              label="Excluir"
                              variant="danger"
                              onClick={() => handleDeleteClick(p)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* EDIT MODAL */}
      {editModalOpen && (
        <Modal
          title={`Editar Item: ${editData?.nome}`}
          onClose={() => setEditModalOpen(false)}
          className="max-w-3xl"
        >
          <form onSubmit={handleUpdate} className="space-y-6 pt-2">
            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input
                  label="Nome do Item"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Fabricante"
                    value={formData.fabricante}
                    onChange={(e) =>
                      setFormData({ ...formData, fabricante: e.target.value })
                    }
                    placeholder="Marca..."
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-neutral-500">
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
                      className="w-full p-2.5 rounded-lg border border-neutral-200 bg-white focus:bg-white outline-none focus:border-primary-500 font-medium text-sm transition-all h-[42px]"
                    >
                      <option value="UN">Unidade (UN)</option>
                      <option value="L">Litro (L)</option>
                      <option value="KG">Quilo (KG)</option>
                      <option value="KIT">Kit</option>
                      <option value="PAR">Par</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-neutral-500">
                    Descrição / Notas
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    className="w-full p-3 rounded-lg border border-neutral-200 bg-white focus:bg-white outline-none focus:border-primary-500 font-medium text-sm h-24 resize-none transition-all"
                    placeholder="Detalhes adicionais..."
                  />
                </div>
              </div>

              <div className="space-y-4 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-200 pb-2">
                  Valores e Estoque
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Estoque Atual"
                    type="number"
                    value={formData.estoque_atual}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estoque_atual: e.target.value,
                      })
                    }
                    className="text-center font-bold"
                  />
                  <Input
                    label="Margem (%)"
                    type="number"
                    step="0.5"
                    value={formData.margem_lucro}
                    onChange={(e) => handleRecalcSale(e.target.value)}
                    className="text-center font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Custo (R$)"
                    type="number"
                    step="0.01"
                    value={formData.valor_custo}
                    onChange={(e) =>
                      setFormData({ ...formData, valor_custo: e.target.value })
                    }
                    className="text-right font-medium text-neutral-600"
                  />
                  <Input
                    label="Venda (R$)"
                    type="number"
                    step="0.01"
                    value={formData.valor_venda}
                    onChange={(e) => handleRecalcMargin(e.target.value)}
                    className="text-right font-bold border-emerald-200 bg-emerald-50 text-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS */}
            <div className="flex justify-between items-center pt-6 border-t border-neutral-100">
              <Button
                type="button"
                onClick={handleDeleteFromModal}
                variant="danger"
                icon={Trash2}
                className="opacity-70 hover:opacity-100"
              >
                Excluir
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" icon={CheckCircle}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.msg}
        variant={confirmModal.type === "danger" ? "danger" : "primary"}
      />
    </PageLayout>
  );
};
