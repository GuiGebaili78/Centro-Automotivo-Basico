import { useState, useEffect, useRef } from "react";
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
  Hash,
  Calendar,
  Palette,
} from "lucide-react";

import { Modal } from "../components/ui/Modal";
import { ActionButton } from "../components/ui/ActionButton";
import { VeiculoForm } from "../components/forms/VeiculoForm";
import type { FormEvent } from "react";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { OsCreationModal } from "../components/shared/os/OsCreationModal";
import { ClienteDataForm } from "../components/forms/ClienteDataForm";

import { ClienteService } from "../services/cliente.service";
import { VeiculoService } from "../services/veiculo.service";
import type { IVeiculo } from "../types/backend";

export const CadastroUnificadoPage = () => {
  const navigate = useNavigate();
  const { clienteId } = useParams();
  const isEditMode = !!clienteId;

  const [loading, setLoading] = useState(false);

  // --- Client State ---
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefone2, setTelefone2] = useState("");
  const [email, setEmail] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complLogradouro, setComplLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("São Paulo");
  const [estado, setEstado] = useState("SP");
  const [cep, setCep] = useState("");

  // --- Vehicle State ---
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [anoModelo, setAnoModelo] = useState("");
  const [combustivel, setCombustivel] = useState("Flex");
  const [chassi, setChassi] = useState("");
  const [veiculos, setVeiculos] = useState<IVeiculo[]>([]);

  // Modals
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<IVeiculo | null>(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState<
    number | null
  >(null);

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [savedData, setSavedData] = useState<{
    clientId: number;
    vehicleId?: number | null;
    clientName: string;
    vehicleName?: string;
  } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const vehicleInputRef = useRef<HTMLInputElement>(null);

  // Initial Load (Edit Mode)
  useEffect(() => {
    if (isEditMode) {
      loadClienteData();
    } else {
      if (nameRef.current) nameRef.current.focus();
    }
  }, [clienteId]);

  const loadClienteData = async () => {
    try {
      setLoading(true);
      const data = await ClienteService.getById(Number(clienteId));

      // Fill Client Data
      setTelefone(data.telefone_1 || "");
      setTelefone2(data.telefone_2 || "");
      setEmail(data.email || "");
      setLogradouro(data.logradouro || "");
      setNumero(data.nr_logradouro || "");
      setComplLogradouro(data.compl_logradouro || "");
      setBairro(data.bairro || "");
      setCidade(data.cidade || "");
      setEstado(data.estado || "");
      setCep(data.cep || ""); // Not in response sometimes? backend fields check required

      if (data.pessoa_fisica) {
        setTipoPessoa("PF");
        setNome(data.pessoa_fisica.pessoa?.nome || "");
        setCpf(data.pessoa_fisica.cpf || "");
      } else if (data.pessoa_juridica) {
        setTipoPessoa("PJ");
        setRazaoSocial(data.pessoa_juridica.razao_social || "");
        setNomeFantasia(data.pessoa_juridica.nome_fantasia || "");
        setCnpj(data.pessoa_juridica.cnpj || "");
        setIe(data.pessoa_juridica.inscricao_estadual || "");
      }

      // Load Vehicles
      if (data.veiculos) {
        setVeiculos(data.veiculos);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados do cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cepRaw = cep.replace(/\D/g, "");
    if (cepRaw.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepRaw}/json/`,
        );
        const data = await response.json();
        if (!data.erro) {
          setLogradouro(data.logradouro);
          setBairro(data.bairro);
          setCidade(data.localidade);
          setEstado(data.uf);
          // Focus number input after auto-fill
          const numeroInput = document.getElementById("nr_logradouro");
          if (numeroInput) numeroInput.focus();
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalClientId = clienteId ? Number(clienteId) : null;

      if (isEditMode && finalClientId) {
        // UPDATE CLIENT
        await ClienteService.update(finalClientId, {
          telefone_1: telefone,
          telefone_2: telefone2,
          email,
          logradouro,
          nr_logradouro: numero,
          compl_logradouro: complLogradouro,
          bairro,
          cidade,
          estado,
          cep,
          tipo_pessoa: tipoPessoa === "PF" ? 1 : 2,
        });
        toast.success("Dados atualizados com sucesso!");
      } else {
        // CREATE CLIENT FULL
        const newClient = await ClienteService.createFull({
          tipo_pessoa: tipoPessoa === "PF" ? 1 : 2,
          nome,
          razao_social: razaoSocial,
          nome_fantasia: nomeFantasia,
          cpf,
          cnpj,
          inscricao_estadual: ie,
          telefone_1: telefone,
          telefone_2: telefone2,
          email,
          logradouro,
          nr_logradouro: numero,
          compl_logradouro: complLogradouro,
          bairro,
          cidade,
          estado,
          cep,
        });
        finalClientId = newClient.id_cliente;
      }

      // 2. Create Vehicle if provided
      let finalVehicleId = null;
      if (!isEditMode && finalClientId && (placa || modelo)) {
        const vehiclePayload = {
          id_cliente: finalClientId,
          placa: normalizePlate(placa),
          marca,
          modelo,
          cor,
          ano_modelo: anoModelo,
          combustivel,
          chassi,
        };
        const newVehicle = await VeiculoService.create(vehiclePayload);
        finalVehicleId = newVehicle.id_veiculo;
      }

      // 3. Redirect Logic
      if (!isEditMode && finalClientId) {
        toast.success("Cadastro realizado! O que deseja fazer?");

        setSavedData({
          clientId: finalClientId,
          vehicleId: finalVehicleId,
          clientName: tipoPessoa === "PF" ? nome : razaoSocial,
          vehicleName: placa || modelo ? `${modelo} - ${placa}` : undefined,
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
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erro ao remover veículo.";
      toast.error(errorMessage);
      setConfirmDeleteVehicle(null);
    }
  };

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
        {/* --- COLUNA ESQUERDA: CLIENTE FORM COMPONENT --- */}
        <div className="space-y-6">
          <ClienteDataForm
            tipoPessoa={tipoPessoa}
            setTipoPessoa={setTipoPessoa}
            isEditMode={isEditMode}
            nome={nome}
            setNome={setNome}
            cpf={cpf}
            setCpf={setCpf}
            razaoSocial={razaoSocial}
            setRazaoSocial={setRazaoSocial}
            nomeFantasia={nomeFantasia}
            setNomeFantasia={setNomeFantasia}
            cnpj={cnpj}
            setCnpj={setCnpj}
            ie={ie}
            setIe={setIe}
            telefone={telefone}
            setTelefone={setTelefone}
            telefone2={telefone2}
            setTelefone2={setTelefone2}
            email={email}
            setEmail={setEmail}
            cep={cep}
            setCep={setCep}
            logradouro={logradouro}
            setLogradouro={setLogradouro}
            numero={numero}
            setNumero={setNumero}
            complLogradouro={complLogradouro}
            setComplLogradouro={setComplLogradouro}
            bairro={bairro}
            setBairro={setBairro}
            cidade={cidade}
            setCidade={setCidade}
            handleCepBlur={handleCepBlur}
            nameRef={nameRef}
          />
        </div>

        {/* --- COLUNA DIREITA: VEÍCULO --- */}
        <div className="space-y-6">
          <div className="bg-neutral-25 p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6 h-full">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-800 font-medium flex-1">
                    Preencha os dados do veículo agora para agilizar a abertura
                    da OS.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative">
                  <div className="relative">
                    <Input
                      label="Placa *"
                      icon={Hash}
                      ref={vehicleInputRef}
                      value={placa}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPlaca(val);
                      }}
                      maxLength={7}
                      placeholder="ABC1234"
                      required={!isEditMode}
                      className="font-mono font-bold tracking-widest uppercase"
                    />
                  </div>

                  <Input
                    label="Marca *"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    required={!isEditMode && !!placa}
                    className="bg-neutral-25"
                  />
                  <div className="col-span-2">
                    <Input
                      label="Chassi"
                      value={chassi}
                      onChange={(e) => setChassi(e.target.value)}
                      className="bg-neutral-25"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Modelo *"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      required={!isEditMode && !!placa}
                      className="bg-neutral-25"
                    />
                  </div>
                  <Input
                    label="Cor *"
                    icon={Palette}
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    required={!isEditMode && !!placa}
                    className="bg-neutral-25"
                  />
                  <Input
                    label="Ano"
                    icon={Calendar}
                    type="number"
                    value={anoModelo}
                    onChange={(e) => setAnoModelo(e.target.value)}
                    className="bg-neutral-25"
                  />
                  <div className="col-span-2">
                    <label className="text-sm font-semibold text-neutral-700 ml-1 mb-1 block">
                      Combustível
                    </label>
                    <select
                      value={combustivel}
                      onChange={(e) => setCombustivel(e.target.value)}
                      className="select select-bordered w-full border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl bg-neutral-25"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="GNV">GNV</option>
                      <option value="Elétrico">Elétrico</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Save Button */}
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

      {/* MODAL EDIT VEHICLE (ONLY IN EDIT MODE) */}
      {showVehicleModal && clienteId && (
        <Modal
          title={editingVehicle ? "Editar Veículo" : "Novo Veículo"}
          onClose={() => setShowVehicleModal(false)}
        >
          <VeiculoForm
            clientId={Number(clienteId)}
            vehicleId={editingVehicle?.id_veiculo}
            initialData={editingVehicle}
            onSuccess={() => {
              setShowVehicleModal(false);
              loadClienteData();
              toast.success("Veículo salvo com sucesso!");
            }}
            onCancel={() => setShowVehicleModal(false)}
          />
        </Modal>
      )}

      {/* CONFIRM DELETE VEHICLE */}
      <ConfirmModal
        isOpen={!!confirmDeleteVehicle}
        onClose={() => setConfirmDeleteVehicle(null)}
        onConfirm={handleDeleteVehicle}
        title="Excluir Veículo"
        description="Tem certeza que deseja excluir este veículo?"
        variant="danger"
      />

      <OsCreationModal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        onSelect={(type) => {
          if (!savedData) return;
          const initialStatus = type === "ORCAMENTO" ? "ORCAMENTO" : "ABERTA";

          const params = new URLSearchParams();
          params.append("clientId", savedData.clientId.toString());
          if (savedData.vehicleId) {
            params.append("vehicleId", savedData.vehicleId.toString());
          }
          params.append("initialStatus", initialStatus);

          navigate(`/ordem-de-servico?${params.toString()}`);
        }}
        clientName={savedData?.clientName}
        vehicleName={savedData?.vehicleName}
      />
    </div>
  );
};
