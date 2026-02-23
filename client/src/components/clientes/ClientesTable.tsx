import { Fragment, useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  MapPin,
  Phone,
  User,
  Car,
  Wrench,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { ActionButton } from "../ui/ActionButton";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { formatPhone } from "../../utils/normalize";
import type { ICliente } from "../../types/cliente.types";

interface ClientesTableProps {
  clientes: ICliente[];
  loading: boolean;
  onDelete: (id: number) => void;
  onOpenOsModal: (clientId: number, vehicleId: number) => void;
}

export const ClientesTable = ({
  clientes,
  loading,
  onDelete,
  onOpenOsModal,
}: ClientesTableProps) => {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const getNome = (c: any) =>
    c.pessoa_fisica?.pessoa.nome ||
    c.pessoa_juridica?.razao_social ||
    "Nome Indisponível";

  const handleDeleteClick = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">
        Carregando registros...
      </div>
    );
  }

  if (clientes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhum cliente encontrado.
      </div>
    );
  }

  return (
    <>
      <table className="tabela-limpa w-full">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Localização</th>
            <th>Tipo</th>
            <th className="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <Fragment key={c.id_cliente}>
              <tr
                className={`
                  group border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-all cursor-pointer
                  ${expandedRows.has(c.id_cliente) ? "bg-neutral-50" : ""}
                `}
                onClick={() => toggleRow(c.id_cliente)}
              >
                <td className="py-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-colors
                        ${
                          expandedRows.has(c.id_cliente)
                            ? "bg-primary-600 text-white shadow-md"
                            : "bg-primary-50 text-primary-600 group-hover:bg-white group-hover:shadow-sm"
                        }
                      `}
                    >
                      <User size={18} />
                    </div>
                    <span className="text-base font-medium text-neutral-600 uppercase line-clamp-2 leading-relaxed">
                      {getNome(c)}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-base text-neutral-600 font-medium">
                      <Phone size={14} className="text-neutral-400" />
                      {formatPhone(c.telefone_1)}
                    </span>
                    {c.email && (
                      <span className="text-sm text-neutral-500 pl-6">
                        {c.email}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4">
                  <div className="flex flex-col gap-0.5 text-sm text-neutral-600 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-neutral-400" />
                      <span className="uppercase">
                        {c.logradouro}, {c.nr_logradouro}
                      </span>
                    </div>
                    <span className="pl-6 text-xs text-neutral-500 uppercase">
                      {c.bairro} — {c.cidade}, {c.estado}
                    </span>
                  </div>
                </td>
                <td className="py-4">
                  <Badge
                    variant={c.id_pessoa_juridica ? "secondary" : "primary"}
                  >
                    {c.id_pessoa_juridica ? "Pessoa Jurídica" : "Pessoa Física"}
                  </Badge>
                </td>
                <td className="py-4 pr-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton
                      icon={Plus}
                      variant="primary"
                      label="Novo Veículo/Editar"
                      onClick={() => navigate(`/cadastro/${c.id_cliente}`)}
                    />
                    <ActionButton
                      icon={Edit}
                      variant="neutral"
                      label="Editar Cliente"
                      onClick={() => navigate(`/cadastro/${c.id_cliente}`)}
                    />
                    <ActionButton
                      icon={Trash2}
                      variant="danger"
                      label="Excluir"
                      onClick={() => handleDeleteClick(c.id_cliente)}
                    />
                  </div>
                </td>
              </tr>

              {expandedRows.has(c.id_cliente) && (
                <tr className="bg-neutral-50/50 shadow-inner">
                  <td colSpan={5} className="p-0">
                    <div className="px-16 py-6 border-l-4 border-primary-500 ml-5 my-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Car size={18} className="text-primary-600" />
                          <h4 className="text-sm font-bold uppercase text-neutral-500 tracking-widest">
                            Veículos Cadastrados ({c.veiculos?.length || 0})
                          </h4>
                        </div>
                        <Button
                          variant="primary"
                          icon={Plus}
                          onClick={() => navigate(`/cadastro/${c.id_cliente}`)}
                        >
                          Gerenciar Veículos
                        </Button>
                      </div>

                      {!c.veiculos || c.veiculos.length === 0 ? (
                        <p className="text-sm text-neutral-400 italic">
                          Nenhum veículo vinculado a este cliente.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {c.veiculos?.map((v: any) => (
                            <div
                              key={v.id_veiculo}
                              className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group/card flex justify-between items-start"
                            >
                              <div>
                                <div className="flex flex-col">
                                  <span className="text-neutral-600 text-base font-medium uppercase leading-tight">
                                    {v.marca} {v.modelo} • {v.cor || "COR N/A"}
                                  </span>
                                  <span className="text-base text-primary-600 uppercase mt-0.5 font-bold">
                                    {v.placa}
                                  </span>
                                  {v.ano_modelo && (
                                    <span className="text-basetext-neutral-600 mt-1 uppercase">
                                      Ano: {v.ano_modelo}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ActionButton
                                icon={Wrench}
                                variant="primary"
                                label="Abrir OS"
                                className="opacity-0 group-hover/card:opacity-100 transition-opacity"
                                onClick={() =>
                                  onOpenOsModal(c.id_cliente, v.id_veiculo)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Essa ação removerá também os veículos associados e pode impedir o acesso a históricos antigos."
        variant="danger"
      />
    </>
  );
};
