import {
  ArrowLeft,
  Printer,
  CheckCircle,
  Save,
  Car,
  User,
  Calendar,
  Gauge,
  Edit,
} from "lucide-react";
import { Button, Card } from "../ui";
import type { IOrdemDeServico } from "../../types/backend";
import { getStatusStyle } from "../../utils/osUtils";
import { useNavigate } from "react-router-dom";
import { formatPhone } from "../../utils/normalize";

interface OsHeaderCardProps {
  os: IOrdemDeServico;
  onBack: () => void;
  onPrint: () => void;
  onOpenOsNow: () => void;
  onSave?: () => void;
  showDateEdit: boolean;
  setShowDateEdit: (val: boolean) => void;
  updateOSField: (field: any, value: any) => void;
}

export const OsHeaderCard = ({
  os,
  onBack,
  onPrint,
  onOpenOsNow,
  onSave,
  showDateEdit,
  setShowDateEdit,
  updateOSField,
}: OsHeaderCardProps) => {
  const navigate = useNavigate();

  const clientName =
    os.cliente?.pessoa_fisica?.pessoa?.nome ||
    os.cliente?.pessoa_juridica?.razao_social ||
    "Cliente N/I";

  const canEditDate = ["ORCAMENTO", "AGENDAMENTO"].includes(os.status);

  return (
    <Card className="p-0 overflow-hidden border border-neutral-200 shadow-sm mb-6 bg-white">
      {/* Top Header: Actions & ID */}
      <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-neutral-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-all text-neutral-400 hover:text-neutral-700 active:scale-95"
            title="Voltar"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 leading-none m-0 tracking-tight">
                OS |{" "}
                <span className="text-primary-600 font-mono">{os.id_os}</span>
              </h1>
              <span
                className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest ring-1 ${getStatusStyle(os.status)}`}
              >
                {os.status === "PRONTO PARA FINANCEIRO"
                  ? "FINANCEIRO"
                  : (os.status as string).replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-neutral-400 mt-2">
              Gerenciamento de Ordem de Serviço
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={onPrint}
            className="bg-primary-50 border-primary-100 text-primary-700 hover:bg-primary-100 font-black px-6 h-11 uppercase"
          >
            <Printer size={20} className="mr-2" />
            Imprimir
          </Button>

          {(os.status === "ORCAMENTO" || os.status === "AGENDAMENTO") && (
            <Button
              variant="primary"
              icon={CheckCircle}
              onClick={onOpenOsNow}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 h-11"
            >
              ABRIR OS
            </Button>
          )}

          {onSave && (
            <Button
              variant="secondary"
              icon={Save}
              onClick={onSave}
              className="bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold h-11"
            >
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Grid Info Body */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Vehicle (Monitor Table Pattern) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Car size={16} />
            <span className="text-sm font-medium uppercase tracking-widest">
              Veículo
            </span>
            <button
              onClick={() =>
                os.cliente?.id_cliente &&
                navigate(`/cadastro/${os.cliente.id_cliente}`)
              }
              className="text-primary-500 hover:text-primary-600 p-0.5 rounded hover:bg-primary-50"
            >
              <Edit size={16} />
            </button>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 text-base font-bold uppercase">
              {os.veiculo?.marca} {os.veiculo?.modelo} •{" "}
              {os.veiculo?.cor || "---"}
            </span>
            <span className="text-base text-primary-600 uppercase mt-0.5 font-bold">
              {os.veiculo?.placa || "---"} - {os.veiculo?.ano_modelo || "---"}
            </span>
          </div>
        </div>

        {/* Client */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <User size={16} />
            <span className="text-sm font-medium uppercase tracking-widest">
              Cliente
            </span>
            <button
              onClick={() =>
                os.cliente?.id_cliente &&
                navigate(`/cadastro/${os.cliente.id_cliente}`)
              }
              className="text-primary-500 hover:text-primary-600 p-0.5 rounded hover:bg-primary-50"
            >
              <Edit size={16} />
            </button>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900 leading-tight uppercase">
              {clientName}
            </p>
            <p className="text-base font-medium text-gray-500 mt-1 flex items-center gap-1.5">
              {os.cliente?.telefone_1
                ? formatPhone(os.cliente.telefone_1)
                : "Sem telefone"}
            </p>
          </div>
        </div>

        {/* Date / Agendamento (Locked conditionally) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar size={16} />
            <span className="text-sm font-medium uppercase tracking-widest">
              Agendamento
            </span>
          </div>
          <div className="relative">
            {!showDateEdit ? (
              <div className="flex items-center gap-2 group min-h-[40px]">
                <p
                  className={`text-base ${canEditDate ? "text-gray-900" : "text-gray-400"}`}
                >
                  {new Date(os.dt_abertura).toLocaleString([], {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {canEditDate && (
                  <button
                    onClick={() => setShowDateEdit(true)}
                    className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary-50 rounded"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
            ) : (
              <input
                type="datetime-local"
                disabled={!canEditDate}
                className="text-base border border-neutral-200 rounded-xl p-2 w-full focus:border-primary-500 outline-none disabled:bg-neutral-50 disabled:text-neutral-300 shadow-sm"
                defaultValue={new Date(
                  new Date(os.dt_abertura).getTime() -
                    new Date().getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)}
                onBlur={(e) => {
                  if (e.target.value)
                    updateOSField(
                      "dt_abertura",
                      new Date(e.target.value).toISOString(),
                    );
                  setShowDateEdit(false);
                }}
                autoFocus
              />
            )}
          </div>
        </div>

        {/* KM */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Gauge size={16} />
            <span className="text-sm font-medium uppercase tracking-widest">
              KM Atual
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={os.km_entrada || 0}
              onChange={(e) =>
                updateOSField("km_entrada", Number(e.target.value))
              }
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2 text-base font-bold text-gray-900 outline-none focus:border-primary-500"
            />
            <span className="text-xs font-bold text-gray-400 uppercase">
              KM
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
