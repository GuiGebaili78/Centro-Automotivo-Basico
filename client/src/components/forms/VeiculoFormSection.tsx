/**
 * VeiculoFormSection
 *
 * Responsabilidades:
 *  - Gerenciar o estado interno de TODOS os campos do veículo.
 *  - Expor `getData()` via useImperativeHandle para que a página pai
 *    colete os dados SOMENTE no momento do submit.
 *  - React.memo + forwardRef garantem zero re-renderizações causadas
 *    por alterações em ClienteFormSection (e vice-versa).
 */
import {
  memo,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { Hash, Palette, Calendar } from "lucide-react";
import { Input } from "../ui/Input";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VeiculoFormData {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  anoModelo: string;
  combustivel: string;
  chassi: string;
}

export interface VeiculoFormSectionRef {
  getData: () => VeiculoFormData;
}

interface VeiculoFormSectionProps {
  /** Dados iniciais para modo edição (auto-preenchimento async). */
  initialData?: Partial<VeiculoFormData>;
  /** Ref opcional para o primeiro input (autoFocus). */
  placaInputRef?: React.Ref<HTMLInputElement>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VeiculoFormSection = memo(
  forwardRef<VeiculoFormSectionRef, VeiculoFormSectionProps>(
    ({ initialData, placaInputRef }, ref) => {
      // ── Estado local — NÃO sobe para o pai até o submit ──
      const [placa, setPlaca] = useState(initialData?.placa ?? "");
      const [marca, setMarca] = useState(initialData?.marca ?? "");
      const [modelo, setModelo] = useState(initialData?.modelo ?? "");
      const [cor, setCor] = useState(initialData?.cor ?? "");
      const [anoModelo, setAnoModelo] = useState(initialData?.anoModelo ?? "");
      const [combustivel, setCombustivel] = useState(
        initialData?.combustivel ?? "Flex",
      );
      const [chassi, setChassi] = useState(initialData?.chassi ?? "");

      // Sincroniza quando initialData muda (carregamento assíncrono)
      useEffect(() => {
        if (!initialData) return;
        if (initialData.placa !== undefined) setPlaca(initialData.placa);
        if (initialData.marca !== undefined) setMarca(initialData.marca);
        if (initialData.modelo !== undefined) setModelo(initialData.modelo);
        if (initialData.cor !== undefined) setCor(initialData.cor);
        if (initialData.anoModelo !== undefined)
          setAnoModelo(initialData.anoModelo);
        if (initialData.combustivel !== undefined)
          setCombustivel(initialData.combustivel);
        if (initialData.chassi !== undefined) setChassi(initialData.chassi);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [initialData]);

      // ── Expõe getData() para o pai coletar no submit ──
      useImperativeHandle(
        ref,
        () => ({
          getData: () => ({
            placa,
            marca,
            modelo,
            cor,
            anoModelo,
            combustivel,
            chassi,
          }),
        }),
        [placa, marca, modelo, cor, anoModelo, combustivel, chassi],
      );

      // ─── Render ───────────────────────────────────────────────────────────
      return (
        <div className="space-y-4">
          {/* Info tip */}
          <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-800 font-medium">
            Preencha os dados do veículo agora para agilizar a abertura da OS.
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Placa */}
            <div className="relative">
              <Input
                label="Placa *"
                icon={Hash}
                ref={placaInputRef as React.Ref<HTMLInputElement>}
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                maxLength={7}
                placeholder="ABC1234"
                required
                className="font-mono font-bold tracking-widest uppercase"
              />
            </div>

            {/* Marca */}
            <Input
              label="Marca *"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              required={!!placa}
              className="bg-neutral-25"
            />

            {/* Chassi */}
            <div className="col-span-2">
              <Input
                label="Chassi"
                value={chassi}
                onChange={(e) => setChassi(e.target.value)}
                className="bg-neutral-25"
              />
            </div>

            {/* Modelo */}
            <div className="col-span-2">
              <Input
                label="Modelo *"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required={!!placa}
                className="bg-neutral-25"
              />
            </div>

            {/* Cor */}
            <Input
              label="Cor *"
              icon={Palette}
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              required={!!placa}
              className="bg-neutral-25"
            />

            {/* Ano */}
            <Input
              label="Ano"
              icon={Calendar}
              type="number"
              value={anoModelo}
              onChange={(e) => setAnoModelo(e.target.value)}
              className="bg-neutral-25"
            />

            {/* Combustível */}
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
  ),
);

VeiculoFormSection.displayName = "VeiculoFormSection";
