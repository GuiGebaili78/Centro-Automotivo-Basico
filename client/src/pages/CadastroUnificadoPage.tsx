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
import { VeiculoForm } from "../components/veiculos/Forms/VeiculoForm";
import type { FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { OsCreationModal } from "../components/os/OsCreationModal";

// ─── Novos componentes auto-gerenciados ───────────────────────────────────────
import {
  ClienteFormSection,
  type ClienteFormSectionRef,
  type ClienteFormData,
} from "../components/clientes/Forms/ClienteFormSection";
import {
  VeiculoFormSection,
  type VeiculoFormSectionRef,
} from "../components/veiculos/Forms/VeiculoFormSection";

import { ClienteService } from "../services/cliente.service";
import { VeiculoService } from "../services/veiculo.service";
import { EquipamentoService } from "../services/equipamento.service";
import type { IVeiculo, IEquipamentoCliente } from "../types/backend";
import { EquipamentoFormSection } from "../components/clientes/Forms/EquipamentoFormSection";

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

interface SavedData {
  clientId: number;
  vehicleId?: number | null;
  equipId?: number | null;
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
  const [equipamentos, setEquipamentos] = useState<IEquipamentoCliente[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<{ type: 'VEICULO' | 'EQUIPAMENTO', data: any } | null>(null);
  const [assetType, setAssetType] = useState<'VEICULO' | 'EQUIPAMENTO'>('VEICULO');
  
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<{
    id: number;
    type: 'VEICULO' | 'EQUIPAMENTO';
  } | null>(null);
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
      if (data.equipamentos) setEquipamentos(data.equipamentos);
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

      // Cria veículo ou equipamento se informado (somente no cadastro novo)
      let finalVehicleId: number | null = null;
      let finalEquipId: number | null = null;
      
      if (!isEditMode && finalClientId) {
        if (assetType === 'VEICULO' && veiculoRef.current) {
          const veiculoData = (veiculoRef.current as any).getData();
          if (veiculoData.placa || veiculoData.modelo) {
            const newVehicle = await VeiculoService.create({
              id_cliente: finalClientId,
              placa: normalizePlate(veiculoData.placa),
              marca: veiculoData.marca,
              modelo: veiculoData.modelo,
              cor: veiculoData.cor,
              ano_modelo: veiculoData.anoModelo,
              combustivel: veiculoData.combustivel,
              chassi: veiculoData.chassi,
            });
            finalVehicleId = newVehicle.id_veiculo;
          }
        } else if (assetType === 'EQUIPAMENTO' && veiculoRef.current) {
          const equipData = (veiculoRef.current as any).getData();
          if (equipData.nome_peca) {
            const newEquip = await EquipamentoService.create({
              ...equipData,
              id_cliente: finalClientId
            });
            finalEquipId = newEquip.id_equipamento;
          }
        }
      }

      // Pós-criação: abre modal de decisão
      if (!isEditMode && finalClientId) {
        toast.success("Cadastro realizado! O que deseja fazer?");
        
        // Se for equipamento, podemos passar o nome da peça para o modal de decisão
        let assetName = undefined;
        if (assetType === 'VEICULO') {
            const vData = (veiculoRef.current as any)?.getData();
            if (vData?.placa || vData?.modelo) assetName = `${vData.modelo} - ${vData.placa}`;
        } else {
            const eData = (veiculoRef.current as any)?.getData();
            if (eData?.nome_peca) assetName = eData.nome_peca;
        }

        setSavedData({
          clientId: finalClientId,
          vehicleId: finalVehicleId,
          equipId: finalEquipId,
          clientName:
            clienteData.tipoPessoa === "PF"
              ? clienteData.nome
              : clienteData.razaoSocial,
          vehicleName: assetName,
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

  // ─── Ativos (modo edição) ──────────────────────────────────────────────────

  const handleDeleteAsset = async () => {
    if (!confirmDeleteAsset) return;
    try {
      if (confirmDeleteAsset.type === 'VEICULO') {
        await VeiculoService.delete(confirmDeleteAsset.id);
        setVeiculos((prev) => prev.filter((v) => v.id_veiculo !== confirmDeleteAsset.id));
      } else {
        await EquipamentoService.delete(confirmDeleteAsset.id);
        setEquipamentos((prev) => prev.filter((e) => e.id_equipamento !== confirmDeleteAsset.id));
      }
      setConfirmDeleteAsset(null);
      toast.success(`${confirmDeleteAsset.type === 'VEICULO' ? 'Veículo' : 'Peça'} removido(a) com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao remover item.");
      setConfirmDeleteAsset(null);
    }
  };

  const handleAssetSuccess = useCallback(() => {
    setShowAssetModal(false);
    loadClienteData();
    toast.success("Salvo com sucesso!");
  }, [loadClienteData]);


  // ─── OS navigation ─────────────────────────────────────────────────────────

  const handleOsSelect = useCallback(
    (status: OsStatus) => {
      if (!savedData) return;
      const params = new URLSearchParams();
      params.append("clientId", savedData.clientId.toString());
      if (savedData.vehicleId)
        params.append("vehicleId", savedData.vehicleId.toString());
      if (savedData.equipId)
        params.append("equipId", savedData.equipId.toString());
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
                  {isEditMode ? "Patrimônio (Veículos/Peças)" : "Vincular Ativo"}
                </h2>
              </div>
              {isEditMode && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  type="button"
                  onClick={() => {
                    setEditingAsset(null);
                    setAssetType('VEICULO'); // Default choice
                    setShowAssetModal(true);
                  }}
                >
                  + NOVO
                </Button>
              )}
            </div>

            {isEditMode ? (
              /* Lista hibrida (edit mode) */
              <div className="space-y-6">
                {/* Veículos */}
                <div className="space-y-3">
                   <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Veículos ({veiculos.length})</h4>
                   {veiculos.map((v) => (
                    <div key={v.id_veiculo} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex justify-between items-center group hover:border-primary-300 hover:bg-neutral-25 transition-all">
                      <div>
                        <p className="font-bold text-primary-900 uppercase font-mono">{v.placa}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">{v.marca} {v.modelo}</p>
                      </div>
                      <div className="flex gap-1">
                        <ActionButton icon={Edit} label="Editar" variant="neutral" onClick={() => { setEditingAsset({type: 'VEICULO', data: v}); setAssetType('VEICULO'); setShowAssetModal(true); }} />
                        <ActionButton icon={Trash2} label="Excluir" variant="danger" onClick={() => setConfirmDeleteAsset({id: v.id_veiculo, type: 'VEICULO'})} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Peças Avulsas */}
                <div className="space-y-3 pt-4 border-t border-dashed border-neutral-200">
                   <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest pl-1">Peças Avulsas ({equipamentos.length})</h4>
                   {equipamentos.map((e) => (
                    <div key={e.id_equipamento} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex justify-between items-center group hover:border-blue-300 hover:bg-blue-25 transition-all">
                      <div>
                        <p className="font-bold text-blue-900 uppercase">{e.nome_peca}</p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">{e.fabricante || 'Fabricante N/I'}</p>
                      </div>
                      <div className="flex gap-1">
                        <ActionButton icon={Edit} label="Editar" variant="neutral" onClick={() => { setEditingAsset({type: 'EQUIPAMENTO', data: e}); setAssetType('EQUIPAMENTO'); setShowAssetModal(true); }} />
                        <ActionButton icon={Trash2} label="Excluir" variant="danger" onClick={() => setConfirmDeleteAsset({id: e.id_equipamento, type: 'EQUIPAMENTO' })} />
                      </div>
                    </div>
                  ))}
                  {equipamentos.length === 0 && <p className="text-center py-2 text-neutral-400 italic text-[11px]">Nenhuma peça cadastrada.</p>}
                </div>
              </div>
            ) : (
              /* Toggle tipo ativo (creation mode) */
              <div className="space-y-6">
                 <div className="flex bg-neutral-100 p-1 rounded-lg w-full">
                    {(['VEICULO', 'EQUIPAMENTO'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAssetType(t)}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${assetType === t ? 'bg-white shadow text-primary-600' : 'text-neutral-500'}`}
                      >
                        {t === 'VEICULO' ? 'Vincular Veículo' : 'Vincular Peça Avulsa'}
                      </button>
                    ))}
                 </div>
                 {assetType === 'VEICULO' ? <VeiculoFormSection ref={veiculoRef} /> : <EquipamentoFormSection ref={veiculoRef as any} />}
              </div>
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

      {/* Modal: Editar / Criar Ativo (somente edit mode) */}
      {showAssetModal && clienteId && (
        <Modal
          title={editingAsset ? `Editar ${assetType === 'VEICULO' ? 'Veículo' : 'Peça'}` : `Novo(a) ${assetType === 'VEICULO' ? 'Veículo' : 'Peça'}`}
          onClose={() => setShowAssetModal(false)}
        >
           {/* Seletor de tipo no modal de novo asset */}
           {!editingAsset && (
              <div className="flex bg-neutral-100 p-1 rounded-lg w-full mb-6">
                {(['VEICULO', 'EQUIPAMENTO'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAssetType(t)}
                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${assetType === t ? 'bg-white shadow text-primary-600' : 'text-neutral-500'}`}
                  >
                    {t === 'VEICULO' ? 'Veículo' : 'Peça Avulsa'}
                  </button>
                ))}
            </div>
           )}

           {assetType === 'VEICULO' ? (
              <VeiculoForm
                clientId={Number(clienteId)}
                vehicleId={editingAsset?.data?.id_veiculo}
                initialData={editingAsset?.data}
                onSuccess={handleAssetSuccess}
                onCancel={() => setShowAssetModal(false)}
              />
           ) : (
              <div className="space-y-6">
                <EquipamentoFormSection ref={veiculoRef as any} initialData={editingAsset?.data} />
                <div className="flex gap-2 pt-4 border-t border-neutral-100">
                  <Button variant="outline" className="flex-1" onClick={() => setShowAssetModal(false)}>Cancelar</Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    icon={Save}
                    isLoading={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const data = (veiculoRef.current as any).getData();
                        if (editingAsset) {
                          await EquipamentoService.update(editingAsset.data.id_equipamento, data);
                        } else {
                          await EquipamentoService.create({ ...data, id_cliente: Number(clienteId) });
                        }
                        handleAssetSuccess();
                      } catch (err) {
                        toast.error("Erro ao salvar equipamento.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Salvar Peça
                  </Button>
                </div>
              </div>
           )}
        </Modal>
      )}

      {/* Modal: Confirmar exclusão */}
      <ConfirmModal
        isOpen={!!confirmDeleteAsset}
        onClose={() => setConfirmDeleteAsset(null)}
        onConfirm={handleDeleteAsset}
        title={`Excluir ${confirmDeleteAsset?.type === 'VEICULO' ? 'Veículo' : 'Peça'}`}
        description={`Tem certeza que deseja excluir este item?`}
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
