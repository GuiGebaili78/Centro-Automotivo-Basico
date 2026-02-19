import { DateRangePicker } from "@tremor/react";
import { ptBR } from "date-fns/locale";
import { Calendar, TrendingUp } from "lucide-react";

interface DateRangePickerValue {
  from?: Date;
  to?: Date;
  selectValue?: string;
}

interface GlobalFilterProps {
  dateRange: DateRangePickerValue;
  onDateRangeChange: (value: DateRangePickerValue) => void;
  compareYearOverYear: boolean;
  onCompareChange: (value: boolean) => void;
}

type PresetKey = "today" | "7days" | "month" | "3months" | "year";

export function GlobalFilter({
  dateRange,
  onDateRangeChange,
  compareYearOverYear,
  onCompareChange,
}: GlobalFilterProps) {
  const presets: Record<
    PresetKey,
    { label: string; range: DateRangePickerValue }
  > = {
    today: {
      label: "Hoje",
      range: {
        from: new Date(new Date().setHours(0, 0, 0, 0)),
        to: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
    "7days": {
      label: "Últimos 7 dias",
      range: {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date(),
      },
    },
    month: {
      label: "Mês Atual",
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
    "3months": {
      label: "Últimos 3 meses",
      range: {
        from: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        to: new Date(),
      },
    },
    year: {
      label: "Ano Atual",
      range: {
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
      },
    },
  };

  const handlePresetClick = (key: PresetKey) => {
    onDateRangeChange(presets[key].range);
  };

  const isActivePreset = (key: PresetKey): boolean => {
    if (!dateRange.from || !dateRange.to) return false;
    const preset = presets[key].range;
    return (
      dateRange.from.toDateString() === preset.from?.toDateString() &&
      dateRange.to.toDateString() === preset.to?.toDateString()
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-bold text-slate-900">Período de Análise</h2>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(presets) as PresetKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handlePresetClick(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActivePreset(key)
                ? "bg-primary-600 text-white shadow-md"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {presets[key].label}
          </button>
        ))}
      </div>

      {/* Date Range Picker */}
      <div className="mb-4">
        <DateRangePicker
          className="max-w-md"
          value={dateRange}
          onValueChange={onDateRangeChange}
          locale={ptBR}
          placeholder="Selecione o período personalizado"
          color="blue"
        />
      </div>

      {/* Year-over-Year Comparison */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <input
          type="checkbox"
          id="compare-yoy"
          checked={compareYearOverYear}
          onChange={(e) => onCompareChange(e.target.checked)}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
        />
        <label
          htmlFor="compare-yoy"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          Comparar com o ano passado
        </label>
      </div>
    </div>
  );
}
