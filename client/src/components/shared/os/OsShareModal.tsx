import { useState } from "react";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { Printer, Mail, Send } from "lucide-react";
import { toast } from "react-toastify";
import { OsService } from "../../../services/os.service";

interface OsShareModalProps {
  osId: number | string;
  isOpen: boolean;
  onClose: () => void;
  clientEmail?: string;
  clientPhone?: string;
}

export const OsShareModal = ({
  osId,
  isOpen,
  onClose,
  clientEmail,
  clientPhone,
}: OsShareModalProps) => {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState("");
  const [mode, setMode] = useState<"EMAIL" | "TELEGRAM" | null>(null);

  const handlePrint = () => {
    // Open print view in new window
    const url = `/print/os/${osId}`;
    const win = window.open(url, "_blank");
    if (win) {
      win.focus();
    }
    onClose();
  };

  const handleSend = async () => {
    if (!mode || !target) return;

    setLoading(true);
    try {
      await OsService.shareOs(osId, mode, target);
      toast.success(`Enviado com sucesso para ${target}`);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Compartilhar / Imprimir OS" onClose={onClose}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={handlePrint}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all group"
          >
            <div className="p-3 bg-neutral-100 text-neutral-600 rounded-full group-hover:scale-110 transition-transform">
              <Printer size={24} />
            </div>
            <span className="font-bold text-sm text-neutral-700">Imprimir</span>
          </button>

          <button
            onClick={() => {
              setMode("EMAIL");
              setTarget(clientEmail || "");
            }}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all group ${
              mode === "EMAIL"
                ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <div
              className={`p-3 rounded-full transition-transform group-hover:scale-110 ${
                mode === "EMAIL"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <Mail size={24} />
            </div>
            <span className="font-bold text-sm text-neutral-700">E-mail</span>
          </button>

          <button
            onClick={() => {
              setMode("TELEGRAM");
              setTarget(clientPhone || ""); // Assuming phone can be used to lookup or just defaulting
            }}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all group ${
              mode === "TELEGRAM"
                ? "bg-sky-50 border-sky-500 ring-1 ring-sky-500"
                : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <div
              className={`p-3 rounded-full transition-transform group-hover:scale-110 ${
                mode === "TELEGRAM"
                  ? "bg-sky-100 text-sky-600"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <Send size={24} />
            </div>
            <span className="font-bold text-sm text-neutral-700">Telegram</span>
          </button>
        </div>

        {mode && (
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 animate-in slide-in-from-top-2 fade-in">
            <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">
              {mode === "EMAIL"
                ? "Endereço de E-mail"
                : "Chat ID / Telefone (Telegram)"}
            </label>
            <div className="flex gap-2">
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={
                  mode === "EMAIL" ? "cliente@email.com" : "123456789"
                }
                className="flex-1 p-2.5 rounded-lg border border-neutral-300 text-sm font-medium outline-none focus:border-primary-500"
              />
              <Button
                onClick={handleSend}
                disabled={!target || loading}
                variant="primary"
                className="px-6"
              >
                {loading ? "Enviando..." : "Enviar"}
              </Button>
            </div>
            {mode === "TELEGRAM" && (
              <p className="text-[10px] text-neutral-400 mt-2">
                *Para Telegram, o usuário deve ter iniciado conversa com o bot.
                Informe o Chat ID.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
