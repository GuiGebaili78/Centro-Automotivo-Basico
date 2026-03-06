import { Card } from "../ui";

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
        <label className="text-sm font-medium text-gray-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
          <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          </div>
          DEFEITO RELATADO
        </label>
        <textarea
          className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-base text-gray-900 h-32 outline-none focus:border-red-300 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm placeholder:text-gray-400"
          placeholder="Descreva o defeito..."
          value={defeitoRelatado || ""}
          onChange={(e) => onChangeDefeito(e.target.value)}
          onBlur={(e) => onBlurDefeito(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
          <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
          </div>
          DIAGNÓSTICO TÉCNICO
        </label>
        <textarea
          className="w-full bg-neutral-25 p-3 rounded-xl border border-neutral-200 text-base text-gray-900 h-32 outline-none focus:border-neutral-200 focus:bg-neutral-25 resize-none transition-all focus:shadow-sm placeholder:text-gray-400"
          placeholder="Insira detalhes adicionais..."
          value={diagnostico || ""}
          onChange={(e) => onChangeDiagnostico(e.target.value)}
          onBlur={(e) => onBlurDiagnostico(e.target.value)}
        />
      </div>
    </Card>
  );
};
