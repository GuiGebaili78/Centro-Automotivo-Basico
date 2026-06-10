import { Card } from "../ui";

interface OsDiagnosisProps {
  defeitoRelatado?: string | null;
  check_list?: string | null;
  onChangeDefeito: (val: string) => void;
  onChangeCheckList: (val: string) => void;
  onBlurDefeito: (val: string) => void;
  onBlurCheckList: (val: string) => void;
}

export const OsDiagnosis = ({
  defeitoRelatado,
  check_list,
  onChangeDefeito,
  onChangeCheckList,
  onBlurDefeito,
  onBlurCheckList,
}: OsDiagnosisProps) => {
  return (
    <Card className="space-y-4 p-4 h-full">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-600 uppercase tracking-widest flex items-center gap-3 pb-2 border-b border-neutral-100">
          <div className="p-1.5 bg-red-100 rounded-lg text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
          </div>
          DEFEITO RELATADO (IMPRESSÃO PARA O CLIENTE)
        </label>
        <textarea
          className="w-full bg-green-100 border border-green-300 text-emerald-950 p-3 rounded-xl text-base h-32 outline-none resize-none transition-all focus:shadow-sm placeholder:text-gray-400 print:bg-transparent print:text-black placeholder-shown:bg-neutral-25 placeholder-shown:border-neutral-200 placeholder-shown:text-gray-900 placeholder-shown:focus:border-red-300 placeholder-shown:focus:bg-neutral-25"
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
          CHECK LIST (AVARIAS PRÉVIAS, ARRANHÕES, ETC)
        </label>
        <textarea
          className="w-full bg-green-100 border border-green-300 text-emerald-950 p-3 rounded-xl text-base h-32 outline-none resize-none transition-all focus:shadow-sm placeholder:text-gray-400 print:bg-transparent print:text-black placeholder-shown:bg-neutral-25 placeholder-shown:border-neutral-200 placeholder-shown:text-gray-900 placeholder-shown:focus:border-neutral-200 placeholder-shown:focus:bg-neutral-25"
          placeholder="Insira o check list do veículo..."
          value={check_list || ""}
          onChange={(e) => onChangeCheckList(e.target.value)}
          onBlur={(e) => onBlurCheckList(e.target.value)}
        />
      </div>
    </Card>
  );
};
