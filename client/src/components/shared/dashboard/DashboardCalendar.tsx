import { Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ScheduledItem {
  id_os: number;
  date: Date;
  clientName: string;
  vehicleModel?: string;
  status: string; // 'ORCAMENTO' | 'AGENDA'
}

interface DashboardCalendarProps {
  items: ScheduledItem[];
}

export const DashboardCalendar = ({ items }: DashboardCalendarProps) => {
  const navigate = useNavigate();
  const DAYS_TO_SHOW = 15;

  // Generate next 15 days
  const today = new Date();
  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() && date.getMonth() === today.getMonth()
    );
  };

  const getDayName = (date: Date) => {
    return date
      .toLocaleDateString("pt-BR", { weekday: "short" })
      .replace(".", "")
      .toUpperCase();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-purple-700 tracking-tight flex items-center gap-2">
          <CalendarIcon size={16} className="text-purple-700" />
          Agenda (Próximos 15 dias)
        </h2>
        {/* Simple pagination controls if needed, or just horizontal scroll */}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory">
        {days.map((day, idx) => {
          // Adjust comparison to ignore time and potential timezone offsets creating mismatches
          const dayDateStr = day.toLocaleDateString("en-CA");

          const dayItems = items.filter((item) => {
            const itemDateStr = item.date.toLocaleDateString("en-CA");
            return itemDateStr === dayDateStr;
          });

          const isCurrentDay = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6; // 0=Sun, 6=Sat

          return (
            <div
              key={idx}
              className={`min-w-[140px] flex-1 border rounded-xl p-2 snap-start relative flex flex-col ${
                isCurrentDay
                  ? "bg-purple-50/50 border-purple-200"
                  : isWeekend
                    ? "bg-purple-200 border-slate-200 shadow-inner"
                    : "bg-neutral-50/50 border-neutral-200"
              }`}
            >
              {/* Header of the Day Card */}
              <div
                className={`flex flex-col mb-3 pb-2 border-b ${isCurrentDay ? "border-purple-200" : "border-neutral-200"}`}
              >
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${isCurrentDay ? "text-purple-700" : "text-neutral-400"}`}
                >
                  {getDayName(day)}
                </span>
                <span
                  className={`text-base font-black ${isCurrentDay ? "text-purple-700" : "text-neutral-700"}`}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Items - Scrollable if many */}
              <div className="space-y-2 min-h-[60px] max-h-[160px] overflow-y-auto custom-scrollbar flex-1">
                {dayItems.length > 0 ? (
                  dayItems.map((item) => (
                    <div
                      key={item.id_os}
                      onClick={() =>
                        navigate(`/ordem-de-servico?id=${item.id_os}`)
                      }
                      className="bg-purple-100 p-1.5 rounded-lg border border-neutral-200 shadow-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group shrink-0"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-purple-700 line-clamp-1 flex-1">
                          {item.clientName}
                        </p>
                        <span className="text-xs text-neutral-600 font-medium bg-neutral-50 px-1 rounded shrink-0">
                          {item.date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 line-clamp-1 mt-0.5">
                        {item.vehicleModel || "Veículo N/I"}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center pt-2 opacity-30">
                    <span className="text-xs font-medium text-neutral-600">
                      ---
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
