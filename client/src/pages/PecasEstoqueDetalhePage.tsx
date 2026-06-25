import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle, Trash2, ArrowLeft, Ban, Scale } from "lucide-react";
import { PageLayout } from "../components/ui/PageLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { TextArea } from "../components/ui/TextArea";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { Modal } from "../components/ui/Modal";
import { EstoqueService } from "../services/estoque.service";
import { CategoriaEstoqueService, type ICategoriaEstoque } from "../services/categoriaEstoque.service";
import { CategoriaCombobox } from "../components/estoque/CategoriaCombobox";
import { CategoriaEstoqueManagerModal } from "../components/estoque/CategoriaEstoqueManagerModal";
import type { IPecasEstoque } from "../types/estoque.types";
import { Card } from "../components/ui/Card";
import { PecaHistoricoTable } from "../components/estoque/PecaHistoricoTable";
import type { IPaginatedResponse, IMovimentacaoEstoque } from "../types/backend";

export const PecasEstoqueDetalhePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [peca, setPeca] = useState<IPecasEstoque | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ show: false });
  const [categorias, setCategorias] = useState<ICategoriaEstoque[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);

  // Estados do Histórico (Master-Detail)
  const [historico, setHistorico] = useState<IPaginatedResponse<IMovimentacaoEstoque> | null>(null);
  const [historicoPage, setHistoricoPage] = useState(1);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Estados do Modal de Ajuste Rápido de Saldo
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [ajusteTipo, setAjusteTipo] = useState<"ADD" | "REMOVE">("ADD");
  const [ajusteQtd, setAjusteQtd] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const [loadingAjuste, setLoadingAjuste] = useState(false);

  // Refresh Key para recarregar Master e Detail instantaneamente
  const [refreshKey, setRefreshKey] = useState(0);

  const [formData, setFormData] = useState({
    nome: "",
    fabricante: "",
    descricao: "",
    unidade_medida: "UN",
    valor_custo: "",
    margem_lucro: "",
    valor_venda: "",
    estoque_atual: "",
    estoque_minimo: "",
    modelo: "",
    localizacao: "",
    id_categoria: null as number | null,
  });

  // useEffect 1: Carrega dados da peça (Master)
  useEffect(() => {
    loadCategorias();
    if (id) {
      loadPeca(Number(id));
    }
  }, [id, refreshKey]);

  // useEffect 2: Carrega histórico de forma independente (Detail)
  useEffect(() => {
    if (!id) return;
    setLoadingHistorico(true);
    EstoqueService.getHistorico(Number(id), historicoPage, 10)
      .then((data) => setHistorico(data))
      .catch(() => toast.error("Erro ao carregar histórico de movimentações."))
      .finally(() => setLoadingHistorico(false));
  }, [id, historicoPage, refreshKey]);

  const loadCategorias = async () => {
    try {
      const data = await CategoriaEstoqueService.getAll();
      setCategorias(data);
    } catch (error) {
      console.error(error);
    }
  };

  const loadPeca = async (pecaId: number) => {
    try {
      setLoadingData(true);
      const found = await EstoqueService.getById(pecaId);

      if (!found) {
        toast.error("Peça não encontrada.");
        navigate("/pecas-estoque");
        return;
      }
      setPeca(found);

      let margin = "";
      if (Number(found.valor_custo) > 0) {
        margin = (
          ((Number(found.valor_venda) - Number(found.valor_custo)) /
            Number(found.valor_custo)) *
          100
        ).toFixed(2);
      }

      setFormData({
        nome: found.nome,
        fabricante: found.fabricante || "",
        descricao: found.descricao || "",
        unidade_medida: found.unidade_medida || "UN",
        valor_custo: Number(found.valor_custo).toFixed(2),
        margem_lucro: margin,
        valor_venda: Number(found.valor_venda).toFixed(2),
        estoque_atual: String(found.estoque_atual),
        estoque_minimo: String(found.estoque_minimo || 0),
        modelo: found.modelo || "",
        localizacao: found.localizacao || "",
        id_categoria: found.id_categoria || null,
      });
    } catch (error: any) {
      const msg = error.response?.data?.error || "Erro ao carregar detalhes da peça.";
      toast.error(msg);
      navigate("/pecas-estoque");
    } finally {
      setLoadingData(false);
    }
  };

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

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!peca) return;

    setLoading(true);
    try {
      const payload = {
        nome: formData.nome,
        fabricante: formData.fabricante,
        descricao: formData.descricao,
        unidade_medida: formData.unidade_medida,
        valor_custo: Number(formData.valor_custo),
        valor_venda: Number(formData.valor_venda),
        estoque_atual: Number(formData.estoque_atual),
        estoque_minimo: Number(formData.estoque_minimo),
        modelo: formData.modelo,
        localizacao: formData.localizacao,
        id_categoria: formData.id_categoria,
      };

      await EstoqueService.update(peca.id_pecas_estoque, payload);
      toast.success("Peça atualizada com sucesso!");
      navigate("/pecas-estoque");
    } catch (error: any) {
      console.error(error);
      const errorMsg =
        error.response?.data?.error ||
        "Erro ao atualizar peça. Verifique os dados.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAjustarSaldo = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const qtd = Number(ajusteQtd);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error("Informe uma quantidade válida maior que zero.");
      return;
    }
    if (!ajusteMotivo.trim()) {
      toast.error("O motivo/justificativa é obrigatório.");
      return;
    }

    setLoadingAjuste(true);
    try {
      await EstoqueService.ajustarSaldo(Number(id), {
        tipo: ajusteTipo,
        quantidade: qtd,
        motivo: ajusteMotivo.trim(),
      });
      toast.success("Saldo ajustado com sucesso!");
      setShowAjusteModal(false);
      setAjusteQtd("");
      setAjusteMotivo("");
      setRefreshKey((prev) => prev + 1);
    } catch (error: any) {
      const msg = error.response?.data?.error || "Erro ao ajustar saldo da peça.";
      toast.error(msg);
    } finally {
      setLoadingAjuste(false);
    }
  };

  const temHistorico = peca && (peca as any)._count?.movimentacoes > 0;

  const executeDelete = async () => {
    if (!peca) return;
    try {
      const res = await EstoqueService.delete(peca.id_pecas_estoque);
      if (res?.temHistorico || temHistorico) {
        toast.success("Peça inativada com sucesso (histórico preservado para auditoria).");
      } else {
        toast.success("Peça removida do sistema.");
      }
      navigate("/pecas-estoque");
    } catch (error) {
      toast.error("Erro ao deletar/inativar peça.");
    }
    setConfirmModal({ show: false });
  };

  if (loadingData) return <div className="p-8 text-center">Carregando...</div>;
  if (!peca) return null;

  return (
    <PageLayout
      title={`Catálogo: ${peca.nome}`}
      subtitle={`ID: ${peca.id_pecas_estoque} | Perfil Global da Peça`}
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/pecas-estoque")}
            variant="ghost"
            icon={ArrowLeft}
          >
            Voltar
          </Button>
          <Button
            onClick={() => setShowAjusteModal(true)}
            variant="ghost"
            icon={Scale}
            className="text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-bold"
          >
            Ajustar Saldo
          </Button>
        </div>
      }
    >
      <form onSubmit={handleUpdate} className="space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wide border-b border-neutral-100 pb-2">
                Identidade da Peça
              </h4>
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
                  label="Fabricante / Marca"
                  value={formData.fabricante}
                  onChange={(e) =>
                    setFormData({ ...formData, fabricante: e.target.value })
                  }
                  placeholder="Marca..."
                />
                <Select
                  label="Unidade"
                  value={formData.unidade_medida}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unidade_medida: e.target.value,
                    })
                  }
                  className="!py-2.5 !px-3 bg-white h-[42px]"
                >
                  <option value="UN">Unidade (UN)</option>
                  <option value="L">Litro (L)</option>
                  <option value="KG">Quilo (KG)</option>
                  <option value="KIT">Kit</option>
                  <option value="PAR">Par</option>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Modelo"
                  value={formData.modelo}
                  onChange={(e) =>
                    setFormData({ ...formData, modelo: e.target.value })
                  }
                  placeholder="Ex: Palio, Gol..."
                />
                <Input
                  label="Localização"
                  value={formData.localizacao}
                  onChange={(e) =>
                    setFormData({ ...formData, localizacao: e.target.value })
                  }
                  placeholder="Prateleira A..."
                />
                <div className="relative">
                  <CategoriaCombobox
                    categorias={categorias}
                    selectedId={formData.id_categoria}
                    onChange={(val) => setFormData({ ...formData, id_categoria: val })}
                    onManageClick={() => setShowCatModal(true)}
                  />
                </div>
              </div>
              <TextArea
                label="Descrição / Notas"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                className="h-24 resize-none"
                placeholder="Detalhes adicionais..."
              />
            </div>

            <div className="space-y-4 bg-neutral-50 p-6 rounded-xl border border-neutral-100">
              <h4 className="text-sm font-bold text-neutral-800 uppercase tracking-wide border-b border-neutral-200 pb-2">
                Valores e Estoque Atual
              </h4>
              <div className="grid grid-cols-2 gap-6">
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
                  className="text-center font-bold"
                />
                <Input
                  label="Aviso Estoque (Mín)"
                  type="number"
                  value={formData.estoque_minimo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estoque_minimo: e.target.value,
                    })
                  }
                  className="text-center font-bold text-orange-600 border-orange-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <Input
                  label="Custo Médio (R$)"
                  type="number"
                  step="0.01"
                  value={formData.valor_custo}
                  onChange={(e) =>
                    setFormData({ ...formData, valor_custo: e.target.value })
                  }
                  className="text-right font-medium text-neutral-600"
                />
                <Input
                  label="Valor Venda (R$)"
                  type="number"
                  step="0.01"
                  value={formData.valor_venda}
                  onChange={(e) => handleRecalcMargin(e.target.value)}
                  className="text-right font-bold border-emerald-200 bg-emerald-50 text-emerald-700"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-8 mt-6 border-t border-neutral-100">
            <Button
              type="button"
              onClick={() => setConfirmModal({ show: true })}
              variant="danger"
              icon={temHistorico ? Ban : Trash2}
              className="opacity-70 hover:opacity-100"
            >
              {temHistorico ? "Inativar Peça" : "Excluir do Catálogo"}
            </Button>

            <Button
              type="submit"
              variant="primary"
              icon={CheckCircle}
              isLoading={loading}
              className="px-8"
            >
              Salvar Alterações
            </Button>
          </div>
        </Card>
      </form>

      {/* SEÇÃO 2: HISTÓRICO DE MOVIMENTAÇÕES */}
      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-1 px-1">
          <h3 className="text-lg font-bold text-neutral-800 uppercase tracking-tight">
            Histórico de Movimentações
          </h3>
          <p className="text-sm text-neutral-500">
            Registro imutável de todas as entradas, saídas, ajustes e estornos associados a esta peça.
          </p>
        </div>

        <Card className="p-0 overflow-hidden border-neutral-200">
          <PecaHistoricoTable
            movimentacoes={historico?.data || []}
            total={historico?.total || 0}
            page={historicoPage}
            limit={10}
            onPageChange={setHistoricoPage}
            isLoading={loadingHistorico}
          />
        </Card>
      </div>

      {/* MODAL DE AJUSTE RÁPIDO DE SALDO */}
      {showAjusteModal && (
        <Modal
          title="Ajuste Rápido de Saldo"
          onClose={() => setShowAjusteModal(false)}
          className="max-w-md"
        >
          <form onSubmit={handleAjustarSaldo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Tipo de Ajuste
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAjusteTipo("ADD")}
                  className={`py-2 px-3 rounded-lg font-bold text-sm border transition-all ${
                    ajusteTipo === "ADD"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                      : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  Adicionar (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAjusteTipo("REMOVE")}
                  className={`py-2 px-3 rounded-lg font-bold text-sm border transition-all ${
                    ajusteTipo === "REMOVE"
                      ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20"
                      : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  Remover (-)
                </button>
              </div>
            </div>

            <Input
              label="Quantidade"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 5"
              value={ajusteQtd}
              onChange={(e) => setAjusteQtd(e.target.value)}
              required
            />

            <TextArea
              label="Motivo / Justificativa (Obrigatório)"
              placeholder="Ex: Peça danificada, encontrada no estoque, uso interno..."
              value={ajusteMotivo}
              onChange={(e) => setAjusteMotivo(e.target.value)}
              className="h-24 resize-none"
              required
            />

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
              <Button
                type="button"
                onClick={() => setShowAjusteModal(false)}
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={loadingAjuste}
                className={ajusteTipo === "ADD" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
              >
                Confirmar Ajuste
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false })}
        onConfirm={executeDelete}
        title={temHistorico ? "Inativar Peça" : "Excluir Item"}
        description={
          temHistorico
            ? `"${peca.nome}" possui histórico de movimentações e não pode ser removida permanentemente. Ela será INATIVADA e ocultada da listagem, mas permanecerá no sistema para fins de auditoria.`
            : `Tem certeza que deseja remover "${peca.nome}" permanentemente? Esta ação não pode ser desfeita.`
        }
        variant="danger"
      />
      <CategoriaEstoqueManagerModal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        onUpdate={loadCategorias}
      />
    </PageLayout>
  );
};

