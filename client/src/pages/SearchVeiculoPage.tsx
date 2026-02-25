import { useState } from "react";
import { api } from "../services/api";
import { Search, Car, User, Edit, Trash2, MapPin, Phone } from "lucide-react";
import { normalizePlate } from "../utils/normalize";
import { Input, Button } from "../components/ui";

interface IVeiculo {
  id_veiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano_modelo?: string;
  combustivel?: string;
  chassi?: string;
  cliente: {
    id_cliente: number;
    telefone_1: string;
    email?: string;
    logradouro: string;
    nr_logradouro: string;
    bairro: string;
    cidade: string;
    estado: string;
    pessoa_fisica?: {
      pessoa: {
        nome: string;
      };
      cpf?: string;
    };
    pessoa_juridica?: {
      pessoa: {
        nome: string;
      };
      cnpj?: string;
    };
  };
}

export const SearchVeiculoPage = () => {
  const [searchPlaca, setSearchPlaca] = useState("");
  const [veiculo, setVeiculo] = useState<IVeiculo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchPlaca.trim()) {
      alert("Digite uma placa para buscar");
      return;
    }

    setLoading(true);
    try {
      // Normalize plate before searching
      const normalized = normalizePlate(searchPlaca);
      const response = await api.get(`/veiculo/placa/${normalized}`);
      setVeiculo(response.data);
    } catch (error) {
      console.error(error);
      alert("Veículo não encontrado");
      setVeiculo(null);
    } finally {
      setLoading(false);
    }
  };

  const getClienteNome = (cliente: IVeiculo["cliente"]) => {
    if (cliente.pessoa_fisica) {
      return cliente.pessoa_fisica.pessoa.nome;
    }
    if (cliente.pessoa_juridica) {
      return cliente.pessoa_juridica.pessoa.nome;
    }
    return "Nome não disponível";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pesquisar Veículo</h1>
        <p className="text-slate-500">Busque pela placa (com ou sem hífen)</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex gap-4">
          <Input
            type="text"
            value={searchPlaca}
            onChange={(e) => setSearchPlaca(e.target.value.toUpperCase())}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Digite a placa... (ex: GIN1175 ou GIN-1175)"
            className="flex-1 font-mono text-lg tracking-wider"
            maxLength={8}
          />
          <Button
            onClick={handleSearch}
            isLoading={loading}
            variant="primary"
            icon={Search}
            className="px-8"
          >
            Buscar
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          💡 Dica: Você pode digitar com ou sem hífen (GIN1175 = GIN-1175)
        </p>
      </div>

      {/* VEHICLE DETAILS */}
      {veiculo && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Car size={32} />
                  <h2 className="text-3xl font-bold font-mono tracking-wider">
                    {veiculo.placa}
                  </h2>
                </div>
                <p className="text-blue-100 text-lg">
                  {veiculo.marca} {veiculo.modelo}
                </p>
                <p className="text-blue-200 text-sm">
                  {veiculo.cor} • {veiculo.ano_modelo || "Ano N/A"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="!p-2 text-white hover:bg-white/20"
                  onClick={() => {}}
                >
                  <Edit size={20} />
                </Button>
                <Button variant="danger" className="!p-2" onClick={() => {}}>
                  <Trash2 size={20} />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* VEHICLE INFO */}
            <div>
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Car size={18} className="text-blue-600" />
                Informações do Veículo
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Marca</label>
                  <p className="font-medium">{veiculo.marca}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Modelo</label>
                  <p className="font-medium">{veiculo.modelo}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Cor</label>
                  <p className="font-medium">{veiculo.cor}</p>
                </div>
                {veiculo.ano_modelo && (
                  <div>
                    <label className="text-xs text-slate-500">Ano/Modelo</label>
                    <p className="font-medium">{veiculo.ano_modelo}</p>
                  </div>
                )}
                {veiculo.combustivel && (
                  <div>
                    <label className="text-xs text-slate-500">
                      Combustível
                    </label>
                    <p className="font-medium">{veiculo.combustivel}</p>
                  </div>
                )}
                {veiculo.chassi && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Chassi</label>
                    <p className="font-medium font-mono text-sm">
                      {veiculo.chassi}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* OWNER INFO */}
            <div className="border-t pt-6">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <User size={18} className="text-primary-600" />
                Proprietário
              </h3>

              <div className="bg-primary-50 p-5 rounded-lg border border-primary-100">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-800 mb-1">
                      {getClienteNome(veiculo.cliente)}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {veiculo.cliente.pessoa_fisica &&
                        `CPF: ${veiculo.cliente.pessoa_fisica.cpf || "Não informado"}`}
                      {veiculo.cliente.pessoa_juridica &&
                        `CNPJ: ${veiculo.cliente.pessoa_juridica.cnpj || "Não informado"}`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <Phone size={12} /> Telefone
                    </label>
                    <p className="font-medium text-slate-800">
                      {veiculo.cliente.telefone_1}
                    </p>
                  </div>
                  {veiculo.cliente.email && (
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        Email
                      </label>
                      <p className="font-medium text-slate-800">
                        {veiculo.cliente.email}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                      <MapPin size={12} /> Endereço
                    </label>
                    <p className="font-medium text-slate-800">
                      {veiculo.cliente.logradouro},{" "}
                      {veiculo.cliente.nr_logradouro}
                    </p>
                    <p className="text-sm text-slate-600">
                      {veiculo.cliente.bairro} - {veiculo.cliente.cidade}/
                      {veiculo.cliente.estado}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
