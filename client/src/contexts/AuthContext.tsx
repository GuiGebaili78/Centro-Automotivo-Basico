import { createContext, useContext, useState, type ReactNode } from "react";

interface User {
  id_usuario: number;
  nome: string;
  email: string;
  perfil: "ADMIN" | "ATENDENTE" | "MECANICO";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Lazy initial state para evitar flashing do conteúdo protegido
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("@CentroAutomotivo:user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("@CentroAutomotivo:token");
  });

  const login = (jwtToken: string, userData: User) => {
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("@CentroAutomotivo:token", jwtToken);
    localStorage.setItem("@CentroAutomotivo:user", JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("@CentroAutomotivo:token");
    localStorage.removeItem("@CentroAutomotivo:user");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
