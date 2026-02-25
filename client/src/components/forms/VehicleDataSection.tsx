import { memo } from "react";
import { Hash, Palette, Calendar } from "lucide-react";
import { Input } from "../ui/Input";

interface VehicleDataSectionProps {
  placa: string;
  setPlaca: (val: string) => void;
  marca: string;
  setMarca: (val: string) => void;
  modelo: string;
  setModelo: (val: string) => void;
  cor: string;
  setCor: (val: string) => void;
  anoModelo: string;
  setAnoModelo: (val: string) => void;
  combustivel: string;
  setCombustivel: (val: string) => void;
  chassi: string;
  setChassi: (val: string) => void;
  vehicleInputRef?: React.Ref<HTMLInputElement>;
}

export const VehicleDataSection = memo(
  ({
    placa,
    setPlaca,
    marca,
    setMarca,
    modelo,
    setModelo,
    cor,
    setCor,
    anoModelo,
    setAnoModelo,
    combustivel,
    setCombustivel,
    chassi,
    setChassi,
    vehicleInputRef,
  }: VehicleDataSectionProps) => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-800 font-medium flex-1">
            Preencha os dados do veículo agora para agilizar a abertura da OS.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative">
          <div className="relative">
            <Input
              label="Placa *"
              icon={Hash}
              ref={vehicleInputRef}
              value={placa}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setPlaca(val);
              }}
              maxLength={7}
              placeholder="ABC1234"
              required
              className="font-mono font-bold tracking-widest uppercase"
            />
          </div>

          <Input
            label="Marca *"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            required={!!placa}
            className="bg-neutral-25"
          />
          <div className="col-span-2">
            <Input
              label="Chassi"
              value={chassi}
              onChange={(e) => setChassi(e.target.value)}
              className="bg-neutral-25"
            />
          </div>
          <div className="col-span-2">
            <Input
              label="Modelo *"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              required={!!placa}
              className="bg-neutral-25"
            />
          </div>
          <Input
            label="Cor *"
            icon={Palette}
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            required={!!placa}
            className="bg-neutral-25"
          />
          <Input
            label="Ano"
            icon={Calendar}
            type="number"
            value={anoModelo}
            onChange={(e) => setAnoModelo(e.target.value)}
            className="bg-neutral-25"
          />
          <div className="col-span-2">
            <label className="text-sm font-semibold text-neutral-700 ml-1 mb-1 block">
              Combustível
            </label>
            <select
              value={combustivel}
              onChange={(e) => setCombustivel(e.target.value)}
              className="select select-bordered w-full border-neutral-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all rounded-xl bg-neutral-25"
            >
              <option value="Flex">Flex</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
              <option value="Elétrico">Elétrico</option>
            </select>
          </div>
        </div>
      </div>
    );
  },
);
