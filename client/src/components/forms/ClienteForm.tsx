import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { api } from "../../services/api";
import { formatNameTitleCase } from "../../utils/normalize";
import { CheckCircle, AlertCircle, CarFront } from "lucide-react";

interface ClienteFormProps {
  clientId?: number;
  initialData?: any;
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
  onRegisterVehicle?: (client: any) => void;
}

export const ClienteForm = ({
  clientId,
  initialData,
  onSuccess,
  onCancel,
  onRegisterVehicle,
}: ClienteFormProps) => {
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">("PF");
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [createdClient, setCreatedClient] = useState<any>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [ie, setIe] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  // Address
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("São Paulo");
  const [estado, setEstado] = useState("SP");

  // Optional Fields
  const [genero, setGenero] = useState("");
  const [dtNascimento, setDtNascimento] = useState("");
  const [obs, setObs] = useState("");

  // PJ Optional
  const [nomeFantasia, setNomeFantasia] = useState("");

  // Contacts
  const [telefone2, setTelefone2] = useState("");
  const [telefone3, setTelefone3] = useState("");

  // Address Optional
  const [complLogradouro, setComplLogradouro] = useState("");

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [tipoPessoa]);

  useEffect(() => {
    if (initialData) {
      // Address & Contact (Always present on Cliente)
      setTelefone(initialData.telefone_1 || "");
      setTelefone2(initialData.telefone_2 || "");
      setTelefone3(initialData.telefone_3 || "");
      setEmail(initialData.email || "");
      setLogradouro(initialData.logradouro || "");
      setNumero(initialData.nr_logradouro || "");
      setComplLogradouro(initialData.compl_logradouro || "");
      setBairro(initialData.bairro || "");
      setCidade(initialData.cidade || "");
      setEstado(initialData.estado || "");

      // Person Type Specific
      if (initialData.pessoa_fisica) {
        setTipoPessoa("PF");
        const pf = initialData.pessoa_fisica;
        setNome(pf.pessoa?.nome || "");
        setCpf(pf.cpf || "");
        setGenero(pf.pessoa?.genero || "");
        if (pf.pessoa?.dt_nascimento) {
          setDtNascimento(
            new Date(pf.pessoa.dt_nascimento).toISOString().split("T")[0],
          );
        }
      } else if (initialData.pessoa_juridica) {
        setTipoPessoa("PJ");
        const pj = initialData.pessoa_juridica;
        setRazaoSocial(pj.razao_social || "");
        setNomeFantasia(pj.nome_fantasia || "");
        setCnpj(pj.cnpj || "");
        setIe(pj.inscricao_estadual || "");
      }
    }
  }, [initialData]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormStatus({ type: null, message: "" });

    // EDIT MODE
    if (clientId && initialData) {
      try {
        const clientePayload = {
          telefone_1: telefone,
          telefone_2: telefone2,
          telefone_3: telefone3,
          email,
          logradouro,
          nr_logradouro: numero,
          compl_logradouro: complLogradouro,
          bairro,
          cidade,
          estado,
        };

        const response = await api.put(`/cliente/${clientId}`, clientePayload);
        setFormStatus({
          type: "success",
          message: "Dados do cliente atualizados com sucesso!",
        });
        setTimeout(() => onSuccess(response.data), 1500);
      } catch (error: any) {
        console.error(error);
        setFormStatus({
          type: "error",
          message:
            "Erro ao atualizar cliente: " +
            (error.response?.data?.error || error.message),
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // CREATE MODE
    try {
      // 1. Create Base Pessoa (normalize name to Title Case)
      const pessoaPayload = {
        nome: formatNameTitleCase(tipoPessoa === "PF" ? nome : razaoSocial),
        genero: tipoPessoa === "PF" ? genero : null,
        dt_nascimento: dtNascimento ? new Date(dtNascimento) : null,
        obs,
      };
      const pessoaRes = await api.post("/pessoa", pessoaPayload);
      const idPessoa = pessoaRes.data.id_pessoa;

      if (!idPessoa) throw new Error("Falha ao criar Pessoa base.");

      let fkId = null;
      let fkField = "";

      // 2. Create Specific Person Type (normalize CPF/CNPJ)
      if (tipoPessoa === "PF") {
        const pfPayload = {
          id_pessoa: idPessoa,
          cpf: cpf ? cpf.replace(/\D/g, "") : null, // Remove non-digits
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
          cnpj: cnpj ? cnpj.replace(/\D/g, "") : null, // Remove non-digits
          inscricao_estadual: ie,
        };
        const pjRes = await api.post("/pessoa-juridica", pjPayload);
        fkId = pjRes.data.id_pessoa_juridica;
        fkField = "id_pessoa_juridica";
      }

      if (!fkId) {
        console.error(`Erro: FK ID não retornado para ${fkField}`);
        throw new Error(`Falha ao criar registro de Pessoa ${tipoPessoa}.`);
      }

      // 3. Create Cliente
      const clientePayload = {
        [fkField]: fkId,
        tipo_pessoa: 1, // 1 implies generic type/active
        telefone_1: telefone,
        telefone_2: telefone2,
        telefone_3: telefone3,
        email,
        logradouro,
        nr_logradouro: numero,
        compl_logradouro: complLogradouro,
        bairro,
        cidade,
        estado,
      };

      const clienteRes = await api.post("/cliente", clientePayload);
      if (!clienteRes.data || !clienteRes.data.id_cliente) {
        throw new Error("Cliente criado mas ID não retornado.");
      }

      setCreatedClient(clienteRes.data);
      setFormStatus({
        type: "success",
        message: "Cliente cadastrado com sucesso!",
      });

      // If the user doesn't want to register a vehicle, we auto-success in 3 seconds or they can click.
      if (!onRegisterVehicle) {
        setTimeout(() => onSuccess(clienteRes.data), 2000);
      }
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      setFormStatus({
        type: "error",
        message:
          "Erro ao cadastrar cliente: " +
          (error.response?.data?.error || error.message),
      });
    } finally {
      setLoading(false);
    }
  };

  if (formStatus.type === "success" && createdClient && onRegisterVehicle) {
    return (
      <div className="py-8 px-4 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-success-100 text-success-600 rounded-full flex items-center justify-center">
            <CheckCircle size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900">
              Cliente Cadastrado!
            </h3>
            <p className="text-neutral-500">
              Deseja cadastrar um veículo para este cliente agora?
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => onRegisterVehicle(createdClient)}
            className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 flex items-center justify-center gap-3"
          >
            <CarFront size={20} /> CADASTRAR VEÍCULO
          </button>
          <button
            onClick={() => onSuccess(createdClient)}
            className="w-full py-4 text-neutral-500 font-bold hover:bg-neutral-100 rounded-2xl transition-all"
          >
            Apenas concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-neutral-900">
      {formStatus.type && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${formStatus.type === "success" ? "bg-success-50 text-success-700 border border-success-100" : "bg-red-50 text-red-700 border border-red-100"}`}
        >
          {formStatus.type === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p className="text-sm font-bold">{formStatus.message}</p>
        </div>
      )}

      <div className="flex bg-neutral-100 p-1 rounded-lg mb-4 w-fit">
        <button
          type="button"
          onClick={() => !clientId && setTipoPessoa("PF")}
          disabled={!!clientId}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tipoPessoa === "PF" ? "bg-surface shadow text-primary-600" : "text-neutral-500"} ${clientId ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Pessoa Física
        </button>
        <button
          type="button"
          onClick={() => !clientId && setTipoPessoa("PJ")}
          disabled={!!clientId}
          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${tipoPessoa === "PJ" ? "bg-surface shadow text-primary-600" : "text-neutral-500"} ${clientId ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Pessoa Jurídica
        </button>
      </div>

      {/* 1. Base Pessoa Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tipoPessoa === "PF" ? (
          <>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Nome Completo {clientId && "(Leitura)"}
              </label>
              <input
                ref={firstInputRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 disabled:bg-neutral-100"
                required
                disabled={!!clientId}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                CPF {clientId && "(Leitura)"}
              </label>
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 disabled:bg-neutral-100"
                disabled={!!clientId}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Gênero
              </label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 disabled:bg-neutral-100"
                disabled={!!clientId}
              >
                <option value="">Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Data Nascimento
              </label>
              <input
                type="date"
                value={dtNascimento}
                onChange={(e) => setDtNascimento(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300 disabled:bg-neutral-100"
                disabled={!!clientId}
              />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Razão Social {clientId && "(Leitura)"}
              </label>
              <input
                ref={firstInputRef}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-accent-500/20 outline-none border-neutral-300 disabled:bg-neutral-100"
                required
                disabled={!!clientId}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Nome Fantasia
              </label>
              <input
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-accent-500/20 outline-none border-neutral-300 disabled:bg-neutral-100"
                disabled={!!clientId}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                CNPJ {clientId && "(Leitura)"}
              </label>
              <input
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-accent-500/20 outline-none border-neutral-300 disabled:bg-neutral-100"
                required
                disabled={!!clientId}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
                Inscr. Estadual
              </label>
              <input
                value={ie}
                onChange={(e) => setIe(e.target.value)}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-accent-500/20 outline-none border-neutral-300 disabled:bg-neutral-100"
                disabled={!!clientId}
              />
            </div>
          </>
        )}

        <div className="col-span-2">
          <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
            Observações (Pessoa)
          </label>
          <input
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-neutral-100 outline-none border-neutral-300"
          />
        </div>
      </div>

      {/* 2. Contact Data */}
      <div className="border-t border-neutral-200 pt-2 mt-2">
        <h4 className="text-sm font-bold text-neutral-500 mb-3 uppercase">
          Contatos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Telefone Principal *
            </label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Telefone 2
            </label>
            <input
              value={telefone2}
              onChange={(e) => setTelefone2(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Telefone 3
            </label>
            <input
              value={telefone3}
              onChange={(e) => setTelefone3(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-primary-100 outline-none border-neutral-300"
            />
          </div>
        </div>
      </div>

      {/* 3. Address Data */}
      <div className="border-t border-neutral-200 pt-2 mt-2">
        <h4 className="text-sm font-bold text-neutral-500 mb-3 uppercase">
          Endereço
        </h4>
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Logradouro
            </label>
            <input
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              className="w-full border p-2 rounded border-neutral-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Número
            </label>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full border p-2 rounded border-neutral-300"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Complemento
            </label>
            <input
              value={complLogradouro}
              onChange={(e) => setComplLogradouro(e.target.value)}
              className="w-full border p-2 rounded border-neutral-300"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Bairro
            </label>
            <input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="w-full border p-2 rounded border-neutral-300"
            />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              Cidade
            </label>
            <input
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="w-full border p-2 rounded border-neutral-300"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-neutral-600 uppercase mb-1">
              UF
            </label>
            <input
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              maxLength={2}
              className="w-full border p-2 rounded border-neutral-300 uppercase"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 text-neutral-600 font-bold hover:bg-neutral-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-primary-600 text-white font-black rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/30"
        >
          {loading
            ? "Salvando..."
            : clientId
              ? "Salvar Alterações"
              : "Salvar Cliente"}
        </button>
      </div>
    </form>
  );
};
