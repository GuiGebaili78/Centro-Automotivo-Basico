import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PrivateRoute: React.FC = () => {
  const { isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  // Se não estiver logado, barrará e jogará para tela de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se precisa trocar a senha, força rota de alteração
  if (mustChangePassword && location.pathname !== "/alterar-senha") {
    return <Navigate to="/alterar-senha" replace />;
  }

  // Se estiver logado, permite que as rotas filhas sejam exibidas
  return <Outlet />;
};
