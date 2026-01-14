import { Outlet } from 'react-router-dom';
import { Sidebar } from '../Sidebar';

export function MainLayout() {
  return (
    <div className="flex bg-background min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="mx-full">
          {/* Breadcrumbs ou Header Global poderiam entrar aqui */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}