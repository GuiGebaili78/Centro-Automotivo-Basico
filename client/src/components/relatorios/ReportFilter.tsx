import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";

interface ReportFilterProps {
  onFilterChange: (startDate: string, endDate: string) => void;
}

export const ReportFilter = ({ onFilterChange }: ReportFilterProps) => {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [activePreset, setActivePreset] = useState<string>("thisMonth");

  useEffect(() => {
    // Initial load
    onFilterChange(startDate, endDate);
  }, []);

  const handleApply = () => {
    setActivePreset("custom");
    onFilterChange(startDate, endDate);
  };

  const handlePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case "last3Months":
        start = subMonths(today, 3);
        end = today;
        break;
      case "thisYear":
        start = startOfYear(today);
        end = endOfYear(today);
        break;
    }

    const s = format(start, "yyyy-MM-dd");
    const e = format(end, "yyyy-MM-dd");

    setStartDate(s);
    setEndDate(e);
    setActivePreset(preset);
    onFilterChange(s, e);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
        <button
          onClick={() => handlePreset("thisMonth")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activePreset === "thisMonth"
              ? "bg-primary-50 text-primary-600 ring-1 ring-primary-200"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Este Mês
        </button>
        <button
          onClick={() => handlePreset("lastMonth")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activePreset === "lastMonth"
              ? "bg-primary-50 text-primary-600 ring-1 ring-primary-200"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Mês Passado
        </button>
        <button
          onClick={() => handlePreset("last3Months")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activePreset === "last3Months"
              ? "bg-primary-50 text-primary-600 ring-1 ring-primary-200"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Últimos 3 Meses
        </button>
        <button
          onClick={() => handlePreset("thisYear")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activePreset === "thisYear"
              ? "bg-primary-50 text-primary-600 ring-1 ring-primary-200"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          Este Ano
        </button>
      </div>

      <div className="flex items-center gap-2 border-l pl-4 border-neutral-200">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Início
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActivePreset("custom");
            }}
            className="text-sm font-medium text-neutral-700 bg-transparent outline-none focus:text-primary-600"
          />
        </div>
        <span className="text-neutral-300 mx-1">→</span>
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">
            Fim
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActivePreset("custom");
            }}
            className="text-sm font-medium text-neutral-700 bg-transparent outline-none focus:text-primary-600"
          />
        </div>

        <button
          onClick={handleApply}
          className={`ml-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activePreset === "custom"
              ? "bg-primary-600 text-white shadow-md hover:bg-primary-700"
              : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
          }`}
          disabled={activePreset !== "custom"}
        >
          Filtrar
        </button>
      </div>
    </div>
  );
};
