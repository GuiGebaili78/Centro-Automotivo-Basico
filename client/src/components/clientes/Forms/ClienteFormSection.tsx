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
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { Input } from "../../ui/Input";
import { formatCpf, formatCnpj, formatCep, formatPhone, unmask, formatIE } from "../../../utils/normalize";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ClienteService } from "../../../services/cliente.service";
import type { ICliente } from "../../../types/backend";
import { useRef } from "react";

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
  isValid: () => boolean;
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
      const [cpf, setCpf] = useState(initialData?.cpf ? formatCpf(initialData.cpf) : "");
      const [razaoSocial, setRazaoSocial] = useState(
        initialData?.razaoSocial ?? "",
      );
      const [nomeFantasia, setNomeFantasia] = useState(
        initialData?.nomeFantasia ?? "",
      );
      const [cnpj, setCnpj] = useState(initialData?.cnpj ? formatCnpj(initialData.cnpj) : "");
      const [ie, setIe] = useState(initialData?.ie ?? "");
      const [telefone, setTelefone] = useState(initialData?.telefone ? formatPhone(initialData.telefone) : "");
      const [telefone2, setTelefone2] = useState(initialData?.telefone2 ? formatPhone(initialData.telefone2) : "");
      const [email, setEmail] = useState(initialData?.email ?? "");
      const [cep, setCep] = useState(initialData?.cep ? formatCep(initialData.cep) : "");
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
      const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

      const navigate = useNavigate();
      const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
      const [searchResults, setSearchResults] = useState<ICliente[]>([]);
      const [isSearching, setIsSearching] = useState(false);
      const [showDropdown, setShowDropdown] = useState(false);
      const searchWrapperRef = useRef<HTMLDivElement>(null);

      // Fecha dropdown ao clicar fora
      useEffect(() => {
        const handler = (e: MouseEvent) => {
          if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
            setShowDropdown(false);
          }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
      }, []);

      const handleSearch = (val: string, setter: (v: string) => void) => {
        setter(val);
        if (isEditMode) return;
        
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        if (val.trim().length < 2) {
           setSearchResults([]);
           setShowDropdown(false);
           return;
        }

        setIsSearching(true);
        setShowDropdown(true);

        debounceRef.current = setTimeout(async () => {
          try {
            const results = await ClienteService.search(val.trim());
            setSearchResults(results as unknown as ICliente[]);
          } catch {
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        }, 500);
      };

      const handleSelectSuggestion = (clienteId: number) => {
        setShowDropdown(false);
        navigate(`/cadastro/${clienteId}`);
      };

      // Helper para renderizar a lista
      const renderDropdown = () => {
        if (!showDropdown || isEditMode) return null;
        return (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl max-h-[300px] overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-neutral-500 flex justify-center items-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary-500" />
                <span className="text-sm">Buscando clientes...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <ul role="listbox">
                {searchResults.map((c) => {
                  const name = c.pessoa_fisica?.pessoa?.nome || c.pessoa_juridica?.razao_social || c.pessoa_juridica?.nome_fantasia || "Cliente";
                  const tel = c.telefone_1 ? formatPhone(c.telefone_1) : "";
                  const assets = [
                    ...(c.veiculos || []).map(v => `${v.modelo || "Modelo N/I"} (${v.cor || "Cor N/I"}) - ${v.placa}`),
                    ...(c.equipamentos || []).map(e => e.nome_peca)
                  ];
                  const assetsStr = assets.length > 0 ? assets.join(" | ") : "Sem Veículo/Peça";
                  return (
                    <li
                      key={c.id_cliente}
                      role="option"
                      aria-selected={false}
                      className="p-3 border-b border-neutral-100 last:border-0 hover:bg-primary-50 cursor-pointer transition-colors"
                      onMouseDown={(e) => {
                         // Prevent onBlur of the input from firing before click
                         e.preventDefault();
                      }}
                      onClick={() => handleSelectSuggestion(c.id_cliente)}
                    >
                      <div className="flex justify-between items-center gap-2">
                         <div className="min-w-0">
                           <p className="font-bold text-sm text-neutral-800 truncate">{name}</p>
                           <p className="text-xs text-neutral-500 truncate">{tel ? `${tel} • ` : ''}{assetsStr}</p>
                         </div>
                         <div className="text-[10px] shrink-0 uppercase font-bold tracking-widest text-primary-600 bg-primary-100 px-2 py-1 rounded flex items-center gap-1">
                           <span>Editar</span>
                           <ChevronLeft size={12} className="rotate-180" />
                         </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
               <div className="p-4 text-center text-neutral-500 text-sm">
                 Nenhum cliente encontrado. <br/> Continue preenchendo para cadastrar.
               </div>
            )}
          </div>
        );
      };


      // Sincroniza quando os dados iniciais chegam (modo edição assíncrono)
      useEffect(() => {
        if (!initialData) return;
        if (initialData.tipoPessoa) setTipoPessoa(initialData.tipoPessoa);
        if (initialData.nome !== undefined) setNome(initialData.nome);
        if (initialData.cpf !== undefined) setCpf(formatCpf(initialData.cpf));
        if (initialData.razaoSocial !== undefined)
          setRazaoSocial(initialData.razaoSocial);
        if (initialData.nomeFantasia !== undefined)
          setNomeFantasia(initialData.nomeFantasia);
        if (initialData.cnpj !== undefined) setCnpj(formatCnpj(initialData.cnpj));
        if (initialData.ie !== undefined) setIe(initialData.ie);
        if (initialData.telefone !== undefined)
          setTelefone(formatPhone(initialData.telefone));
        if (initialData.telefone2 !== undefined)
          setTelefone2(formatPhone(initialData.telefone2));
        if (initialData.email !== undefined) setEmail(initialData.email);
        if (initialData.cep !== undefined) setCep(formatCep(initialData.cep));
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
            cpf: unmask(cpf),
            razaoSocial,
            nomeFantasia,
            cnpj: unmask(cnpj),
            ie,
            telefone: unmask(telefone),
            telefone2: unmask(telefone2),
            email,
            cep: unmask(cep),
            logradouro,
            numero,
            complLogradouro,
            bairro,
            cidade,
            estado,
          }),
          isValid: () => {
            setHasAttemptedSubmit(true);
            const tNome = tipoPessoa === "PF" ? nome.trim() : razaoSocial.trim();
            if (!tNome) return false;
            if (!telefone.replace(/\D/g, "")) return false;
            
            if (tipoPessoa === "PF" && cpf) {
               if (cpf.replace(/\D/g, "").length !== 11) return false;
            }
            if (tipoPessoa === "PJ" && cnpj) {
               if (cnpj.replace(/\D/g, "").length !== 14) return false;
            }
            return true;
          }
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
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const res = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`, {
            signal: controller.signal
          });
          const data = await res.json();
          if (!data.erro) {
            setLogradouro(data.logradouro ?? "");
            setBairro(data.bairro ?? "");
            setCidade(data.localidade ?? "");
            setEstado(data.uf ?? "");
            document.getElementById("nr_logradouro")?.focus();
          } else {
            toast.warning("CEP não localizado, preencha manualmente.");
          }
        } catch {
          toast.warning("CEP não localizado, preencha manualmente.");
        } finally {
          clearTimeout(timeoutId);
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
          <div className="grid grid-cols-1 gap-4" ref={searchWrapperRef}>
            {tipoPessoa === "PF" ? (
              <div className="relative">
                <Input
                  label="Nome Completo *"
                  icon={User}
                  ref={nameInputRef as React.Ref<HTMLInputElement>}
                  value={nome}
                  onChange={(e) => handleSearch(e.target.value, setNome)}
                  placeholder="Nome do cliente"
                  required
                  className={hasAttemptedSubmit && !nome.trim() ? 'border-red-500' : ''}
                />
                {tipoPessoa === "PF" && renderDropdown()}
                <div className="mt-4">
                  <Input
                    label="CPF"
                    icon={Hash}
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    disabled={isEditMode}
                    className={hasAttemptedSubmit && cpf && cpf.replace(/\D/g, '').length !== 11 ? 'border-red-500' : ''}
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <Input
                  label="Razão Social *"
                  icon={Building2}
                  ref={nameInputRef as React.Ref<HTMLInputElement>}
                  value={razaoSocial}
                  onChange={(e) => handleSearch(e.target.value, setRazaoSocial)}
                  placeholder="Nome da Empresa"
                  required
                  className={hasAttemptedSubmit && !razaoSocial.trim() ? 'border-red-500' : ''}
                />
                {tipoPessoa === "PJ" && renderDropdown()}
                <div className="mt-4">
                  <Input
                    label="Nome Fantasia"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome Comercial"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="CNPJ"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    className={hasAttemptedSubmit && cnpj && cnpj.replace(/\D/g, '').length !== 14 ? 'border-red-500' : ''}
                  />
                  <Input
                    label="IE"
                    value={ie}
                    onChange={(e) => setIe(formatIE(e.target.value))}
                    placeholder="IE Isento ou Número (ex: 123.456.789)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
            <Input
              label="Telefone Principal *"
              icon={Phone}
              value={telefone}
              onChange={(e) => setTelefone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              required
              className={hasAttemptedSubmit && !telefone.replace(/\D/g, '') ? 'border-red-500' : ''}
            />
            <Input
              label="Telefone 2"
              icon={Phone}
              value={telefone2}
              onChange={(e) => setTelefone2(formatPhone(e.target.value))}
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
                onChange={(e) => setCep(formatCep(e.target.value))}
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
