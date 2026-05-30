import { Outlet } from "react-router-dom";
import { Sidebar } from "../Navigation/Sidebar";
import { Header } from "../Navigation/Header";
import { ContasPreventivoModal } from "../Modals/ContasPreventivoModal";
import { EncerramentoTurnoModal } from "../Modals/EncerramentoTurnoModal";

export function MainLayout() {
  return (
    <div className="flex bg-slate-50 min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 print:m-0 print:w-full print:p-0 print:ml-0">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Alerts Modals */}
      <ContasPreventivoModal />
      <EncerramentoTurnoModal />
    </div>
  );
}
