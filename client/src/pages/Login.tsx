import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../services/api";
import { Input, Button, Card } from "../components/ui";
import { Mail, Lock, ShieldAlert, Key } from "lucide-react";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao realizar login");
      }

      const mustChange = Boolean(data.must_change_password);
      login(data.token, data.usuario, mustChange);
      if (mustChange) {
        navigate("/alterar-senha", { replace: true });
      } else {
        navigate("/"); // Redireciona para a Home/Dashboard do sistema
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8 border border-slate-200/60 shadow-xl bg-white rounded-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="p-3.5 bg-primary-50 rounded-2xl text-primary-600 mb-4 shadow-sm border border-primary-100/50">
            <Key size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Centro Automotivo
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Preencha suas credenciais para acessar o sistema
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-start gap-2.5">
            <ShieldAlert size={20} className="shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@oficina.com"
            required
          />

          <Input
            label="Senha"
            type="password"
            icon={Lock}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha de acesso"
            required
          />

          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
              Esqueceu a senha?
            </Link>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-base font-bold h-12 uppercase tracking-wide"
              variant="primary"
              isLoading={loading}
            >
              Entrar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
