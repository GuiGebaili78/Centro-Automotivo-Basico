import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAlerts } from "../../contexts/AlertsContext";
import { api } from "../../services/api";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addAlert } = useAlerts();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const email = searchParams.get("email");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!email || !token) {
      addAlert("error", "Link de recuperação inválido ou incompleto.");
      navigate("/login");
    }
  }, [email, token, navigate, addAlert]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      addAlert("error", "A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      addAlert("error", "As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email,
        token,
        password,
      });

      addAlert("success", "Senha redefinida com sucesso! Faça login com a nova senha.");
      navigate("/login");
    } catch (error: any) {
      addAlert("error", error.response?.data?.error || "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4">
      <div className="max-w-md w-full bg-neutral-800 rounded-xl shadow-lg p-8 border border-neutral-700">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Nova Senha</h2>
          <p className="text-neutral-400">Crie uma nova senha segura para sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="pass" className="block text-sm font-medium text-neutral-300 mb-2">
              Nova Senha
            </label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPass" className="block text-sm font-medium text-neutral-300 mb-2">
              Confirmar Nova Senha
            </label>
            <input
              id="confirmPass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Digite a senha novamente"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
            ) : (
              "Redefinir Senha"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
