import { ActionButton } from "../ui/ActionButton";
import { User, Phone, Edit, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { IFuncionario } from "../../types/colaborador.types";
import { formatPhone } from "../../utils/normalize";

interface ColaboradoresTableProps {
  funcionarios: IFuncionario[];
  onEdit: (funcionario: IFuncionario) => void;
  onDelete: (id: number) => void;
}

export const ColaboradoresTable = ({
  funcionarios,
  onEdit,
  onDelete,
}: ColaboradoresTableProps) => {
  return (
    <table className="tabela-limpa w-full">
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>Cargo / Função</th>
          <th>Contato</th>
          <th>Status</th>
          <th className="text-center">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-neutral-100">
        {funcionarios.map((f) => (
          <tr
            key={f.id_funcionario}
            className="transition-colors hover:bg-neutral-50 group"
          >
            <td className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <p className="text-base font-medium text-neutral-600 block">
                    {f.pessoa_fisica?.pessoa?.nome}
                  </p>
                </div>
              </div>
            </td>
            <td className="py-4">
              <div className="flex flex-col items-start gap-1">
                <Badge variant="neutral">{f.cargo}</Badge>
              </div>
            </td>
            <td className="py-4">
              <div className="flex items-center gap-2 text-neutral-600 text-base">
                <Phone size={14} className="text-neutral-400" />
                {formatPhone(f.telefone_pessoal || "-")}
                <br />
                {f.logradouro} {f.numero} {f.complemento} {f.bairro} {f.cidade}
              </div>
            </td>
            <td className="py-4">
              <Badge variant={f.ativo === "S" ? "success" : "danger"}>
                {f.ativo === "S" ? "Ativo" : "Inativo"}
              </Badge>
            </td>
            <td className="py-4 pr-6">
              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  onClick={() => onDelete(f.id_funcionario)}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
