import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../services/api";
import { Input, Button, Card } from "../components/ui";
import { Lock, ShieldAlert } from "lucide-react";

export const ChangePasswordPage: React.FC = () => {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { token, mustChangePassword, clearMustChangePassword, logout } =
    useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (novaSenha.length < 8) {
      setError("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    if (novaSenha === senhaAtual) {
      setError("A nova senha deve ser diferente da atual.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            senha_atual: senhaAtual,
            nova_senha: novaSenha,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar senha");
      }

      clearMustChangePassword();
      navigate("/", { replace: true });
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
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Alterar sua Senha
          </h2>
          {mustChangePassword ? (
            <p className="text-sm text-slate-500 mt-2 max-w-xs">
              Este é seu primeiro acesso. Por segurança, defina uma nova senha para continuar.
            </p>
          ) : (
            <p className="text-sm text-slate-500 mt-2">
              Mantenha sua conta segura atualizando seus dados.
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold flex items-start gap-2.5">
            <ShieldAlert size={20} className="shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Senha Atual"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="Digite sua senha atual"
            required
          />

          <Input
            label="Nova Senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            required
            minLength={8}
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Confirme sua nova senha"
            required
            minLength={8}
          />

          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-base font-bold h-12 uppercase tracking-wide"
              variant="primary"
              isLoading={loading}
            >
              Alterar senha
            </Button>

            {mustChangePassword && (
              <Button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="w-full text-sm font-bold h-11 uppercase"
                variant="ghost"
              >
                Cancelar e sair
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
