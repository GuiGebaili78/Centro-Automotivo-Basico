import { ActionButton } from "../ui/ActionButton";
import { User, Building2, MapPin, Phone, Edit, Trash2 } from "lucide-react";
import type { IFornecedor } from "../../types/fornecedor.types";

interface FornecedoresTableProps {
  fornecedores: IFornecedor[];
  onEdit: (fornecedor: IFornecedor) => void;
  onDelete: (id: number) => void;
}

export const FornecedoresTable = ({
  fornecedores,
  onEdit,
  onDelete,
}: FornecedoresTableProps) => {
  return (
    <table className="tabela-limpa w-full">
      <thead>
        <tr>
          <th>Fornecedor</th>
          <th>Localização</th>
          <th>Contato</th>
          <th className="text-center">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {fornecedores.map((f) => (
          <tr
            key={f.id_fornecedor}
            className="hover:bg-neutral-50 transition-colors group"
          >
            <td className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-primary-600">
                  {f.tipo_pessoa === "FISICA" ? (
                    <User size={18} />
                  ) : (
                    <Building2 size={18} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-neutral-900">
                    {f.nome_fantasia || f.nome}
                  </p>
                  {f.nome_fantasia && f.nome_fantasia !== f.nome && (
                    <p className="text-xs text-neutral-500 font-medium">
                      {f.nome}
                    </p>
                  )}
                </div>
              </div>
            </td>
            <td className="py-4">
              <div className="flex items-center gap-2 text-neutral-600 text-sm font-medium">
                <MapPin size={14} className="text-neutral-400" />
                <span className="uppercase">
                  {f.logradouro ? (
                    <>
                      {f.logradouro}, {f.numero} - {f.bairro}
                    </>
                  ) : (
                    <span className="text-neutral-400">
                      Endereço não cadastrado
                    </span>
                  )}
                </span>
              </div>
              {f.cidade && (
                <div className="pl-6 text-xs text-neutral-400 font-medium uppercase">
                  {f.cidade}/{f.uf}
                </div>
              )}
            </td>
            <td className="py-4">
              <div className="flex flex-col gap-1 items-start">
                {f.contato && (
                  <div className="font-bold text-neutral-700 text-sm flex items-center gap-2 mb-1">
                    <User size={14} className="text-neutral-400" />
                    {f.contato}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {f.whatsapp && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                      <Phone size={12} />
                      {f.whatsapp}
                    </div>
                  )}
                  {f.telefone && f.telefone !== f.whatsapp && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                      <Phone size={12} />
                      {f.telefone}
                    </div>
                  )}
                </div>

                {f.email && (
                  <span className="text-xs text-neutral-500 mt-1">
                    {f.email}
                  </span>
                )}
              </div>
            </td>
            <td className="py-4 pr-6">
              <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ActionButton
                  icon={Edit}
                  label="Editar"
                  variant="neutral"
                  onClick={() => onEdit(f)}
                />
                <ActionButton
                  icon={Trash2}
                  label="Excluir"
                  variant="danger"
                  onClick={() => onDelete(f.id_fornecedor)}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
