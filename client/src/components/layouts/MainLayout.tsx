import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

export function MainLayout() {
  return (
    <div className="flex bg-background min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs ou Header Global poderiam entrar aqui */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}