import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
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

  // Determine if there are any items in the 15-day range
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + DAYS_TO_SHOW);
  const itemsInRange = items.filter(
    (item) => item.date >= new Date(today.setHours(0, 0, 0, 0)) && item.date <= endDate
  );
  const hasItems = itemsInRange.length > 0;

  const [isExpanded, setIsExpanded] = useState(hasItems);

  useEffect(() => {
    // If it dynamically gets items, we might want to auto-expand, 
    // but typically we let user preference persist if they toggled it.
    // If it was collapsed and suddenly gets items, we can optionally expand it.
    if (itemsInRange.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [items.length]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-3 overflow-hidden transition-all duration-300">
      <div 
        className={`flex items-center justify-between cursor-pointer ${isExpanded ? 'mb-4' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-base font-bold text-purple-700 tracking-tight flex items-center gap-2">
          <CalendarIcon size={16} className="text-purple-700" />
          Agenda (Próximos 15 dias) {itemsInRange.length > 0 && <span className="bg-purple-100 text-purple-800 text-[10px] px-2 py-0.5 rounded-full">{itemsInRange.length}</span>}
        </h2>
        <div className="text-neutral-400 hover:text-purple-600 transition-colors">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar snap-x snap-mandatory animate-in fade-in slide-in-from-top-2">
          {days.map((day, idx) => {
            const dayDateStr = day.toLocaleDateString("en-CA");
            const dayItems = items.filter((item) => {
              const itemDateStr = item.date.toLocaleDateString("en-CA");
              return itemDateStr === dayDateStr;
            });

            const isCurrentDay = isToday(day);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

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

                <div className="space-y-2 min-h-[60px] flex-1">
                  {dayItems.length > 0 ? (
                    dayItems.map((item) => (
                      <div
                        key={item.id_os}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/ordem-de-servico/${item.id_os}`);
                        }}
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
      )}
    </div>
  );
};

