import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useAlerts } from "../../../contexts/AlertsContext";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Key, ChevronDown, Sunset, ShieldAlert } from "lucide-react";

export const Header = () => {
  const { user, logout } = useAuth();
  const { showWarningIcon, pendingContasCount, setIsContasModalOpen, triggerClosingModal } = useAlerts();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "ADMIN": return "Administrador";
      case "ATENDENTE": return "Atendente";
      case "MECANICO": return "Mecânico";
      default: return role;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 h-16 px-8 flex items-center justify-between sticky top-0 z-40 w-full shrink-0 shadow-sm select-none">
      {/* Dynamic Welcome Message */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col">
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Centro Automotivo</span>
          <span className="text-base font-bold text-slate-900 leading-tight">
            Olá, {user?.nome || "Operador"}!
          </span>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Discrete High-Priority Warning Icon for accounts payable */}
        {showWarningIcon && (
          <button
            onClick={() => setIsContasModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-all animate-pulse select-none cursor-pointer"
            title={`Existem ${pendingContasCount} contas a pagar pendentes vencendo hoje!`}
          >
            <ShieldAlert size={16} />
            <span className="hidden md:inline">Contas Vencendo Hoje!</span>
            <span className="bg-white text-red-700 rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none">
              {pendingContasCount}
            </span>
          </button>
        )}

        {/* User Profile Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 group focus:outline-none cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center border border-slate-700 text-xs shadow-sm hover:bg-slate-800 transition-colors uppercase">
              {getInitials(user?.nome || "")}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-sm font-bold text-slate-800 leading-tight group-hover:text-slate-950 transition-colors">
                {user?.nome}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {formatRole(user?.perfil || "")}
              </span>
            </div>

            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1 md:hidden">
                <p className="text-sm font-bold text-slate-800">{user?.nome}</p>
                <p className="text-xs text-slate-400">{formatRole(user?.perfil || "")}</p>
              </div>

              {/* End of Shift Action */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  triggerClosingModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left font-semibold cursor-pointer"
              >
                <Sunset size={16} className="text-amber-500" />
                Encerramento de Turno
              </button>

              {/* Change Password Link */}
              <Link
                to="/alterar-senha"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-semibold"
              >
                <Key size={16} className="text-slate-500" />
                Alterar Senha
              </Link>

              {/* Logout Action */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left font-semibold border-t border-slate-100 mt-1.5 pt-1.5 cursor-pointer"
              >
                <LogOut size={16} className="text-red-500" />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
