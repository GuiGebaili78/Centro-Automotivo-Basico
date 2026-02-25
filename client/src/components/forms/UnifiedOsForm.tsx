import React, { useState, useEffect } from "react";
import {
  User,
  Car,
  Wrench,
  ArrowRight,
  Phone,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { OsService } from "../../services/os.service";
import { Button } from "../ui/Button";

interface UnifiedOsFormProps {
  onCancel: () => void;
  onSuccess: (osId: number) => void;
  employees: any[];
  initialClient?: any; // If we start from a found client
}

export const UnifiedOsForm: React.FC<UnifiedOsFormProps> = ({
  onCancel,
  onSuccess,
  employees,
  initialClient,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- FORM DATA ---
  const [clientData, setClientData] = useState({
    id_cliente: "",
    nome: "",
    telefone: "",
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    isNew: true,
  });

  const [vehicleData, setVehicleData] = useState({
    id_veiculo: "",
    placa: "",
    marca: "",
    modelo: "",
    cor: "",
    ano: new Date().getFullYear().toString(),
    combustivel: "FLEX",
    isNew: true,
  });

  const [osData, setOsData] = useState({
    km_entrada: "",
    id_funcionario: "",
    defeito: "",
  });

  // Client Search for Autocomplete
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<any[]>([]);

  useEffect(() => {
    if (initialClient) {
      selectClient(initialClient);
    }
  }, [initialClient]);

  // Search existing client
  const handleClientSearch = async (val: string) => {
    setClientQuery(val);
    setClientData((prev) => ({
      ...prev,
      nome: val,
      isNew: true,
      id_cliente: "",
    }));
    if (val.length < 3) {
      setClientResults([]);
      return;
    }
    try {
      const data = await OsService.searchClientes(val);
      setClientResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const selectClient = (c: any) => {
    const nome =
      c.pessoa_fisica?.pessoa?.nome || c.pessoa_juridica?.razao_social;
    setClientData({
      id_cliente: c.id_cliente,
      nome: nome,
      telefone: c.telefone_1,
      cep: c.cep || "",
      logradouro: c.logradouro || "",
      numero: c.nr_logradouro || "",
      bairro: c.bairro || "",
      cidade: c.cidade || "",
      estado: c.estado || "",
      isNew: false,
    });
    setClientQuery(nome);
    setClientResults([]);
  };

  // --- VALIDATION & SUBMIT ---
  const handleSubmit = async () => {
    setError("");
    if (!clientData.nome) return setError("Nome do cliente é obrigatório.");
    if (!clientData.telefone)
      return setError("Telefone do cliente é obrigatório.");
    if (!vehicleData.placa) return setError("Placa do veículo é obrigatória.");
    if (!vehicleData.marca) return setError("Marca do veículo é obrigatória.");
    if (!vehicleData.modelo)
      return setError("Modelo do veículo é obrigatório.");
    if (!osData.km_entrada) return setError("KM é obrigatório.");
    if (!osData.id_funcionario) return setError("Mecânico é obrigatório.");

    setLoading(true);
    try {
      // UNIFIED PAYLOAD
      const payload = {
        client: {
          id_cliente: clientData.isNew ? null : Number(clientData.id_cliente),
          nome: clientData.nome,
          telefone: clientData.telefone,
          tipo: "FISICA", // Defaulting to Fisica as per UI simplicity
          logradouro: clientData.logradouro,
          numero: clientData.numero,
          bairro: clientData.bairro,
          cidade: clientData.cidade,
          estado: clientData.estado,
          // CPF not in form yet, sending null implicitly by omission
        },
        vehicle: {
          id_veiculo: vehicleData.isNew ? null : Number(vehicleData.id_veiculo),
          placa: vehicleData.placa.toUpperCase(),
          marca: vehicleData.marca,
          modelo: vehicleData.modelo,
          cor: vehicleData.cor || "BRANCO",
          ano_modelo: vehicleData.ano,
          combustivel: vehicleData.combustivel,
        },
        os: {
          id_funcionario: Number(osData.id_funcionario),
          km_entrada: Number(osData.km_entrada),
          defeito_relatado: osData.defeito,
        },
      };

      const data = await OsService.createUnified(payload);

      onSuccess(data.id_os);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ERROR MSG */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm font-bold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION: CLIENTE */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <User size={20} />
            <h3 className="font-black text-neutral-400 uppercase tracking-widest text-xs">
              Dados do Cliente
            </h3>
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
              Nome Completo *
            </label>
            <input
              value={clientQuery}
              onChange={(e) => handleClientSearch(e.target.value)}
              className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500"
              placeholder="Buscar ou Digitar Novo..."
            />
            {clientResults.length > 0 && (
              <div className="absolute top-16 left-0 w-full bg-white shadow-xl border border-neutral-100 rounded-xl z-20 max-h-40 overflow-y-auto">
                {clientResults.map((c) => (
                  <button
                    key={c.id_cliente}
                    onClick={() => selectClient(c)}
                    className="w-full text-left p-3 hover:bg-neutral-50 text-sm font-bold text-neutral-700"
                  >
                    {c.pessoa_fisica?.pessoa?.nome ||
                      c.pessoa_juridica?.razao_social}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
              Telefone / Celular *
            </label>
            <div className="relative">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                size={14}
              />
              <input
                value={clientData.telefone}
                onChange={(e) =>
                  setClientData({ ...clientData, telefone: e.target.value })
                }
                disabled={!clientData.isNew}
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500 disabled:bg-neutral-100"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Endereço Simplificado */}
          <div className="pt-2 border-t border-neutral-200">
            <div className="flex items-center gap-1 mb-2">
              <MapPin size={14} className="text-neutral-400" />
              <span className="text-[10px] font-black text-neutral-400 uppercase">
                Endereço
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                placeholder="CEP"
                className="col-span-1 p-2 border rounded-lg text-sm"
                value={clientData.cep}
                onChange={(e) =>
                  setClientData({ ...clientData, cep: e.target.value })
                }
                disabled={!clientData.isNew}
              />
              <input
                placeholder="Cidade"
                className="col-span-2 p-2 border rounded-lg text-sm"
                value={clientData.cidade}
                onChange={(e) =>
                  setClientData({ ...clientData, cidade: e.target.value })
                }
                disabled={!clientData.isNew}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input
                placeholder="Logradouro"
                className="col-span-3 p-2 border rounded-lg text-sm"
                value={clientData.logradouro}
                onChange={(e) =>
                  setClientData({ ...clientData, logradouro: e.target.value })
                }
                disabled={!clientData.isNew}
              />
              <input
                placeholder="Nº"
                className="col-span-1 p-2 border rounded-lg text-sm"
                value={clientData.numero}
                onChange={(e) =>
                  setClientData({ ...clientData, numero: e.target.value })
                }
                disabled={!clientData.isNew}
              />
            </div>
          </div>
        </div>

        {/* SECTION: VEÍCULO */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
          <div className="flex items-center gap-2 text-primary-600 mb-2">
            <Car size={20} />
            <h3 className="font-black text-neutral-400 uppercase tracking-widest text-xs">
              Dados do Veículo
            </h3>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Placa *
              </label>
              <input
                value={vehicleData.placa}
                onChange={(e) =>
                  setVehicleData({
                    ...vehicleData,
                    placa: e.target.value.toUpperCase(),
                  })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-black text-neutral-800 outline-none focus:border-primary-500 uppercase"
                placeholder="MER-0000"
                maxLength={8}
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Ano
              </label>
              <input
                value={vehicleData.ano}
                onChange={(e) =>
                  setVehicleData({ ...vehicleData, ano: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500 text-center"
                placeholder="2024"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Marca *
              </label>
              <input
                value={vehicleData.marca}
                onChange={(e) =>
                  setVehicleData({ ...vehicleData, marca: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500"
                placeholder="Ex: VW"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Modelo *
              </label>
              <input
                value={vehicleData.modelo}
                onChange={(e) =>
                  setVehicleData({ ...vehicleData, modelo: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500"
                placeholder="Ex: Gol"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Cor
              </label>
              <input
                value={vehicleData.cor}
                onChange={(e) =>
                  setVehicleData({ ...vehicleData, cor: e.target.value })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500"
                placeholder="Ex: Branco"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Combustível *
              </label>
              <select
                value={vehicleData.combustivel}
                onChange={(e) =>
                  setVehicleData({
                    ...vehicleData,
                    combustivel: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500 bg-white"
              >
                <option value="FLEX">Flex</option>
                <option value="GASOLINA">Gasolina</option>
                <option value="ETANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="GNV">GNV</option>
                <option value="ELETRICO">Elétrico</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: OS BASICS */}
      <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-3 pb-2 border-b border-neutral-100 mb-2">
          <h3 className="font-black text-primary-600 uppercase tracking-widest text-xs flex items-center gap-2">
            <Wrench size={16} /> Detalhes Iniciais
          </h3>
        </div>

        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
            KM Entrada *
          </label>
          <input
            type="number"
            value={osData.km_entrada}
            onChange={(e) =>
              setOsData({ ...osData, km_entrada: e.target.value })
            }
            className="w-full p-3 rounded-xl border border-neutral-200 font-black text-xl text-neutral-900 outline-none focus:border-primary-500"
            placeholder="000000"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
            Mecânico *
          </label>
          <select
            value={osData.id_funcionario}
            onChange={(e) =>
              setOsData({ ...osData, id_funcionario: e.target.value })
            }
            className="w-full p-3 rounded-xl border border-neutral-200 font-bold text-neutral-800 outline-none focus:border-primary-500 bg-white"
          >
            <option value="">Selecione...</option>
            {employees.map((e) => (
              <option key={e.id_funcionario} value={e.id_funcionario}>
                {e.pessoa_fisica?.pessoa?.nome || "Func"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
            Defeito (Opcional)
          </label>
          <input
            value={osData.defeito}
            onChange={(e) => setOsData({ ...osData, defeito: e.target.value })}
            className="w-full p-3 rounded-xl border border-neutral-200 font-medium text-neutral-800 outline-none focus:border-primary-500"
            placeholder="Barulho no motor..."
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4 pt-4">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="flex-1 py-4 h-auto text-neutral-500"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={loading}
          className="flex-2 w-full py-4 h-auto text-lg uppercase tracking-widest"
        >
          CRIAR ORDEM DE SERVIÇO <ArrowRight className="ml-2" />
        </Button>
      </div>
    </div>
  );
};
