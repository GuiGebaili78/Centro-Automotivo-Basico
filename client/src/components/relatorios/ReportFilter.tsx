import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from "date-fns";
import { Input, Button } from "../ui";

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
      case "last3Months":
        start = startOfMonth(subMonths(today, 3));
        end = endOfMonth(today);
        break;
      case "last6Months":
        start = startOfMonth(subMonths(today, 6));
        end = endOfMonth(today);
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

  const presets = [
    { key: "thisMonth", label: "Este Mês" },
    { key: "last3Months", label: "Últimos 3 Meses" },
    { key: "last6Months", label: "Últimos 6 Meses" },
    { key: "thisYear", label: "Este Ano" },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
        {presets.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePreset(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activePreset === p.key
                ? "bg-primary-50 text-primary-600 ring-1 ring-primary-200"
                : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-end gap-3 border-l-0 sm:border-l pl-0 sm:pl-4 border-neutral-200 w-full sm:w-auto">
        <div className="w-full sm:w-[150px]">
          <Input
            label="Início"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setActivePreset("custom");
            }}
          />
        </div>
        <span className="text-neutral-300 hidden sm:inline mb-3">→</span>
        <div className="w-full sm:w-[150px]">
          <Input
            label="Fim"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setActivePreset("custom");
            }}
          />
        </div>

        <Button
          onClick={handleApply}
          variant="primary"
          disabled={activePreset !== "custom"}
          className={`h-11 px-6 w-full sm:w-auto shrink-0 ${
            activePreset !== "custom"
              ? "!bg-neutral-100 !text-neutral-400 !border-neutral-200 cursor-not-allowed shadow-none"
              : "shadow-md shadow-primary-500/10"
          }`}
        >
          Filtrar
        </Button>
      </div>
    </div>
  );
};
