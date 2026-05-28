import { useState, useEffect } from "react";
import {
  ConfiguracaoService,
  type Configuracao,
} from "../../../services/ConfiguracaoService";
import { STATIC_BASE } from "../../../services/api";
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
import { useFechamentoAlert } from "../../../hooks/useFechamentoAlert";
import { toast } from "react-toastify";

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
      { path: "/caixa", label: "Caixa" },
      { path: "/recebiveis", label: "Recebíveis" },
      { path: "/financeiro/equipe", label: "Pgto. Colaboradores" },
      { path: "/financeiro/pagamento-pecas", label: "Pgto. Auto Peças" },
      { path: "/financeiro/contas-pagar", label: "Contas a Pagar" },
      { path: "/financeiro/notas-fiscais", label: "Central NFs 📄" },
      { path: "/financeiro/relatorios", label: "Relatórios Inteligentes ✨" },
      { path: "/fechamento-financeiro", label: "Consolidação" },
    ],
  },
  {
    label: "Configurações",
    icon: Settings,
    path: "/configuracoes-menu",
    subItems: [
      { path: "/configuracoes", label: "Personalização" },
      { path: "/configuracoes/categorias", label: "Categorias Financeiras" },
      { path: "/configuracoes/contas-bancarias", label: "Contas Bancárias" },
      { path: "/configuracoes/operadoras", label: "Operadoras Cartão" },
    ],
  },
];

export const Sidebar = () => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Financeiro"]);
  const [config, setConfig] = useState<Configuracao | null>(null);
  const [logoVersion, setLogoVersion] = useState(Date.now());
  const { shouldAlert, dismissAlert } = useFechamentoAlert();

  useEffect(() => {
    if (shouldAlert && !sessionStorage.getItem('fechamentoToastShown')) {
      toast.warning(
        <div className="flex flex-col gap-2">
          <span className="font-bold text-amber-900">Atenção Operacional!</span>
          <span className="text-sm text-amber-800">Já passou das 16:00. Não esqueça de realizar a Consolidação de Caixa de hoje!</span>
          <button 
            onClick={() => {
              dismissAlert();
              toast.dismiss('fechamento-alert');
            }} 
            className="mt-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-bold w-fit transition-colors"
          >
            Entendi
          </button>
        </div>, 
        { 
          toastId: 'fechamento-alert',
          autoClose: false, 
          closeOnClick: false,
          draggable: false,
          position: "top-right"
        }
      );
      sessionStorage.setItem('fechamentoToastShown', 'true');
    }
  }, [shouldAlert, dismissAlert]);

  useEffect(() => {
    const loadConfig = () => {
      ConfiguracaoService.get()
        .then((data) => {
          setConfig(data);
          setLogoVersion(Date.now());
        })
        .catch(console.error);
    };

    loadConfig();

    // Listener para atualizações de configuração
    window.addEventListener("configuracao-updated", loadConfig);

    return () => {
      window.removeEventListener("configuracao-updated", loadConfig);
    };
  }, []);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  const getLogoUrl = (url: string) => {
    if (!url) return "";
    // Se já for uma URL completa, retorna ela
    if (url.startsWith("http")) return url;
    // Se começar com /, é um caminho relativo do backend (servido em /uploads)
    return `${STATIC_BASE}${url}`;
  };

  return (
    <aside className="w-64 bg-slate-900 text-primary-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 shadow-2xl z-50 print:hidden">
      <div className="border-b border-slate-800 bg-slate-950 flex items-center justify-center h-24 overflow-hidden shrink-0">
        {config?.logoUrl ? (
          <img
            src={`${getLogoUrl(config.logoUrl || "")}?t=${logoVersion}`}
            alt={config.nomeFantasia || "Logo"}
            className="w-full h-full object-contain"
          />
        ) : (
          <h1 className="text-2xl font-bold text-white tracking-tight text-center">
            {config?.nomeFantasia ? (
              <span>{config.nomeFantasia}</span>
            ) : (
              <>
                Auto<span className="text-primary-500">Center</span>
              </>
            )}
          </h1>
        )}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
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
                    const isRecebiveis = sub.path === "/recebiveis";

                    return (
                      <Link
                        key={sub.path}
                        to={sub.path}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                          isSubActive
                            ? "text-white bg-primary-800 shadow-lg shadow-green-200/20"
                            : "text-primary-200 hover:text-primary-400 hover:bg-slate-800/30"
                        }`}
                      >
                        {sub.label}
                        {isRecebiveis && shouldAlert && (
                          <span className="flex h-2 w-2 relative ml-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-slate-800 bg-slate-950 shrink-0">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-xs text-center text-slate-500">
            &copy; 2026 Centro Automotivo <br /> Guilherme Gebaili <br />{" "}
            https://github.com/GuiGebaili78
          </p>
        </div>
      </div>
    </aside>
  );
};
