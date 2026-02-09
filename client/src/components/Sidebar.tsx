import { useState } from "react";
import {
  Wrench,
  Package,
  LayoutDashboard,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { path: "/", label: "Monitor", icon: LayoutDashboard },
  {
    label: "Buscar",
    icon: Search,
    path: "/buscar",
    subItems: [
      { path: "/cliente", label: "Clientes" },
      { path: "/veiculo", label: "Veículos" },
      { path: "/fornecedor", label: "Fornecedores" },
      { path: "/funcionario", label: "Colaboradores" },
    ],
  },
  { path: "/ordem-de-servico", label: "Ordens de Serviço", icon: Wrench },
  {
    label: "Estoque",
    icon: Package,
    path: "/estoque",
    subItems: [
      { path: "/pecas-estoque", label: "Visão Geral / Consulta" },
      { path: "/entrada-estoque", label: "Nova Compra (Entrada)" },
    ],
  },
  {
    label: "Financeiro",
    icon: DollarSign,
    path: "/financeiro", // Base path for checking active state
    subItems: [
      { path: "/financeiro/livro-caixa", label: "Gestão Financeira" },
      { path: "/financeiro/equipe", label: "$ Colaboradores" },
      { path: "/financeiro/pagamento-pecas", label: "$ Auto Peças" },
      { path: "/financeiro/contas-pagar", label: "Contas a Pagar" },
      { path: "/financeiro/relatorios", label: "Relatórios Inteligentes ✨" },
      { path: "/fechamento-financeiro", label: "Consolidação" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    path: "/configuracoes-menu",
    subItems: [{ path: "/configuracoes", label: "Personalização" }],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Financeiro"]); // Auto-expand Financeiro for visibility

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col h-screen fixed left-0 top-0 overflow-y-auto border-r border-slate-800 shadow-2xl">
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Auto<span className="text-primary-500">Center</span>
        </h1>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.subItems &&
              item.subItems.some((sub) => location.pathname === sub.path));
          const isExpanded = expandedMenus.includes(item.label);

          return (
            <div key={item.label}>
              {item.subItems ? (
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 font-semibold cursor-pointer ${
                    isActive
                      ? "bg-primary-800 text-white shadow-lg shadow-green-400/20"
                      : "hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={20}
                      className={
                        isActive ? "text-primary-400" : "text-slate-500"
                      }
                    />
                    {item.label}
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold ${
                    isActive
                      ? "bg-primary-800 text-white shadow-lg shadow-green-400/20"
                      : "hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <item.icon
                    size={20}
                    className={isActive ? "text-primary-400" : "text-slate-500"}
                  />
                  {item.label}
                </Link>
              )}

              {/* Submenu Rendering */}
              {item.subItems && isExpanded && (
                <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-800 pl-2">
                  {item.subItems.map((sub) => {
                    const isSubActive = location.pathname === sub.path;
                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                          isSubActive
                            ? "text-white bg-primary-800 shadow-lg shadow-green-200/20 font-bold"
                            : "text-primary-500 hover:text-primary-400 hover:bg-slate-800/30 font-medium"
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-center text-slate-500">
            &copy; 2026 Centro Automotivo <br /> Guilherme Gebaili <br />{" "}
            https://github.com/GuiGebaili78
          </p>
        </div>
      </div>
    </aside>
  );
};
