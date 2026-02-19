import { Card } from "../ui/Card";

interface OsDiagnosisProps {
  defeitoRelatado?: string | null;
  diagnostico?: string | null;
  onChangeDefeito: (val: string) => void;
  onChangeDiagnostico: (val: string) => void;
  onBlurDefeito: (val: string) => void;
  onBlurDiagnostico: (val: string) => void;
}

export const OsDiagnosis = ({
  defeitoRelatado,
  diagnostico,
  onChangeDefeito,
  onChangeDiagnostico,
  onBlurDefeito,
  onBlurDiagnostico,
}: OsDiagnosisProps) => {
  return (
    <Card className="space-y-4 p-4 h-full">
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Defeito
          Relatado
        </label>
        <textarea
          className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-red-300 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
          placeholder="Descreva o defeito..."
          value={defeitoRelatado || ""}
          onChange={(e) => onChangeDefeito(e.target.value)}
          onBlur={(e) => onBlurDefeito(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{" "}
          Diagnóstico Técnico
        </label>
        <textarea
          className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 h-32 outline-none focus:border-neutral-200 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm"
          placeholder="Insira o diagnóstico..."
          value={diagnostico || ""}
          onChange={(e) => onChangeDiagnostico(e.target.value)}
          onBlur={(e) => onBlurDiagnostico(e.target.value)}
        />
      </div>
    </Card>
  );
};
