import { Edit } from "lucide-react";
import { Card } from "../../ui/Card";
import { OsVehicleInfo } from "./OsVehicleInfo";
import { OsClientInfo } from "./OsClientInfo";

interface OsInfoCardProps {
  os: any;
  showDateEdit: boolean;
  setShowDateEdit: (val: boolean) => void;
  updateOSField: (field: any, value: any) => void;
}

export const OsInfoCard = ({
  os,
  showDateEdit,
  setShowDateEdit,
  updateOSField,
}: OsInfoCardProps) => {
  return (
    <Card className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-3">
          <OsVehicleInfo
            veiculo={os.veiculo}
            clienteId={os.cliente?.id_cliente}
          />
        </div>
        <div className="md:col-span-3">
          <OsClientInfo cliente={os.cliente} />
        </div>
        <div className="md:col-span-6 flex flex-col md:border-l md:border-neutral-100 md:pl-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1 block">
                Data Agendamento
              </span>
              {!showDateEdit ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-600">
                    {new Date(os.dt_abertura).toLocaleString([], {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    onClick={() => setShowDateEdit(true)}
                    className="text-primary-600 hover:text-primary-800 p-1 hover:bg-primary-50 rounded"
                  >
                    <Edit size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    className="text-sm border border-neutral-300 rounded p-1 bg-white"
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
                </div>
              )}
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1 block">
                KM Atual
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={os.km_entrada || 0}
                  onChange={(e) =>
                    updateOSField("km_entrada", Number(e.target.value))
                  }
                  className="w-24 bg-neutral-50 border border-neutral-200 rounded p-1 text-sm font-bold text-neutral-700 outline-none focus:border-primary-500"
                />
                <span className="text-xs font-bold text-neutral-400">KM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
