/**
 * EquipamentoFormSection
 * 
 * Responsável por gerenciar os campos de peças avulsas na ficha do cliente.
 */
import {
  memo,
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { Wrench, Tag, Hash } from "lucide-react";
import { Input, TextArea } from "../../ui";

export interface EquipamentoFormData {
  nome_peca: string;
  fabricante: string;
  numeracao: string;
  observacoes: string;
}

export interface EquipamentoFormSectionRef {
  getData: () => EquipamentoFormData;
}

interface EquipamentoFormSectionProps {
  initialData?: Partial<EquipamentoFormData>;
  nomeInputRef?: React.Ref<HTMLInputElement>;
}

export const EquipamentoFormSection = memo(
  forwardRef<EquipamentoFormSectionRef, EquipamentoFormSectionProps>(
    ({ initialData, nomeInputRef }, ref) => {
      const [nomePeca, setNomePeca] = useState(initialData?.nome_peca ?? "");
      const [fabricante, setFabricante] = useState(initialData?.fabricante ?? "");
      const [numeracao, setNumeracao] = useState(initialData?.numeracao ?? "");
      const [observacoes, setObservacoes] = useState(initialData?.observacoes ?? "");

      useEffect(() => {
        if (!initialData) return;
        if (initialData.nome_peca !== undefined) setNomePeca(initialData.nome_peca);
        if (initialData.fabricante !== undefined) setFabricante(initialData.fabricante);
        if (initialData.numeracao !== undefined) setNumeracao(initialData.numeracao);
        if (initialData.observacoes !== undefined) setObservacoes(initialData.observacoes);
      }, [initialData]);

      useImperativeHandle(
        ref,
        () => ({
          getData: () => ({
            nome_peca: nomePeca,
            fabricante,
            numeracao,
            observacoes,
          }),
        }),
        [nomePeca, fabricante, numeracao, observacoes],
      );

      return (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium">
            Cadastre os dados da peça avulsa para vincular ao patrimônio do cliente.
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Nome da Peça / Equipamento *"
              icon={Wrench}
              ref={nomeInputRef as React.Ref<HTMLInputElement>}
              value={nomePeca}
              onChange={(e) => setNomePeca(e.target.value)}
              placeholder="Ex: Alternador, Motor de Partida..."
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fabricante / Marca"
                icon={Tag}
                value={fabricante}
                onChange={(e) => setFabricante(e.target.value)}
                placeholder="Ex: Bosch, Valeo..."
              />
              <Input
                label="Numeração / Serial"
                icon={Hash}
                value={numeracao}
                onChange={(e) => setNumeracao(e.target.value)}
                placeholder="SN: 000000"
              />
            </div>

            <TextArea
              label="Observações Adicionais"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Estado da peça, defeitos visíveis, etc..."
              rows={3}
            />
          </div>
        </div>
      );
    },
  ),
);

EquipamentoFormSection.displayName = "EquipamentoFormSection";
