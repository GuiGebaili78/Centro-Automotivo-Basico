import { Edit } from "lucide-react";
import type { ICliente } from "../../types/backend";
import { useNavigate } from "react-router-dom";

interface OsClientInfoProps {
  cliente?: ICliente;
}

export const OsClientInfo = ({ cliente }: OsClientInfoProps) => {
  const navigate = useNavigate();

  const nome =
    cliente?.pessoa_fisica?.pessoa?.nome ||
    cliente?.pessoa_juridica?.razao_social ||
    "Cliente N/I";

  return (
    <div className="flex flex-col md:border-l md:border-neutral-100 md:pl-6">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Cliente / Contato
        </p>
        <button
          onClick={() =>
            cliente?.id_cliente && navigate(`/cadastro/${cliente.id_cliente}`)
          }
          className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
          title="Editar Cliente"
        >
          <Edit size={12} />
        </button>
      </div>
      <div className="flex flex-col">
        <p className="font-bold text-lg text-neutral-600 leading-tight">
          {nome}
        </p>
        <p className="text-sm font-medium text-neutral-500 flex items-center gap-1">
          {cliente?.telefone_1 || "Sem telefone"}
        </p>
      </div>
    </div>
  );
};
