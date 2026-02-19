import { ArrowLeft, CheckCircle, Printer, Save } from "lucide-react";
import { Button } from "../../ui/Button";
import type { IOrdemDeServico } from "../../../types/backend";
import { getStatusStyle } from "../../../utils/osUtils";

interface OsHeaderProps {
  os: IOrdemDeServico;
  onBack: () => void;
  onPrint: () => void;
  onOpenOsNow: () => void;
  onSave?: () => void; // Optional save shortcut
}

export const OsHeader = ({
  os,
  onBack,
  onPrint,
  onOpenOsNow,
  onSave,
}: OsHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-500 hover:text-neutral-700 active:scale-95"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-700 leading-none m-0">
            OS Nº {os.id_os}
          </h1>
          <span className="h-6 w-px bg-neutral-300 mx-1"></span>
          <span
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(os.status)}`}
          >
            {os.status === "PRONTO PARA FINANCEIRO"
              ? "FINANCEIRO"
              : os.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={onPrint}
          title="Imprimir / Enviar Documento"
        >
          <Printer size={18} className="mr-2" />
          Imprimir/Enviar
        </Button>

        {(os.status === "ORCAMENTO" || os.status === "AGENDA") && (
          <>
            {onSave && (
              <Button
                variant="secondary"
                icon={Save}
                onClick={onSave}
                className="shadow-sm border-neutral-200 text-neutral-600"
              >
                Salvar
              </Button>
            )}
            <Button
              variant="primary"
              icon={CheckCircle}
              onClick={onOpenOsNow}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              ABRIR OS AGORA
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
