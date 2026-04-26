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
  mustChangePassword: boolean;
  login: (
    token: string,
    userData: User,
    mustChangePassword?: boolean,
  ) => void;
  clearMustChangePassword: () => void;
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

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    return (
      localStorage.getItem("@CentroAutomotivo:mustChangePassword") === "true"
    );
  });

  const login = (
    jwtToken: string,
    userData: User,
    mustChange: boolean = false,
  ) => {
    setToken(jwtToken);
    setUser(userData);
    setMustChangePassword(mustChange);
    localStorage.setItem("@CentroAutomotivo:token", jwtToken);
    localStorage.setItem("@CentroAutomotivo:user", JSON.stringify(userData));
    localStorage.setItem(
      "@CentroAutomotivo:mustChangePassword",
      String(mustChange),
    );
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    localStorage.setItem("@CentroAutomotivo:mustChangePassword", "false");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    localStorage.removeItem("@CentroAutomotivo:token");
    localStorage.removeItem("@CentroAutomotivo:user");
    localStorage.removeItem("@CentroAutomotivo:mustChangePassword");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        mustChangePassword,
        login,
        clearMustChangePassword,
        logout,
        isAuthenticated: !!token,
      }}
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
