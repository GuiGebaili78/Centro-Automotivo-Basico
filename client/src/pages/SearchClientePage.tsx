import { useState } from "react";
import { api } from "../services/api";
import {
  Search,
  User,
  Car,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { Input, Button } from "../components/ui";

interface ICliente {
  id_cliente: number;
  telefone_1: string;
  telefone_2?: string;
  email?: string;
  logradouro: string;
  nr_logradouro: string;
  compl_logradouro?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pessoa_fisica?: {
    id_pessoa_fisica: number;
    cpf?: string;
    pessoa: {
      nome: string;
      genero?: string;
      dt_nascimento?: string;
    };
  };
  pessoa_juridica?: {
    id_pessoa_juridica: number;
    razao_social: string;
    nome_fantasia?: string;
    cnpj?: string;
  };
  veiculos?: IVeiculo[];
}

interface IVeiculo {
  id_veiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  ano_modelo?: string;
}

export const SearchClientePage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<ICliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<ICliente | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      alert("Digite um nome para buscar");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/cliente/search?name=${searchTerm}`);
      setClientes(response.data);
      if (response.data.length === 0) {
        alert("Nenhum cliente encontrado");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  };

  const loadClienteDetails = async (id: number) => {
    try {
      const response = await api.get(`/cliente/${id}`);
      setSelectedCliente(response.data);
    } catch (error) {
      alert("Erro ao carregar detalhes do cliente");
    }
  };

  const getNome = (cliente: ICliente) => {
    if (cliente.pessoa_fisica) {
      return cliente.pessoa_fisica.pessoa.nome;
    }
    if (cliente.pessoa_juridica) {
      return cliente.pessoa_juridica.razao_social;
    }
    return "Nome não disponível";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pesquisar Cliente</h1>
        <p className="text-slate-500">Busque por nome (PF ou PJ)</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex gap-4">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Digite o nome do cliente... (ex: João Silva, Tania, ACME Ltda)"
            className="flex-1"
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
      </div>

      {/* RESULTS LIST */}
      {clientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b">
            <h2 className="font-bold text-slate-700">
              Resultados ({clientes.length})
            </h2>
          </div>
          <div className="divide-y">
            {clientes.map((cliente) => (
              <div
                key={cliente.id_cliente}
                onClick={() => loadClienteDetails(cliente.id_cliente)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary-50 p-3 rounded-lg text-primary-600">
                      <User size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">
                        {getNome(cliente)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {cliente.pessoa_fisica &&
                          `CPF: ${cliente.pessoa_fisica.cpf || "N/A"}`}
                        {cliente.pessoa_juridica &&
                          `CNPJ: ${cliente.pessoa_juridica.cnpj || "N/A"}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">
                      {cliente.telefone_1}
                    </p>
                    <p className="text-xs text-slate-400">
                      {cliente.cidade} - {cliente.estado}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECTED CLIENTE DETAILS */}
      {selectedCliente && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {getNome(selectedCliente)}
                </h2>
                <p className="text-primary-100">
                  {selectedCliente.pessoa_fisica &&
                    `CPF: ${selectedCliente.pessoa_fisica.cpf || "Não informado"}`}
                  {selectedCliente.pessoa_juridica &&
                    `CNPJ: ${selectedCliente.pessoa_juridica.cnpj || "Não informado"}`}
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
            {/* CONTACT INFO */}
            <div>
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Phone size={18} className="text-primary-600" />
                Contato
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">
                    Telefone Principal
                  </label>
                  <p className="font-medium">{selectedCliente.telefone_1}</p>
                </div>
                {selectedCliente.telefone_2 && (
                  <div>
                    <label className="text-xs text-slate-500">Telefone 2</label>
                    <p className="font-medium">{selectedCliente.telefone_2}</p>
                  </div>
                )}
                {selectedCliente.email && (
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 flex items-center gap-1">
                      <Mail size={14} /> Email
                    </label>
                    <p className="font-medium">{selectedCliente.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* ADDRESS */}
            <div>
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-primary-600" />
                Endereço
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="font-medium">
                  {selectedCliente.logradouro}, {selectedCliente.nr_logradouro}
                  {selectedCliente.compl_logradouro &&
                    ` - ${selectedCliente.compl_logradouro}`}
                </p>
                <p className="text-slate-600">
                  {selectedCliente.bairro} - {selectedCliente.cidade}/
                  {selectedCliente.estado}
                </p>
              </div>
            </div>

            {/* VEHICLES */}
            {selectedCliente.veiculos &&
              selectedCliente.veiculos.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Car size={18} className="text-primary-600" />
                    Veículos ({selectedCliente.veiculos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCliente.veiculos.map((veiculo) => (
                      <div
                        key={veiculo.id_veiculo}
                        className="border border-slate-200 p-4 rounded-lg hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2 rounded">
                            <Car size={20} className="text-slate-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {veiculo.placa}
                            </p>
                            <p className="text-sm text-slate-600">
                              {veiculo.marca} {veiculo.modelo}
                            </p>
                            <p className="text-xs text-slate-500">
                              {veiculo.cor} • {veiculo.ano_modelo || "Ano N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
