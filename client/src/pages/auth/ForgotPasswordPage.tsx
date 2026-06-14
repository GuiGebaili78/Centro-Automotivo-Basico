import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAlerts } from "../../contexts/AlertsContext";
import { api } from "../../services/api";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { addAlert } = useAlerts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      addAlert("error", "Informe o e-mail.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      // Sempre exibiremos a mesma mensagem genérica, mas aqui podemos sinalizar sucesso
      setSuccess(true);
    } catch (error: any) {
      addAlert("error", "Erro ao solicitar recuperação. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4">
      <div className="max-w-md w-full bg-neutral-800 rounded-xl shadow-lg p-8 border border-neutral-700">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Recuperar Senha</h2>
          <p className="text-neutral-400">Enviaremos um link de recuperação para o seu e-mail.</p>
        </div>

        {success ? (
          <div className="bg-emerald-500/20 text-emerald-300 p-4 rounded-lg border border-emerald-500/50 mb-6 text-center">
            Se o e-mail estiver cadastrado, um link de recuperação foi enviado.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
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
                "Enviar link de recuperação"
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
};
