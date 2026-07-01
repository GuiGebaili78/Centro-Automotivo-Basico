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
import { Hash, Calendar } from "lucide-react";
import { Input, Select, AutocompleteInput } from "../../ui";
import { VeiculoService } from "../../../services/veiculo.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VeiculoFormData {
  placa: string;
  marca: string;
  modelo: string;
  cor: string;
  anoFabricacao: string;
  anoModelo: string;
  combustivel: string;
  chassi: string;
}

export interface VeiculoFormSectionRef {
  getData: () => VeiculoFormData;
  isValid: () => boolean;
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
      const [anoFabricacao, setAnoFabricacao] = useState(initialData?.anoFabricacao ?? "");
      const [anoModelo, setAnoModelo] = useState(initialData?.anoModelo ?? "");
      const [combustivel, setCombustivel] = useState(
        initialData?.combustivel ?? "Flex",
      );
      const [chassi, setChassi] = useState(initialData?.chassi ?? "");
      const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

      // Sincroniza quando initialData muda (carregamento assíncrono)
      useEffect(() => {
        if (!initialData) return;
        if (initialData.placa !== undefined) setPlaca(initialData.placa);
        if (initialData.marca !== undefined) setMarca(initialData.marca);
        if (initialData.modelo !== undefined) setModelo(initialData.modelo);
        if (initialData.cor !== undefined) setCor(initialData.cor);
        if (initialData.anoFabricacao !== undefined) setAnoFabricacao(initialData.anoFabricacao);
        if (initialData.anoModelo !== undefined) setAnoModelo(initialData.anoModelo);
        if (initialData.combustivel !== undefined) setCombustivel(initialData.combustivel);
        if (initialData.chassi !== undefined) setChassi(initialData.chassi);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [initialData]);

      // ── Expõe getData() para o pai coletar no submit ──
      useImperativeHandle(
        ref,
        () => ({
          getData: () => ({
            placa: placa.toUpperCase(),
            marca: marca.toUpperCase(),
            modelo: modelo.toUpperCase(),
            cor: cor.toUpperCase(),
            anoFabricacao,
            anoModelo,
            combustivel,
            chassi,
          }),
          isValid: () => {
            setHasAttemptedSubmit(true);
            const isFilled = placa || marca || modelo || cor || anoFabricacao || anoModelo || chassi;
            if (isFilled) {
              if (!placa || !marca || !modelo || !cor) return false;
            }
            return true;
          }
        }),
        [placa, marca, modelo, cor, anoFabricacao, anoModelo, combustivel, chassi],
      );

      // ─── Render ───────────────────────────────────────────────────────────
      return (
        <div data-testid="veiculo-form" className="space-y-4">
          {/* Info tip */}
          <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 text-xs text-primary-800 font-medium">
            Preencha os dados do veículo agora para agilizar a abertura da OS.
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Placa */}
            <div className="relative">
              <Input
                id="input-placa"
                label="Placa *"
                icon={Hash}
                ref={placaInputRef as React.Ref<HTMLInputElement>}
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                maxLength={7}
                placeholder="ABC1234"
                required
                className={`font-mono font-bold tracking-widest uppercase ${hasAttemptedSubmit && !placa && (marca || modelo || cor) ? 'border-red-500' : ''}`}
              />
            </div>

            {/* Marca */}
            <div className="relative">
              <AutocompleteInput
                id="input-marca"
                label="Marca *"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                fetchSuggestions={(q) => VeiculoService.buscarMarcas(q)}
                required={!!placa}
                className={hasAttemptedSubmit && !marca && (placa || modelo || cor) ? 'border-red-500' : ''}
              />
            </div>

            {/* Modelo */}
            <div className="col-span-2 relative">
              <AutocompleteInput
                id="input-modelo"
                label="Modelo *"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                fetchSuggestions={(q) => VeiculoService.buscarModelos(q)}
                required={!!placa}
                className={hasAttemptedSubmit && !modelo && (placa || marca || cor) ? 'border-red-500' : ''}
              />
            </div>

            {/* Cor */}
            <div className="relative">
              <AutocompleteInput
                id="input-cor"
                label="Cor *"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                fetchSuggestions={(q) => VeiculoService.buscarCores(q)}
                required={!!placa}
                placeholder="Ex: PRATA, BRANCO..."
                className={hasAttemptedSubmit && !cor && (placa || marca || modelo) ? 'border-red-500' : ''}
              />
            </div>

            {/* Ano Fabricação + Ano Modelo lado a lado */}
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="input-ano-fabricacao"
                label="Ano Fabricação"
                icon={Calendar}
                type="number"
                value={anoFabricacao}
                onChange={(e) => setAnoFabricacao(e.target.value)}
                placeholder="2015"
                className="bg-neutral-25"
              />
              <Input
                id="input-ano-modelo"
                label="Ano Modelo"
                icon={Calendar}
                type="number"
                value={anoModelo}
                onChange={(e) => setAnoModelo(e.target.value)}
                placeholder="2016"
                className="bg-neutral-25"
              />
            </div>

            {/* Combustível */}
            <div className="col-span-2">
              <Select
                label="Combustível"
                value={combustivel}
                onChange={(e) => setCombustivel(e.target.value)}
                className="bg-neutral-25"
              >
                <option value="Flex">Flex</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
                <option value="Elétrico">Elétrico</option>
              </Select>
            </div>

            {/* Chassi reposicionado */}
            <div className="col-span-2">
              <Input
                label="Chassi"
                value={chassi}
                onChange={(e) => setChassi(e.target.value)}
                className="bg-neutral-25"
              />
            </div>
          </div>
        </div>
      );
    },
  ),
);

VeiculoFormSection.displayName = "VeiculoFormSection";
