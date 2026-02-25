import { useState, useEffect, useRef, memo } from "react";
import type { FormEvent } from "react";
import { VeiculoService } from "../../services/veiculo.service";
import { ClienteService } from "../../services/cliente.service";
import { normalizePlate } from "../../utils/normalize";
import { toast } from "react-toastify";
import { Car, Search, User, Check, X, Save } from "lucide-react";
import { Button, Input, Select, ActionButton } from "../ui";

interface VeiculoFormProps {
  clientId?: number | null;
  vehicleId?: number;
  initialData?: any;
  onSuccess: (newItem: any) => void;
  onCancel: () => void;
  onCreateClient?: () => void;
}

interface ClientResult {
  id_cliente: number;
  email: string;
  telefone_1: string;
  pessoa_fisica?: {
    pessoa: { nome: string };
    cpf: string;
  };
  pessoa_juridica?: {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
  };
}

export const VeiculoForm = memo(
  ({
    clientId,
    vehicleId,
    initialData,
    onSuccess,
    onCancel,
    onCreateClient,
  }: VeiculoFormProps) => {
    const [loading, setLoading] = useState(false);

    // Vehicle Search State
    // Removed vehicle automation states

    // Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState("");
    const [clientResults, setClientResults] = useState<ClientResult[]>([]);
    const [selectedOwner, setSelectedOwner] = useState<{
      id: number;
      name: string;
    } | null>(null);
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    const firstInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [placa, setPlaca] = useState("");
    const [marca, setMarca] = useState("");
    const [modelo, setModelo] = useState("");
    const [cor, setCor] = useState("");
    const [anoModelo, setAnoModelo] = useState("");
    const [combustivel, setCombustivel] = useState("Flex");
    const [chassi, setChassi] = useState("");

    useEffect(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
    }, [clientId, vehicleId]);

    useEffect(() => {
      if (initialData) {
        setPlaca(initialData.placa || "");
        setMarca(initialData.marca || "");
        setModelo(initialData.modelo || "");
        setCor(initialData.cor || "");
        setAnoModelo(initialData.ano_modelo || "");
        setCombustivel(initialData.combustivel || "Flex");
        setChassi(initialData.chassi || "");
      }
    }, [initialData]);

    const [clientActiveIndex, setClientActiveIndex] = useState(-1);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setClientResults([]);
        setClientActiveIndex(-1);
        return;
      }

      if (clientResults.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next =
          clientActiveIndex + 1 >= clientResults.length
            ? 0
            : clientActiveIndex + 1;
        setClientActiveIndex(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev =
          clientActiveIndex - 1 < 0
            ? clientResults.length - 1
            : clientActiveIndex - 1;
        setClientActiveIndex(prev);
      } else if (e.key === "Enter" && clientActiveIndex !== -1) {
        e.preventDefault();
        selectClient(clientResults[clientActiveIndex]);
      }
    };

    // --- Vehicle Lookup Logic ---
    // Removed handlePlateBlur

    const handleSearchClient = async (term: string) => {
      setClientSearchTerm(term);
      setClientActiveIndex(-1);
      if (term.length < 3) {
        setClientResults([]);
        return;
      }

      setIsSearchingClient(true);
      try {
        const results = await ClienteService.search(term);
        setClientResults(results as any); // Cast because types might slightly differ but payload matches
      } catch (error) {
        console.error("Erro ao buscar clientes", error);
      } finally {
        setIsSearchingClient(false);
      }
    };

    const selectClient = (client: ClientResult) => {
      const name =
        client.pessoa_fisica?.pessoa?.nome ||
        client.pessoa_juridica?.nome_fantasia ||
        client.pessoa_juridica?.razao_social ||
        "Cliente Sem Nome";

      setSelectedOwner({ id: client.id_cliente, name });
      setClientResults([]);
      setClientSearchTerm("");
      setClientActiveIndex(-1);
    };

    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();

      const finalClientId = clientId || selectedOwner?.id;

      // For creation, clientId is required.
      if (!vehicleId && !finalClientId) {
        toast.error("É necessário selecionar um proprietário.");
        return;
      }

      setLoading(true);
      try {
        const payload = {
          id_cliente: finalClientId,
          placa: normalizePlate(placa),
          marca,
          modelo,
          cor,
          ano_modelo: anoModelo,
          combustivel,
          chassi,
        };

        if (vehicleId) {
          const newItem = await VeiculoService.update(vehicleId, payload);
          onSuccess(newItem);
        } else {
          const newItem = await VeiculoService.create(payload);
          onSuccess(newItem);
        }
      } catch (error: any) {
        console.error(error);
        toast.error(
          "Erro ao salvar veículo: " +
            (error.response?.data?.error || error.message),
        );
      } finally {
        setLoading(false);
      }
    };

    // Helper to determine if we need to show client selection
    const needsClientSelection = !vehicleId && !clientId;

    // Smart ReadOnly Logic:
    // Removed isSmartReadOnly helper

    return (
      <form onSubmit={handleSubmit} className="space-y-6 text-neutral-900">
        {/* 1. Client Selection Section (Only for new vehicles where ID isn't pre-injected) */}
        {needsClientSelection && (
          <div className="space-y-3 p-4 bg-neutral-25 rounded-3xl border border-neutral-200">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-100">
              <User className="text-primary-600" size={20} />
              <h3 className="font-bold text-neutral-500">
                Proprietário do Veículo
              </h3>
            </div>

            {!selectedOwner ? (
              <div className="relative">
                <Input
                  ref={firstInputRef}
                  icon={Search}
                  placeholder="Buscar cliente por nome..."
                  value={clientSearchTerm}
                  onChange={(e) => handleSearchClient(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-neutral-25"
                />

                {/* Results Dropdown */}
                {clientResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {clientResults.map((client, idx) => {
                      const name =
                        client.pessoa_fisica?.pessoa?.nome ||
                        client.pessoa_juridica?.nome_fantasia ||
                        client.pessoa_juridica?.razao_social;
                      const contact =
                        client.telefone_1 || client.email || "Sem Contato";
                      return (
                        <Button
                          key={client.id_cliente}
                          type="button"
                          variant="ghost"
                          onClick={() => selectClient(client)}
                          className={`w-full !justify-start !text-left p-3 !h-auto !rounded-none border-b border-neutral-100 last:border-0 ${idx === clientActiveIndex ? "bg-primary-50" : ""}`}
                        >
                          <div>
                            <div className="font-bold text-sm text-neutral-700 normal-case">
                              {name}
                            </div>
                            <div className="text-xs text-neutral-400 normal-case">
                              {contact}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                )}
                {clientSearchTerm.length > 2 &&
                  clientResults.length === 0 &&
                  !isSearchingClient && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-neutral-500 mb-2">
                        Nenhum cliente encontrado.
                      </p>
                      {onCreateClient && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={onCreateClient}
                          className="!text-primary-600 font-bold"
                        >
                          + Cadastrar Novo Cliente
                        </Button>
                      )}
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-primary-50 p-3 rounded-xl border border-primary-100">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-600 text-white p-2 rounded-full">
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest">
                      Cliente Selecionado
                    </p>
                    <p className="font-bold text-primary-900 leading-tight">
                      {selectedOwner.name}
                    </p>
                  </div>
                </div>
                <ActionButton
                  icon={X}
                  label="Alterar Cliente"
                  onClick={() => setSelectedOwner(null)}
                  variant="primary"
                />
              </div>
            )}
          </div>
        )}

        {/* 2. Vehicle Info Section */}
        <div className="bg-neutral-25 p-6 rounded-3xl border border-neutral-200 relative">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                <Car size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-500 text-lg">
                  Dados do Veículo
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <Input
                label="Placa *"
                ref={needsClientSelection ? null : firstInputRef}
                value={placa}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setPlaca(val);
                }}
                maxLength={7}
                placeholder="ABC1234"
                required
                className="font-mono uppercase tracking-wider"
              />
            </div>
            <div>
              <Input
                label="Marca *"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Modelo *"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Cor *"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                required
                placeholder="Ex: Prata, Branco..."
              />
            </div>
            <div>
              <Input
                label="Ano Modelo (YYYY)"
                type="number"
                value={anoModelo}
                onChange={(e) => setAnoModelo(e.target.value)}
              />
            </div>
            <div>
              <Select
                label="Combustível"
                value={combustivel}
                onChange={(e) => setCombustivel(e.target.value)}
              >
                <option value="Flex">Flex</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
                <option value="Elétrico">Elétrico</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                label="Chassi"
                value={chassi}
                onChange={(e) => setChassi(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || (!clientId && !selectedOwner && !vehicleId)}
            className="flex-1"
            icon={Save}
            isLoading={loading}
          >
            {vehicleId ? "Salvar Alterações" : "Salvar Veículo"}
          </Button>
        </div>
      </form>
    );
  },
);
