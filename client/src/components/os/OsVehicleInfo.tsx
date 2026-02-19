import { Edit } from "lucide-react";
import type { IVeiculo } from "../../types/backend";
import { useNavigate } from "react-router-dom";

interface OsVehicleInfoProps {
  veiculo?: IVeiculo;
  clienteId?: number;
}

export const OsVehicleInfo = ({ veiculo, clienteId }: OsVehicleInfoProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Veículo
        </p>
        <button
          onClick={() => clienteId && navigate(`/cadastro/${clienteId}`)}
          className="text-primary-600 hover:text-primary-700 p-0.5 hover:bg-primary-50 rounded transition-colors"
          title="Editar Veículo"
        >
          <Edit size={12} />
        </button>
      </div>
      <div className="flex flex-col">
        <h3 className="text-xl font-black text-neutral-700 leading-tight">
          {veiculo?.modelo || "Modelo N/I"}
        </h3>
        <p className="text-sm font-bold text-neutral-500">
          {veiculo?.cor || "Cor N/I"}
        </p>
        <div className="mt-1">
          <span className="text-xs font-black text-white bg-neutral-600 px-2 py-0.5 rounded uppercase tracking-widest inline-block">
            {veiculo?.placa || "SEM PLACA"}
          </span>
        </div>
      </div>
    </div>
  );
};
