/**
 * CadastroUnificadoPage
 *
 * Arquitetura de Performance:
 *  ─ Estado da página: SOMENTE ui-state (loading, modais, lista de veículos).
 *  ─ Estado dos campos: TOTALMENTE INTERNO a ClienteFormSection e VeiculoFormSection.
 *  ─ No submit: a página "puxa" os dados via ref.current.getData() — zero prop drilling.
 *
 * Resultado: digitar em qualquer campo NÃO causa re-renderização dos componentes irmãos
 * nem da página pai.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { normalizePlate } from "../utils/normalize";
import { toast } from "react-toastify";
import {
  Car,
  CheckCircle,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";

import { OsStatus } from "../types/os.types";
import { Modal } from "../components/ui/Modal";
import { ActionButton } from "../components/ui/ActionButton";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import type { FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { OsCreationModal } from "../components/shared/os/OsCreationModal";

// ─── Novos componentes auto-gerenciados ───────────────────────────────────────
import {
  ClienteFormSection,
  type ClienteFormSectionRef,
  type ClienteFormData,
} from "../components/forms/ClienteFormSection";
import {
  VeiculoFormSection,
  type VeiculoFormSectionRef,
} from "../components/forms/VeiculoFormSection";

import { ClienteService } from "../services/cliente.service";
import { VeiculoService } from "../services/veiculo.service";
import type { IVeiculo } from "../types/backend";

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface SavedData {
  clientId: number;
  vehicleId?: number | null;
  clientName: string;
  vehicleName?: string;
}

// ─── Página ───────────────────────────────────────────────────────────────────

export const CadastroUnificadoPage = () => {
  const navigate = useNavigate();
  const { clienteId } = useParams();
  const isEditMode = !!clienteId;

  // ── UI-only state (formulários não ficam aqui) ──
  const [loading, setLoading] = useState(false);
  const [veiculos, setVeiculos] = useState<IVeiculo[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<IVeiculo | null>(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState<
    number | null
  >(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [savedData, setSavedData] = useState<SavedData | null>(null);

  // ── Dados iniciais para os formulários filhos (carregados do backend) ──
  const [initialClienteData, setInitialClienteData] = useState<
    Partial<ClienteFormData> | undefined
  >(undefined);

  // ── Refs para coletar dados no submit ──
  const clienteRef = useRef<ClienteFormSectionRef>(null);
  const veiculoRef = useRef<VeiculoFormSectionRef>(null);

  // ── Ref para autoFocus no campo de nome ──
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ─── Carregamento de dados (modo edição) ───────────────────────────────────

  const loadClienteData = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      const data = await ClienteService.getById(Number(clienteId));

      // Converte para o formato que ClienteFormSection entende
      const parsed: Partial<ClienteFormData> = {
        tipoPessoa: data.pessoa_fisica ? "PF" : "PJ",
        telefone: data.telefone_1 ?? "",
        telefone2: data.telefone_2 ?? "",
        email: data.email ?? "",
        logradouro: data.logradouro ?? "",
        numero: data.nr_logradouro ?? "",
        complLogradouro: data.compl_logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.cidade ?? "São Paulo",
        estado: data.estado ?? "SP",
        cep: data.cep ?? "",
      };

      if (data.pessoa_fisica) {
        parsed.nome = data.pessoa_fisica.pessoa?.nome ?? "";
        parsed.cpf = data.pessoa_fisica.cpf ?? "";
      } else if (data.pessoa_juridica) {
        parsed.razaoSocial = data.pessoa_juridica.razao_social ?? "";
        parsed.nomeFantasia = data.pessoa_juridica.nome_fantasia ?? "";
        parsed.cnpj = data.pessoa_juridica.cnpj ?? "";
        parsed.ie = data.pessoa_juridica.inscricao_estadual ?? "";
      }

      // Atualiza o estado que vai como prop para ClienteFormSection
      // (o useEffect interno do filho sincronizará sem causar re-renders extras)
      setInitialClienteData(parsed);

      if (data.veiculos) setVeiculos(data.veiculos);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    if (isEditMode) {
      loadClienteData();
    } else {
      // Foca no campo nome em modo de criação
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isEditMode, loadClienteData]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // "Pull" dos dados dos filhos — única chamada, sem estado duplicado
    const clienteData = clienteRef.current?.getData();
    const veiculoData = veiculoRef.current?.getData();

    if (!clienteData) {
      toast.error("Dados do cliente inválidos.");
      setLoading(false);
      return;
    }

    try {
      let finalClientId = clienteId ? Number(clienteId) : null;

      if (isEditMode && finalClientId) {
        // UPDATE
        await ClienteService.update(finalClientId, {
          telefone_1: clienteData.telefone,
          telefone_2: clienteData.telefone2,
          email: clienteData.email,
          logradouro: clienteData.logradouro,
          nr_logradouro: clienteData.numero,
          compl_logradouro: clienteData.complLogradouro,
          bairro: clienteData.bairro,
          cidade: clienteData.cidade,
          estado: clienteData.estado,
          cep: clienteData.cep,
          tipo_pessoa: clienteData.tipoPessoa === "PF" ? 1 : 2,
        });
        toast.success("Dados atualizados com sucesso!");
      } else {
        // CREATE
        const newClient = await ClienteService.createFull({
          tipo_pessoa: clienteData.tipoPessoa === "PF" ? 1 : 2,
          nome: clienteData.nome,
          razao_social: clienteData.razaoSocial,
          nome_fantasia: clienteData.nomeFantasia,
          cpf: clienteData.cpf,
          cnpj: clienteData.cnpj,
          inscricao_estadual: clienteData.ie,
          telefone_1: clienteData.telefone,
          telefone_2: clienteData.telefone2,
          email: clienteData.email,
          logradouro: clienteData.logradouro,
          nr_logradouro: clienteData.numero,
          compl_logradouro: clienteData.complLogradouro,
          bairro: clienteData.bairro,
          cidade: clienteData.cidade,
          estado: clienteData.estado,
          cep: clienteData.cep,
        });
        finalClientId = newClient.id_cliente;
      }

      // Cria veículo se informado (somente no cadastro novo)
      let finalVehicleId: number | null = null;
      if (!isEditMode && finalClientId && veiculoData) {
        const { placa, marca, modelo, cor, anoModelo, combustivel, chassi } =
          veiculoData;
        if (placa || modelo) {
          const newVehicle = await VeiculoService.create({
            id_cliente: finalClientId,
            placa: normalizePlate(placa),
            marca,
            modelo,
            cor,
            ano_modelo: anoModelo,
            combustivel,
            chassi,
          });
          finalVehicleId = newVehicle.id_veiculo;
        }
      }

      // Pós-criação: abre modal de decisão
      if (!isEditMode && finalClientId) {
        toast.success("Cadastro realizado! O que deseja fazer?");
        setSavedData({
          clientId: finalClientId,
          vehicleId: finalVehicleId,
          clientName:
            clienteData.tipoPessoa === "PF"
              ? clienteData.nome
              : clienteData.razaoSocial,
          vehicleName:
            veiculoData?.placa || veiculoData?.modelo
              ? `${veiculoData.modelo} - ${veiculoData.placa}`
              : undefined,
        });
        setDecisionModalOpen(true);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Erro ao salvar cadastro: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Veículos (modo edição) ────────────────────────────────────────────────

  const handleDeleteVehicle = async () => {
    if (!confirmDeleteVehicle) return;
    try {
      await VeiculoService.delete(confirmDeleteVehicle);
      setVeiculos((prev) =>
        prev.filter((v) => v.id_veiculo !== confirmDeleteVehicle),
      );
      setConfirmDeleteVehicle(null);
      toast.success("Veículo removido com sucesso!");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Erro ao remover veículo.",
      );
      setConfirmDeleteVehicle(null);
    }
  };

  const handleVeiculoSuccess = useCallback(() => {
    setShowVehicleModal(false);
    loadClienteData();
    toast.success("Veículo salvo com sucesso!");
  }, [loadClienteData]);

  const handleVeiculoCancel = useCallback(() => {
    setShowVehicleModal(false);
  }, []);

  // ─── OS navigation ─────────────────────────────────────────────────────────

  const handleOsSelect = useCallback(
    (status: OsStatus) => {
      if (!savedData) return;
      const params = new URLSearchParams();
      params.append("clientId", savedData.clientId.toString());
      if (savedData.vehicleId)
        params.append("vehicleId", savedData.vehicleId.toString());
      params.append("initialStatus", status);
      navigate(`/ordem-de-servico?${params.toString()}`);
    },
    [navigate, savedData],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">
            {isEditMode ? "Editar Cadastro" : "Novo Cadastro"}
          </h1>
          <p className="text-neutral-500 text-sm">
            {isEditMode
              ? "Atualize os dados do cliente e seus veículos."
              : "Cadastre o cliente e o veículo para abrir a OS."}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
      >
        {/* ─── COL ESQUERDA: Formulário do Cliente ─── */}
        <div className="space-y-6">
          {/*
           * ClienteFormSection é memo + forwardRef.
           * initialData só muda UMA vez (após o fetch), não a cada tecla.
           * Tipagem em nameInputRef aceita null (useRef<HTMLInputElement>).
           */}
          <ClienteFormSection
            ref={clienteRef}
            initialData={initialClienteData}
            isEditMode={isEditMode}
            nameInputRef={nameInputRef}
          />
        </div>

        {/* ─── COL DIREITA: Veículos / Formulário do Veículo ─── */}
        <div className="space-y-6">
          <div className="bg-neutral-25 p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6 h-full">
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                  <Car size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-800">
                  {isEditMode ? "Veículos Cadastrados" : "Dados do Veículo"}
                </h2>
              </div>
              {isEditMode && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  type="button"
                  onClick={() => {
                    setEditingVehicle(null);
                    setShowVehicleModal(true);
                  }}
                >
                  NOVO VEÍCULO
                </Button>
              )}
            </div>

            {isEditMode ? (
              /* Lista de veículos (somente edit mode) */
              <div className="space-y-3">
                {veiculos.length > 0 ? (
                  veiculos.map((v) => (
                    <div
                      key={v.id_veiculo}
                      className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex justify-between items-center group hover:border-primary-300 hover:bg-neutral-25 transition-all"
                    >
                      <div>
                        <p className="font-bold text-primary-900 uppercase font-mono">
                          {v.placa}
                        </p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">
                          {v.marca} {v.modelo} • {v.cor}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <ActionButton
                          icon={Edit}
                          label="Editar"
                          variant="neutral"
                          onClick={() => {
                            setEditingVehicle(v);
                            setShowVehicleModal(true);
                          }}
                        />
                        <ActionButton
                          icon={Trash2}
                          label="Excluir"
                          variant="danger"
                          onClick={() => setConfirmDeleteVehicle(v.id_veiculo)}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-400 italic text-sm">
                    Nenhum veículo cadastrado.
                  </div>
                )}
              </div>
            ) : (
              /*
               * VeiculoFormSection — memo + forwardRef.
               * Mudanças em ClienteFormSection NÃO causam re-render aqui.
               */
              <VeiculoFormSection ref={veiculoRef} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="col-span-1 lg:col-span-2 flex justify-end gap-4 pt-4 border-t border-neutral-200">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate(-1)}
            className="px-8 text-neutral-500 hover:text-neutral-700 font-bold"
          >
            CANCELAR
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={loading}
            icon={isEditMode ? Save : CheckCircle}
            className="px-12"
          >
            {isEditMode ? "SALVAR ALTERAÇÕES" : "SALVAR NOVO CADASTRO"}
          </Button>
        </div>
      </form>

      {/* Modal: Editar / Criar Veículo (somente edit mode) */}
      {showVehicleModal && clienteId && (
        <Modal
          title={editingVehicle ? "Editar Veículo" : "Novo Veículo"}
          onClose={handleVeiculoCancel}
        >
          <VeiculoForm
            clientId={Number(clienteId)}
            vehicleId={editingVehicle?.id_veiculo}
            initialData={editingVehicle}
            onSuccess={handleVeiculoSuccess}
            onCancel={handleVeiculoCancel}
          />
        </Modal>
      )}

      {/* Modal: Confirmar exclusão de veículo */}
      <ConfirmModal
        isOpen={!!confirmDeleteVehicle}
        onClose={() => setConfirmDeleteVehicle(null)}
        onConfirm={handleDeleteVehicle}
        title="Excluir Veículo"
        description="Tem certeza que deseja excluir este veículo?"
        variant="danger"
      />

      {/* Modal: Decisão pós-cadastro */}
      <OsCreationModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onSelect={handleOsSelect}
        clientName={savedData?.clientName}
        vehicleName={savedData?.vehicleName}
      />
    </div>
  );
};
