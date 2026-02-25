import { memo } from "react";
import {
  User,
  Phone,
  Mail,
  Search,
  MapPin,
  Building2,
  Hash,
} from "lucide-react";
import { Input } from "../ui/Input";

interface ClienteDataFormProps {
  tipoPessoa: "PF" | "PJ";
  setTipoPessoa: (val: "PF" | "PJ") => void;
  isEditMode: boolean;
  nome: string;
  setNome: (val: string) => void;
  cpf: string;
  setCpf: (val: string) => void;
  razaoSocial: string;
  setRazaoSocial: (val: string) => void;
  nomeFantasia: string;
  setNomeFantasia: (val: string) => void;
  cnpj: string;
  setCnpj: (val: string) => void;
  ie: string;
  setIe: (val: string) => void;
  telefone: string;
  setTelefone: (val: string) => void;
  telefone2: string;
  setTelefone2: (val: string) => void;
  email: string;
  setEmail: (val: string) => void;
  cep: string;
  setCep: (val: string) => void;
  logradouro: string;
  setLogradouro: (val: string) => void;
  numero: string;
  setNumero: (val: string) => void;
  complLogradouro: string;
  setComplLogradouro: (val: string) => void;
  bairro: string;
  setBairro: (val: string) => void;
  cidade: string;
  setCidade: (val: string) => void;
  handleCepBlur: () => void;
  nameRef?: React.Ref<HTMLInputElement>;
}

export const ClienteDataForm = memo(
  ({
    tipoPessoa,
    setTipoPessoa,
    isEditMode,
    nome,
    setNome,
    cpf,
    setCpf,
    razaoSocial,
    setRazaoSocial,
    nomeFantasia,
    setNomeFantasia,
    cnpj,
    setCnpj,
    ie,
    setIe,
    telefone,
    setTelefone,
    telefone2,
    setTelefone2,
    email,
    setEmail,
    cep,
    setCep,
    logradouro,
    setLogradouro,
    numero,
    setNumero,
    complLogradouro,
    setComplLogradouro,
    bairro,
    setBairro,
    cidade,
    setCidade,
    handleCepBlur,
    nameRef,
  }: ClienteDataFormProps) => {
    return (
      <div className="bg-neutral-25 p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
          <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
            <User size={20} />
          </div>
          <h2 className="font-bold text-lg text-neutral-800">
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
                ? "bg-neutral-25 shadow text-primary-600"
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
                ? "bg-neutral-25 shadow text-primary-600"
                : "text-neutral-500"
            } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Pessoa Jurídica
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {tipoPessoa === "PF" ? (
            <>
              <Input
                label="Nome Completo *"
                icon={User}
                ref={nameRef}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do cliente"
                required
                disabled={isEditMode}
              />
              <Input
                label="CPF"
                icon={Hash}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                disabled={isEditMode}
              />
            </>
          ) : (
            <>
              <Input
                label="Razão Social *"
                icon={Building2}
                ref={nameRef}
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                placeholder="Nome da Empresa"
                required
                disabled={isEditMode}
              />
              <Input
                label="Nome Fantasia"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                placeholder="Nome Comercial"
                disabled={isEditMode}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
                <Input
                  label="IE"
                  value={ie}
                  onChange={(e) => setIe(e.target.value)}
                  placeholder="Inscrição Estadual"
                />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
          <Input
            label="Telefone Principal *"
            icon={Phone}
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            required
          />
          <Input
            label="Telefone 2"
            icon={Phone}
            value={telefone2}
            onChange={(e) => setTelefone2(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          <div className="sm:col-span-2">
            <Input
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-neutral-100">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="CEP"
              icon={Search}
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onBlur={handleCepBlur}
              placeholder="00000-000"
            />
            <div className="col-span-2">
              <Input
                label="Logradouro"
                icon={MapPin}
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
              />
            </div>
            <Input
              id="nr_logradouro"
              label="Número"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
            <div className="col-span-2">
              <Input
                label="Complemento"
                value={complLogradouro}
                onChange={(e) => setComplLogradouro(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />
            <Input
              label="Cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  },
);
