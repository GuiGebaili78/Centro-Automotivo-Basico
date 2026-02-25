/**
 * ClienteFormSection
 *
 * Responsabilidades:
 *  - Gerenciar o estado interno de TODOS os campos do cliente.
 *  - Expor `getData()` via useImperativeHandle para que a página pai
 *    colete os dados SOMENTE no momento do submit (sem prop drilling de state).
 *  - Usar React.memo + forwardRef, eliminando re-renderizações causadas
 *    pelo estado de componentes irmãos (ex: VeiculoFormSection).
 *
 * Padrão adoptado: estado totalmente local + imperativeHandle (pull on submit)
 */
import {
  memo,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useEffect,
} from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClienteFormData {
  tipoPessoa: "PF" | "PJ";
  nome: string;
  cpf: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  telefone: string;
  telefone2: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complLogradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ClienteFormSectionRef {
  getData: () => ClienteFormData;
}

interface ClienteFormSectionProps {
  /** Dados iniciais (edição). Em modo criação, pode ser omitido. */
  initialData?: Partial<ClienteFormData>;
  /** Em modo de edição, campos do nome/tipo ficam desabilitados. */
  isEditMode?: boolean;
  /** Ref para o input "nome" principal para autoFocus no modo criação. */
  nameInputRef?: React.RefObject<HTMLInputElement | null>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ClienteFormSection = memo(
  forwardRef<ClienteFormSectionRef, ClienteFormSectionProps>(
    ({ initialData, isEditMode = false, nameInputRef }, ref) => {
      // ── Local state (não sobe para o pai até o submit) ──
      const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(
        initialData?.tipoPessoa ?? "PF",
      );
      const [nome, setNome] = useState(initialData?.nome ?? "");
      const [cpf, setCpf] = useState(initialData?.cpf ?? "");
      const [razaoSocial, setRazaoSocial] = useState(
        initialData?.razaoSocial ?? "",
      );
      const [nomeFantasia, setNomeFantasia] = useState(
        initialData?.nomeFantasia ?? "",
      );
      const [cnpj, setCnpj] = useState(initialData?.cnpj ?? "");
      const [ie, setIe] = useState(initialData?.ie ?? "");
      const [telefone, setTelefone] = useState(initialData?.telefone ?? "");
      const [telefone2, setTelefone2] = useState(initialData?.telefone2 ?? "");
      const [email, setEmail] = useState(initialData?.email ?? "");
      const [cep, setCep] = useState(initialData?.cep ?? "");
      const [logradouro, setLogradouro] = useState(
        initialData?.logradouro ?? "",
      );
      const [numero, setNumero] = useState(initialData?.numero ?? "");
      const [complLogradouro, setComplLogradouro] = useState(
        initialData?.complLogradouro ?? "",
      );
      const [bairro, setBairro] = useState(initialData?.bairro ?? "");
      const [cidade, setCidade] = useState(initialData?.cidade ?? "São Paulo");
      const [estado, setEstado] = useState(initialData?.estado ?? "SP");

      // Sincroniza quando os dados iniciais chegam (modo edição assíncrono)
      useEffect(() => {
        if (!initialData) return;
        if (initialData.tipoPessoa) setTipoPessoa(initialData.tipoPessoa);
        if (initialData.nome !== undefined) setNome(initialData.nome);
        if (initialData.cpf !== undefined) setCpf(initialData.cpf);
        if (initialData.razaoSocial !== undefined)
          setRazaoSocial(initialData.razaoSocial);
        if (initialData.nomeFantasia !== undefined)
          setNomeFantasia(initialData.nomeFantasia);
        if (initialData.cnpj !== undefined) setCnpj(initialData.cnpj);
        if (initialData.ie !== undefined) setIe(initialData.ie);
        if (initialData.telefone !== undefined)
          setTelefone(initialData.telefone);
        if (initialData.telefone2 !== undefined)
          setTelefone2(initialData.telefone2);
        if (initialData.email !== undefined) setEmail(initialData.email);
        if (initialData.cep !== undefined) setCep(initialData.cep);
        if (initialData.logradouro !== undefined)
          setLogradouro(initialData.logradouro);
        if (initialData.numero !== undefined) setNumero(initialData.numero);
        if (initialData.complLogradouro !== undefined)
          setComplLogradouro(initialData.complLogradouro);
        if (initialData.bairro !== undefined) setBairro(initialData.bairro);
        if (initialData.cidade !== undefined) setCidade(initialData.cidade);
        if (initialData.estado !== undefined) setEstado(initialData.estado);
        // Dependência intencional: só roda quando initialData mudar de referência
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [initialData]);

      // ── Expõe getData() para a página pai ──
      useImperativeHandle(
        ref,
        () => ({
          getData: () => ({
            tipoPessoa,
            nome,
            cpf,
            razaoSocial,
            nomeFantasia,
            cnpj,
            ie,
            telefone,
            telefone2,
            email,
            cep,
            logradouro,
            numero,
            complLogradouro,
            bairro,
            cidade,
            estado,
          }),
        }),
        [
          tipoPessoa,
          nome,
          cpf,
          razaoSocial,
          nomeFantasia,
          cnpj,
          ie,
          telefone,
          telefone2,
          email,
          cep,
          logradouro,
          numero,
          complLogradouro,
          bairro,
          cidade,
          estado,
        ],
      );

      // ── Busca de CEP ViaCEP ──
      const handleCepBlur = useCallback(async () => {
        const cepRaw = cep.replace(/\D/g, "");
        if (cepRaw.length !== 8) return;
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
          const data = await res.json();
          if (!data.erro) {
            setLogradouro(data.logradouro ?? "");
            setBairro(data.bairro ?? "");
            setCidade(data.localidade ?? "");
            setEstado(data.uf ?? "");
            // Foca no campo "Número" após autocomplete
            document.getElementById("nr_logradouro")?.focus();
          }
        } catch {
          // silently fail — user can fill manually
        }
      }, [cep]);

      // ─── Render ───────────────────────────────────────────────────────────
      return (
        <div className="bg-neutral-25 p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
            <div className="bg-primary-100 p-2 rounded-lg text-primary-600">
              <User size={20} />
            </div>
            <h2 className="font-bold text-lg text-neutral-800">
              Dados do Cliente
            </h2>
          </div>

          {/* Tipo Pessoa Toggle */}
          <div className="flex bg-neutral-100 p-1 rounded-lg w-fit">
            {(["PF", "PJ"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                disabled={isEditMode}
                onClick={() => !isEditMode && setTipoPessoa(tipo)}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  tipoPessoa === tipo
                    ? "bg-neutral-25 shadow text-primary-600"
                    : "text-neutral-500"
                } ${isEditMode ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </button>
            ))}
          </div>

          {/* Campos de identificação (PF / PJ) */}
          <div className="grid grid-cols-1 gap-4">
            {tipoPessoa === "PF" ? (
              <>
                <Input
                  label="Nome Completo *"
                  icon={User}
                  ref={nameInputRef as React.Ref<HTMLInputElement>}
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
                  ref={nameInputRef as React.Ref<HTMLInputElement>}
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

          {/* Contato */}
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

          {/* Endereço */}
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
  ),
);

ClienteFormSection.displayName = "ClienteFormSection";
