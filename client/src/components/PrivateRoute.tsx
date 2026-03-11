import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PrivateRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Se não estiver logado, barrará e jogará para tela de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, permite que as rotas filhas sejam exibidas
  return <Outlet />;
};
