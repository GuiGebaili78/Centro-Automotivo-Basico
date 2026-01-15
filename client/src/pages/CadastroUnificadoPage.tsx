import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api"; // Correct import path
import { formatNameTitleCase, normalizePlate } from "../utils/normalize"; // Correct import path
import {
  User,
  Car,
  CheckCircle,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Search,
} from "lucide-react";

import { StatusBanner } from "../components/ui/StatusBanner"; // Correct import path
import { Modal } from "../components/ui/Modal"; // Correct import path
import { VeiculoForm } from "../components/forms/VeiculoForm"; // Correct import path
import type { FormEvent } from "react";

// Interfaces (Simplified)
interface IVeiculo {
  id_veiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano_modelo: string;
  id_cliente: number;
}

export const CadastroUnificadoPage = () => {
  const navigate = useNavigate();
  const { clienteId } = useParams(); // For Edit Mode if route is /cadastro/:clienteId
  const isEditMode = !!clienteId;

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error" | null;
    text: string;
  }>({ type: null, text: "" });

  // --- CLIENT STATE ---
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");

  // Contact & Address
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

  // --- VEHICLE STATE (Only used in Creation Mode) ---
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [anoModelo, setAnoModelo] = useState("");
  const [combustivel, setCombustivel] = useState("Flex");

  // --- VEHICLE LIST STATE (Only used in Edit Mode) ---
  const [veiculos, setVeiculos] = useState<IVeiculo[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<IVeiculo | null>(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState<
    number | null
  >(null);

  // Refs
  const nameRef = useRef<HTMLInputElement>(null);

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
      const response = await api.get(`/cliente/${clienteId}`);
      const data = response.data;

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
      setCep(data.cep || "");

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
      setStatusMsg({
        type: "error",
        text: "Erro ao carregar dados do cliente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cepRaw = cep.replace(/\D/g, "");
    if (cepRaw.length === 8) {
      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepRaw}/json/`
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
      // 1. Save/Update Client
      let finalClientId = clienteId ? Number(clienteId) : null;

      if (isEditMode && finalClientId) {
        // UPDATE CLIENT
        const clientePayload = {
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
        };
        await api.put(`/cliente/${finalClientId}`, clientePayload);
        setStatusMsg({
          type: "success",
          text: "Dados atualizados com sucesso!",
        });
      } else {
        // CREATE CLIENT (Logic from ClienteForm)
        // A. Base Pessoa
        const pessoaPayload = {
          nome: formatNameTitleCase(tipoPessoa === "PF" ? nome : razaoSocial),
          genero: null,
          dt_nascimento: null,
          obs: "",
        };
        const pessoaRes = await api.post("/pessoa", pessoaPayload);
        const idPessoa = pessoaRes.data.id_pessoa;

        // B. Specific Type
        let fkId = null;
        let fkField = "";
        if (tipoPessoa === "PF") {
          const pfPayload = {
            id_pessoa: idPessoa,
            cpf: cpf ? cpf.replace(/\D/g, "") : null,
          };
          const pfRes = await api.post("/pessoa-fisica", pfPayload);
          fkId = pfRes.data.id_pessoa_fisica;
          fkField = "id_pessoa_fisica";
        } else {
          const pjPayload = {
            id_pessoa: idPessoa,
            razao_social: formatNameTitleCase(razaoSocial),
            nome_fantasia: nomeFantasia
              ? formatNameTitleCase(nomeFantasia)
              : null,
            cnpj: cnpj ? cnpj.replace(/\D/g, "") : null,
            inscricao_estadual: ie,
          };
          const pjRes = await api.post("/pessoa-juridica", pjPayload);
          fkId = pjRes.data.id_pessoa_juridica;
          fkField = "id_pessoa_juridica";
        }

        // C. Create Cliente
        const clientePayload = {
          [fkField]: fkId,
          tipo_pessoa: 1,
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
        };
        const clienteRes = await api.post("/cliente", clientePayload);
        finalClientId = clienteRes.data.id_cliente;
      }

      // 2. Create Vehicle (Only in Creation Mode or if filled)
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
          chassi: "", // Optional for quick registry
        };
        const vehicleRes = await api.post("/veiculo", vehiclePayload);
        finalVehicleId = vehicleRes.data.id_veiculo;
      }

      // 3. Redirect Logic
      // "Após salvar o novo cadastro, vai direto para o passo 3 para validação"
      // Path: /ordem-de-servico?startWizard=true&clientId=X&vehicleId=Y&step=CONFIRM
      if (!isEditMode && finalClientId) {
        setStatusMsg({
          type: "success",
          text: "Cadastro realizado! Redirecionando...",
        });
        setTimeout(() => {
          let url = `/ordem-de-servico?clientId=${finalClientId}`;
          if (finalVehicleId) {
            url += `&vehicleId=${finalVehicleId}`;
          }
          navigate(url);
        }, 1000);
      }
    } catch (error: any) {
      console.error(error);
      setStatusMsg({
        type: "error",
        text:
          "Erro ao salvar cadastro: " +
          (error.response?.data?.error || error.message),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vId: number) => {
    try {
      await api.delete(`/veiculo/${vId}`);
      setVeiculos((prev) => prev.filter((v) => v.id_veiculo !== vId));
      setConfirmDeleteVehicle(null);
      setStatusMsg({ type: "success", text: "Veículo removido." });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Erro ao remover veículo.";
      setStatusMsg({ type: "error", text: errorMessage });
      setConfirmDeleteVehicle(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {statusMsg.text && (
        <div className="fixed bottom-8 right-8 z-50">
          <StatusBanner
            msg={statusMsg}
            onClose={() => setStatusMsg({ type: null, text: "" })}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-600"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-500">
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
        {/* --- LEFT COL: CLIENTE --- */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
              <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                <User size={20} />
              </div>
              <h2 className="font-bold text-lg text-neutral-500">
                Dados do Cliente
              </h2>
            </div>

            {/* Tipo Pessoa Switch */}
            <div className="flex bg-neutral-100 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => !isEditMode && setTipoPessoa("PF")}
                disabled={isEditMode}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  tipoPessoa === "PF"
                    ? "bg-white shadow text-primary-600"
                    : "text-neutral-500"
                } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Pessoa Física
              </button>
              <button
                type="button"
                onClick={() => !isEditMode && setTipoPessoa("PJ")}
                disabled={isEditMode}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  tipoPessoa === "PJ"
                    ? "bg-white shadow text-accent-600"
                    : "text-neutral-500"
                } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Pessoa Jurídica
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tipoPessoa === "PF" ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Nome Completo *
                    </label>
                    <input
                      ref={nameRef}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-medium"
                      required
                      disabled={isEditMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      CPF
                    </label>
                    <input
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Razão Social *
                    </label>
                    <input
                      ref={nameRef}
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-50 transition-all font-medium"
                      required
                      disabled={isEditMode}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Nome Fantasia
                    </label>
                    <input
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-accent-500 transition-all"
                      disabled={isEditMode}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                        CNPJ
                      </label>
                      <input
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-accent-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                        IE
                      </label>
                      <input
                        value={ie}
                        onChange={(e) => setIe(e.target.value)}
                        className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-accent-500 transition-all"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Telefone Principal *
                  </label>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Telefone 2
                  </label>
                  <input
                    value={telefone2}
                    onChange={(e) => setTelefone2(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      onBlur={handleCepBlur}
                      className="w-full border border-neutral-200 pl-3 pr-8 py-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-mono"
                      placeholder="00000-000"
                    />
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Logradouro
                  </label>
                  <input
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Número
                  </label>
                  <input
                    id="nr_logradouro"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Complemento
                  </label>
                  <input
                    value={complLogradouro}
                    onChange={(e) => setComplLogradouro(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Bairro
                  </label>
                  <input
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                    Cidade
                  </label>
                  <input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COL: VEÍCULO --- */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6 h-full">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
                  <Car size={20} />
                </div>
                <h2 className="font-bold text-lg text-neutral-500">
                  {isEditMode ? "Veículos Cadastrados" : "Dados do Veículo"}
                </h2>
              </div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingVehicle(null);
                    setShowVehicleModal(true);
                  }}
                  className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={14} /> NOVO VEÍCULO
                </button>
              )}
            </div>

            {isEditMode ? (
              /* --- EDIT MODE: VEHICLE LIST --- */
              <div className="space-y-3">
                {veiculos.length > 0 ? (
                  veiculos.map((v) => (
                    <div
                      key={v.id_veiculo}
                      className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex justify-between items-center group hover:border-primary-300 hover:bg-white transition-all"
                    >
                      <div>
                        <p className="font-bold text-neutral-500 uppercase font-mono">
                          {v.placa}
                        </p>
                        <p className="text-xs font-bold text-neutral-500 uppercase">
                          {v.marca} {v.modelo} • {v.cor}
                        </p>
                      </div>
                      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVehicle(v);
                            setShowVehicleModal(true);
                          }}
                          className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteVehicle(v.id_veiculo)}
                          className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
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
              /* --- CREATE MODE: VEHICLE FORM --- */
              <div className="space-y-4">
                <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 mb-2">
                  <p className="text-xs text-primary-700 font-medium">
                    Preencha os dados do veículo agora para agilizar a abertura
                    da OS.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Placa *
                    </label>
                    <input
                      value={placa}
                      onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                      maxLength={7}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all font-mono font-bold tracking-wider uppercase"
                      placeholder="ABC1234"
                      required={!isEditMode} // Required on creation
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Marca *
                    </label>
                    <input
                      value={marca}
                      onChange={(e) => setMarca(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-medium"
                      required={!isEditMode && !!placa}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Modelo *
                    </label>
                    <input
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-medium"
                      required={!isEditMode && !!placa}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Cor *
                    </label>
                    <input
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-medium"
                      required={!isEditMode && !!placa}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Ano
                    </label>
                    <input
                      type="number"
                      value={anoModelo}
                      onChange={(e) => setAnoModelo(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-medium"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">
                      Combustível
                    </label>
                    <select
                      value={combustivel}
                      onChange={(e) => setCombustivel(e.target.value)}
                      className="w-full border border-neutral-200 p-2.5 rounded-xl outline-none focus:border-primary-500 transition-all font-medium"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="GNV">GNV</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="col-span-1 lg:col-span-2 flex justify-end pt-4 border-t border-neutral-200">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 bg-primary-900 text-white font-black rounded-xl hover:bg-primary-800 hover:scale-105 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 text-lg"
          >
            {loading ? (
              "Salvando..."
            ) : isEditMode ? (
              <>
                <Save size={24} /> SALVAR ALTERAÇÕES
              </>
            ) : (
              <>
                <CheckCircle size={24} /> SALVAR NOVO CADASTRO
              </>
            )}
          </button>
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
              loadClienteData(); // Reload to update list
              setStatusMsg({
                type: "success",
                text: "Veículo salvo com sucesso!",
              });
            }}
            onCancel={() => setShowVehicleModal(false)}
          />
        </Modal>
      )}

      {/* CONFIRM DELETE VEHICLE */}
      {confirmDeleteVehicle && (
        <Modal
          title="Excluir Veículo"
          onClose={() => setConfirmDeleteVehicle(null)}
        >
          <div className="space-y-4">
            <p>Tem certeza que deseja excluir este veículo?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteVehicle(null)}
                className="px-4 py-2 font-bold text-neutral-500 hover:bg-neutral-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteVehicle(confirmDeleteVehicle)}
                className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
