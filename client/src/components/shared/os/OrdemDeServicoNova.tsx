import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Car,
  User,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api } from "../../../services/api";
import { UnifiedOsForm } from "../../forms/UnifiedOsForm";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";

interface OrdemDeServicoNovaProps {
  employees: any[];
  onSuccess: (osId: number) => void;
}

export const OrdemDeServicoNova: React.FC<OrdemDeServicoNovaProps> = ({
  employees,
  onSuccess,
}) => {
  // MODE: 'search' (default) or 'create' (modal)
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<{ vehicles: any[]; clients: any[] }>({
    vehicles: [],
    clients: [],
  });
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  // If a client is selected from search, we show their vehicles
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientVehicles, setClientVehicles] = useState<any[]>([]);

  // Confirmation Modal for "Quick Start"
  const [quickStartModal, setQuickStartModal] = useState<{
    isOpen: boolean;
    vehicle: any;
    client: any;
  }>({ isOpen: false, vehicle: null, client: null });
  const [quickStartData, setQuickStartData] = useState({
    km: "",
    mechanic: "",
    defect: "",
  });
  const [quickLoading, setQuickLoading] = useState(false);

  // --- SEARCH LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch(searchQuery);
      } else {
        setResults({ vehicles: [], clients: [] });
        setSelectedClient(null);
      }
    }, 300); // Fast debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (q: string) => {
    setLoadingSearch(true);
    try {
      const [vRes, cRes] = await Promise.all([
        api.get(`/veiculo/search?q=${q}`),
        api.get(`/cliente/search?q=${q}`),
      ]);
      setResults({
        vehicles: vRes.data || [],
        clients: cRes.data || [],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectVehicle = (v: any) => {
    // Find client info if not populated (search vehicle endpoint usually populates, let's assume it does or we fetch)
    // vehicle search usually returns client relation.
    if (v.cliente) {
      setQuickStartModal({ isOpen: true, vehicle: v, client: v.cliente });
    } else {
      // Fetch client if missing? Assuming robust backend response for now.
      // If missing client, we can't really start OS easily.
      console.error("Vehicle has no client data", v);
    }
  };

  const handleSelectClient = async (c: any) => {
    setSelectedClient(c);
    // Fetch vehicles for this client specifically if not already present or if we want to be sure
    // Ideally we search vehicles by client ID.
    try {
      const res = await api.get("/veiculo"); // Filtering client side as fallback or specific endpoint
      const myVehicles = res.data.filter(
        (v: any) => v.id_cliente === c.id_cliente,
      );
      setClientVehicles(myVehicles);
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickCreate = async () => {
    if (!quickStartData.km || !quickStartData.mechanic) return;
    setQuickLoading(true);
    try {
      const payload = {
        id_veiculo: quickStartModal.vehicle.id_veiculo,
        id_cliente: quickStartModal.client.id_cliente,
        id_funcionario: Number(quickStartData.mechanic),
        km_entrada: Number(quickStartData.km),
        defeito_relatado: quickStartData.defect,
        status: "ABERTA",
        dt_abertura: new Date().toISOString(),
        valor_total_cliente: 0,
        valor_mao_de_obra: 0,
        parcelas: 1,
      };
      const res = await api.post("/ordem-de-servico", payload);
      setQuickStartModal({ isOpen: false, vehicle: null, client: null });
      onSuccess(res.data.id_os);
    } catch (e) {
      console.error(e);
      alert("Erro ao criar OS.");
    } finally {
      setQuickLoading(false);
    }
  };

  const handleNewVehicleForSelectedClient = () => {
    // Open Unified Form but pre-fill client
    setCreateModalOpen(true);
    // The UnifiedForm should handle "InitialClient" prop.
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* BIG SEARCH BAR */}
      <div className="relative mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary-500 transition-colors"
              size={24}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[72px] pl-16 pr-6 rounded-2xl bg-white border-2 border-neutral-100 shadow-xl shadow-neutral-100/50 text-2xl font-black text-neutral-800 placeholder:text-neutral-300 outline-none focus:border-primary-500 transition-all"
              placeholder="Busque por Placa, Cliente ou Modelo..."
              autoFocus
            />
            {loadingSearch && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <Loader2 className="animate-spin text-primary-500" />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setSelectedClient(null);
              setCreateModalOpen(true);
            }}
            className="h-[72px] px-8 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-lg flex items-center gap-2 shadow-lg shadow-primary-500/30 transition-all active:scale-95"
          >
            <Plus strokeWidth={3} />{" "}
            <span className="hidden md:inline">CRIAR NOVO</span>
          </button>
        </div>
      </div>

      {/* RESULTS AREA */}
      <div className="space-y-6">
        {selectedClient && (
          <div className="bg-primary-50 border border-primary-100 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-black text-primary-400 uppercase tracking-widest">
                  Cliente Selecionado
                </p>
                <h3 className="text-2xl font-black text-primary-900">
                  {selectedClient.pessoa_fisica?.pessoa?.nome ||
                    selectedClient.pessoa_juridica?.razao_social}
                </h3>
                <p className="text-primary-700 font-bold">
                  {selectedClient.telefone_1 || "Sem telefone"}
                </p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-primary-400 hover:text-primary-700 font-bold text-sm"
              >
                Trocar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {clientVehicles.map((v) => (
                <button
                  key={v.id_veiculo}
                  onClick={() =>
                    handleSelectVehicle({ ...v, cliente: selectedClient })
                  } // Inject client to be safe
                  className="p-4 bg-white rounded-xl border border-primary-200 text-left hover:border-primary-500 hover:shadow-md transition-all group"
                >
                  <p className="font-black text-lg text-neutral-800 group-hover:text-primary-600">
                    {v.placa}
                  </p>
                  <p className="text-sm font-bold text-neutral-500">
                    {v.modelo} • {v.cor}
                  </p>
                  <div className="mt-2 text-xs font-bold text-primary-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir OS <ArrowRight size={12} />
                  </div>
                </button>
              ))}
              <button
                onClick={handleNewVehicleForSelectedClient}
                className="p-4 bg-white/50 border-2 border-dashed border-primary-300 rounded-xl text-primary-600 font-bold flex flex-col items-center justify-center gap-2 hover:bg-white hover:border-solid hover:shadow-md transition-all"
              >
                <Plus size={24} /> Novo Veículo
              </button>
            </div>
          </div>
        )}

        {/* SEARCH RESULTS LIST */}
        {!selectedClient &&
          (results.vehicles.length > 0 || results.clients.length > 0) && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden animate-in fade-in">
              {/* VEHICLES RESULTS */}
              {results.vehicles.map((v) => (
                <button
                  key={`v-${v.id_veiculo}`}
                  onClick={() => handleSelectVehicle(v)}
                  className="w-full text-left p-6 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <Car size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-neutral-800">
                        {v.placa}
                      </h4>
                      <p className="text-sm font-bold text-neutral-500">
                        {v.modelo} • {v.cor}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-neutral-400 uppercase">
                      Proprietário
                    </p>
                    <p className="font-bold text-neutral-700">
                      {v.cliente?.pessoa_fisica?.pessoa?.nome ||
                        v.cliente?.pessoa_juridica?.razao_social ||
                        "Desconhecido"}
                    </p>
                  </div>
                </button>
              ))}

              {/* CLIENTS RESULTS */}
              {results.clients.map((c) => (
                <button
                  key={`c-${c.id_cliente}`}
                  onClick={() => handleSelectClient(c)}
                  className="w-full text-left p-6 border-b border-neutral-50 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-neutral-800">
                        {c.pessoa_fisica?.pessoa?.nome ||
                          c.pessoa_juridica?.razao_social}
                      </h4>
                      <p className="text-sm font-bold text-neutral-500">
                        {c.telefone_1 || "Sem telefone"}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-neutral-100 text-xs font-bold text-neutral-500 group-hover:bg-white group-hover:text-primary-600 transition-colors">
                    Ver Veículos
                  </div>
                </button>
              ))}
            </div>
          )}

        {searchQuery.length > 2 &&
          !selectedClient &&
          results.vehicles.length === 0 &&
          results.clients.length === 0 &&
          !loadingSearch && (
            <div className="text-center py-10 opacity-50">
              <AlertTriangle
                className="mx-auto mb-2 text-neutral-400"
                size={48}
              />
              <p className="font-bold text-neutral-500">
                Nenhum resultado encontrado.
              </p>
              <p className="text-sm">
                Tente buscar por outro termo ou clique em "Criar Novo".
              </p>
            </div>
          )}

        {!searchQuery && !selectedClient && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-primary-50 rounded-full text-primary-300 mb-4">
              <Search size={48} />
            </div>
            <h2 className="text-xl font-black text-neutral-900 mb-2">
              Comece a digitar...
            </h2>
            <p className="text-neutral-500 max-w-sm mx-auto">
              Busque rapidamente por placa ou nome para iniciar um atendimento.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: UNIFIED FORM */}
      {createModalOpen && (
        <Modal title="Novo Cadastro" onClose={() => setCreateModalOpen(false)}>
          <UnifiedOsForm
            employees={employees}
            initialClient={selectedClient}
            onCancel={() => setCreateModalOpen(false)}
            onSuccess={(id) => {
              setCreateModalOpen(false);
              onSuccess(id);
            }}
          />
        </Modal>
      )}

      {/* MODAL: QUICK START OS (KM/MECH Input) */}
      {quickStartModal.isOpen && (
        <Modal
          title="Iniciar Serviço"
          onClose={() =>
            setQuickStartModal({ isOpen: false, vehicle: null, client: null })
          }
        >
          <div className="space-y-6">
            <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
              <p className="text-xs font-black text-primary-400 uppercase">
                Veículo
              </p>
              <p className="text-lg font-black text-primary-900">
                {quickStartModal.vehicle?.placa} -{" "}
                {quickStartModal.vehicle?.modelo}
              </p>
              <p className="text-sm font-bold text-primary-700">
                {quickStartModal.client?.pessoa_fisica?.pessoa?.nome ||
                  quickStartModal.client?.pessoa_juridica?.razao_social}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  KM Entrada *
                </label>
                <input
                  type="number"
                  autoFocus
                  value={quickStartData.km}
                  onChange={(e) =>
                    setQuickStartData({ ...quickStartData, km: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border border-neutral-300 font-black text-xl text-neutral-900 outline-none focus:border-primary-500"
                  placeholder="000000"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                  Mecânico *
                </label>
                <select
                  value={quickStartData.mechanic}
                  onChange={(e) =>
                    setQuickStartData({
                      ...quickStartData,
                      mechanic: e.target.value,
                    })
                  }
                  className="w-full p-3 rounded-xl border border-neutral-300 font-bold text-neutral-800 outline-none focus:border-primary-500"
                >
                  <option value="">Selecione...</option>
                  {employees.map((e) => (
                    <option key={e.id_funcionario} value={e.id_funcionario}>
                      {e.pessoa_fisica?.pessoa?.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                Defeito Relatado (Opcional)
              </label>
              <input
                value={quickStartData.defect}
                onChange={(e) =>
                  setQuickStartData({
                    ...quickStartData,
                    defect: e.target.value,
                  })
                }
                className="w-full p-3 rounded-xl border border-neutral-300 font-medium text-neutral-800 outline-none focus:border-primary-500"
              />
            </div>

            <Button
              onClick={handleQuickCreate}
              disabled={!quickStartData.km || !quickStartData.mechanic}
              isLoading={quickLoading}
              variant="primary"
              className="w-full h-[54px] text-lg uppercase tracking-widest"
            >
              ABRIR OS
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
