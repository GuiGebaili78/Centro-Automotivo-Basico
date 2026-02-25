import { useState } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import { Button, Input, FilterButton } from "../ui";
import {
  Search,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Plus,
  X,
} from "lucide-react";
import type {
  ICashBookEntry,
  ICashBookFilters,
} from "../../types/financeiro.types";

interface LivroCaixaTabProps {
  entries: ICashBookEntry[];
}

export const LivroCaixaTab = ({ entries }: LivroCaixaTabProps) => {
  const initialState: ICashBookFilters = {
    startDate: "",
    endDate: "",
    search: "",
  };

  const [filters, setFilters] = useState<ICashBookFilters>(initialState);
  const [activeFilter, setActiveFilter] = useState<string>("");

  const applyQuickFilter = (type: "TODAY" | "WEEK" | "MONTH") => {
    setActiveFilter(type);
    const now = new Date();
    const todayStr = now.toLocaleDateString("en-CA");

    if (type === "TODAY") {
      setFilters((prev) => ({
        ...prev,
        startDate: todayStr,
        endDate: todayStr,
      }));
    } else if (type === "WEEK") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      setFilters((prev) => ({
        ...prev,
        startDate: weekAgo.toLocaleDateString("en-CA"),
        endDate: todayStr,
      }));
    } else if (type === "MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilters((prev) => ({
        ...prev,
        startDate: firstDay.toLocaleDateString("en-CA"),
        endDate: todayStr,
      }));
    }
  };

  const clearFilters = () => {
    setFilters(initialState);
    setActiveFilter("");
  };

  // Filter Logic
  const filteredEntries = entries.filter((entry) => {
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      const date = new Date(entry.date);
      if (date < start) return false;
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      const date = new Date(entry.date);
      if (date > end) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchDesc = entry.description.toLowerCase().includes(searchLower);
      const matchDetails = entry.details.toLowerCase().includes(searchLower);
      if (!matchDesc && !matchDetails) return false;
    }
    return true;
  });

  // Totals
  const totalInflow = filteredEntries
    .filter((e) => e.type === "IN")
    .reduce((acc, e) => acc + e.value, 0);
  const totalOutflow = filteredEntries
    .filter((e) => e.type === "OUT")
    .reduce((acc, e) => acc + e.value, 0);
  const balance = totalInflow - totalOutflow;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters & Actions Row */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 font-bold">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div>
              <Input
                label="Buscar Detalhes"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                placeholder="Ex: OS 123, Pix..."
                icon={Search}
              />
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row items-end gap-2">
              <div className="w-full">
                <Input
                  label="Data Início"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setActiveFilter("CUSTOM");
                  }}
                  className={`font-bold uppercase ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                />
              </div>
              <div className="w-full">
                <Input
                  label="Data Fim"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setActiveFilter("CUSTOM");
                  }}
                  className={`font-bold uppercase ${activeFilter === "CUSTOM" ? "border-primary-300 text-primary-700" : ""}`}
                />
              </div>
            </div>
          </div>
          <Button
            variant="dark"
            icon={Plus}
            onClick={() =>
              alert(
                "Funcionalidade de Lançamento Manual será implementada em breve.",
              )
            }
            className="w-full md:w-auto mt-2 md:mt-0"
          >
            Novo Lançamento
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest min-w-[90px]">
              Períodos Rápidos:
            </span>
            <div className="flex bg-neutral-100 p-1 rounded-xl gap-1">
              <FilterButton
                active={activeFilter === "TODAY"}
                onClick={() => applyQuickFilter("TODAY")}
              >
                Hoje
              </FilterButton>
              <FilterButton
                active={activeFilter === "WEEK"}
                onClick={() => applyQuickFilter("WEEK")}
              >
                Semana
              </FilterButton>
              <FilterButton
                active={activeFilter === "MONTH"}
                onClick={() => applyQuickFilter("MONTH")}
              >
                Mês
              </FilterButton>
            </div>
          </div>
          <Button
            onClick={clearFilters}
            variant="outline"
            size="sm"
            icon={X}
            className="w-full sm:w-auto"
          >
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success-50 text-success-600 rounded-lg">
              <ArrowDownCircle size={20} />
            </div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Entradas
            </p>
          </div>
          <p className="text-3xl font-black text-success-600">
            {formatCurrency(totalInflow)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ArrowUpCircle size={20} />
            </div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Saídas
            </p>
          </div>
          <p className="text-3xl font-black text-red-600">
            {formatCurrency(totalOutflow)}
          </p>
        </div>
        <div className="bg-neutral-900 p-6 rounded-2xl shadow-xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-neutral-800 text-neutral-400 rounded-lg">
              <Wallet size={20} />
            </div>
            <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">
              Saldo
            </p>
          </div>
          <p
            className={`text-3xl font-black ${
              balance >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* TRANSACTIONS TABLE */}
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
              <th className="p-5">Data</th>
              <th className="p-5">Descrição</th>
              <th className="p-5">Detalhes</th>
              <th className="p-5 text-right">Valor</th>
              <th className="p-5 text-center">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filteredEntries.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-10 text-center text-neutral-400 italic font-medium"
                >
                  Nenhuma movimentação encontrada para o filtro.
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-neutral-25 transition-colors"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-2 font-bold text-neutral-600 text-xs">
                      <Calendar size={14} />
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-5 font-bold text-neutral-900">
                    {entry.description}
                  </td>
                  <td className="p-5 text-xs font-medium text-neutral-500">
                    {entry.details}
                  </td>
                  <td className="p-5 text-right font-black text-neutral-900">
                    {formatCurrency(entry.value)}
                  </td>
                  <td className="p-5 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        entry.type === "IN"
                          ? "bg-success-100 text-success-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {entry.type === "IN" ? "ENTRADA" : "SAÍDA"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
