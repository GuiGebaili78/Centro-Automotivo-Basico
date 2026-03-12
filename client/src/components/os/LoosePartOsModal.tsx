import { useState, useEffect } from "react";
import { Modal, Button, Input, TextArea } from "../ui";
import { Search, User, Plus, Wrench, ArrowRight } from "lucide-react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

interface LoosePartOsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoosePartOsModal = ({ isOpen, onClose }: LoosePartOsModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  const [equipData, setEquipData] = useState({
    nome_peca: "",
    fabricante: "",
    numeracao: "",
    observacoes: ""
  });

  // Client Search logic
  useEffect(() => {
    if (searchQuery.length < 2) {
      setClients([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await api.get(`/cliente?search=${searchQuery}`);
        setClients(resp.data);
      } catch (err) {
        console.error(err);
      }
    }, 150); // Debounce mais curto para resposta rápida
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep(2);
  };

  const handleCreateOs = async () => {
    if (!equipData.nome_peca) return;
    setLoading(true);
    try {
      const payload = {
        client: { id_cliente: selectedClient.id_cliente },
        equipamento: {
          nome_peca: equipData.nome_peca,
          fabricante: equipData.fabricante,
          numeracao: equipData.numeracao,
          observacoes: equipData.observacoes
        },
        os: {
          status: "ABERTA",
          defeito_relatado: `Peça Avulsa: ${equipData.nome_peca}`,
          parcelas: 1
        }
      };

      const resp = await api.post("/ordem-de-servico", payload);
      onClose();
      // Reset state for next time
      setStep(1);
      setSelectedClient(null);
      setSearchQuery("");
      setEquipData({ nome_peca: "", fabricante: "", numeracao: "", observacoes: "" });
      
      navigate(`/ordem-de-servico/${resp.data.id_os}`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Erro ao criar OS de peça avulsa.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Nova OS / Peça Avulsa" onClose={onClose} className="max-w-2xl">
      <div className="space-y-6">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Search size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Passo 1: Identificar Cliente</h4>
                <p className="text-sm text-blue-700">Pesquise o cliente que trouxe a peça.</p>
              </div>
            </div>

            <div className="relative">
              <Input
                placeholder="Nome ou Telefone do cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto border border-neutral-100 rounded-xl divide-y divide-neutral-100">
              {clients.map((c) => (
                <button
                  key={c.id_cliente}
                  onClick={() => handleSelectClient(c)}
                  className="w-full text-left p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-neutral-100 rounded-lg text-neutral-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-neutral-800">
                        {c.pessoa_fisica?.pessoa?.nome || c.pessoa_juridica?.nome_fantasia}
                      </p>
                      <p className="text-xs text-neutral-500">{c.telefone_1}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-neutral-300 group-hover:text-primary-500 transition-colors" />
                </button>
              ))}
              {searchQuery.length >= 2 && clients.length === 0 && (
                <div className="p-8 text-center bg-neutral-50 rounded-xl">
                  <p className="text-neutral-500 mb-4">Cliente não encontrado.</p>
                  <Button variant="primary" icon={Plus} onClick={() => navigate("/cadastro-unificado")}>
                    Cadastrar Novo Cliente
                  </Button>
                </div>
              )}
              {searchQuery.length < 2 && (
                <div className="p-8 text-center text-neutral-400 text-sm italic">
                  Digite pelo menos 2 caracteres para buscar...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-primary-700 font-bold uppercase tracking-wider">Cliente Selecionado</p>
                  <h4 className="font-bold text-neutral-800">
                    {selectedClient.pessoa_fisica?.pessoa?.nome || selectedClient.pessoa_juridica?.nome_fantasia}
                  </h4>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Alterar</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome da Peça / Equipamento"
                required
                placeholder="Ex: Alternador, Motor de Partida..."
                value={equipData.nome_peca}
                onChange={(e) => setEquipData({ ...equipData, nome_peca: e.target.value })}
              />
              <Input
                label="Fabricante / Marca"
                placeholder="Ex: Bosch, Valeo..."
                value={equipData.fabricante}
                onChange={(e) => setEquipData({ ...equipData, fabricante: e.target.value })}
              />
              <Input
                label="Numeração / Serial"
                placeholder="Opcional"
                value={equipData.numeracao}
                onChange={(e) => setEquipData({ ...equipData, numeracao: e.target.value })}
              />
            </div>
            <TextArea
              label="Observações Adicionais"
              placeholder="Estado da peça, defeitos visíveis, etc..."
              value={equipData.observacoes}
              onChange={(e) => setEquipData({ ...equipData, observacoes: e.target.value })}
              rows={3}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button
                variant="primary"
                icon={Wrench}
                onClick={handleCreateOs}
                isLoading={loading}
                disabled={!equipData.nome_peca}
              >
                Abrir Ordem de Serviço
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
