import { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { FileText, Mail, Send, AlertTriangle } from "lucide-react";
import { api } from "../../services/api";
import { toast } from "react-toastify";

interface DocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  osId: number;
  status: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  clienteNome?: string;
}

export const DocumentoModal = ({
  isOpen,
  onClose,
  osId,
  status,
  clienteEmail,
  clienteTelefone,
  clienteNome,
}: DocumentoModalProps) => {
  const [email, setEmail] = useState(clienteEmail || "");
  const [sendOption, setSendOption] = useState<
    "download" | "email" | "telegram"
  >("download");

  const isOrcamento = status !== "FINALIZADA" && status !== "PAGA_CLIENTE";

  useEffect(() => {
    if (isOpen) {
      setEmail(clienteEmail || "");
      setSendOption("download");
    }
  }, [isOpen, clienteEmail]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (sendOption === "download") {
        const response = await api.get(`/documento/${osId}/pdf`, {
          responseType: "blob",
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        const fileName = isOrcamento
          ? `orcamento-${osId}.pdf`
          : `os-${osId}.pdf`;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("PDF gerado com sucesso!");
        onClose();
      } else if (sendOption === "email") {
        if (!email) {
          toast.error("E-mail é obrigatório para envio.");
          setLoading(false);
          return;
        }
        await api.post(`/documento/${osId}/email`, { email });
        toast.success(`E-mail enviado para ${email}!`);
        onClose();
      } else if (sendOption === "telegram") {
        // TODO: Implement Telegram check or input
        await api.post(`/documento/${osId}/telegram`);
        toast.success("Enviado para o Telegram!");
        onClose();
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.error || "Erro ao processar documento.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      title={isOrcamento ? "Imprimir Orçamento" : "Imprimir OS / Recibo"}
      onClose={onClose}
    >
      <div className="space-y-4">
        {isOrcamento && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg flex items-start gap-2 text-sm border border-amber-200">
            <AlertTriangle size={16} className="mt-0.5" />
            <p>
              Esta OS ainda não foi finalizada. O documento gerado será um{" "}
              <strong>ORÇAMENTO</strong> (sem valor fiscal) e conterá uma marca
              d'água.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm font-bold text-gray-700">
            Como deseja prosseguir?
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSendOption("download")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                sendOption === "download"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-100 hover:border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <FileText size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase">Baixar PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setSendOption("email")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                sendOption === "email"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-100 hover:border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Mail size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase">Enviar E-mail</span>
            </button>

            <button
              type="button"
              onClick={() => setSendOption("telegram")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                sendOption === "telegram"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-100 hover:border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Send size={24} className="mb-2" />
              <span className="text-xs font-bold uppercase">Telegram</span>
            </button>
          </div>
        </div>

        {sendOption === "email" && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 animate-fadeIn">
            <label className="block text-xs font-bold text-gray-500 uppercase">
              E-mail do Cliente
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="exemplo@email.com"
            />
            <p className="text-[10px] text-gray-400">
              Confirme o e-mail antes de enviar.
            </p>
          </div>
        )}

        {sendOption === "telegram" && (
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fadeIn">
            <p className="text-xs text-gray-600 mb-2">
              O envio pelo Telegram requer que o cliente ({clienteNome}) já
              tenha iniciado uma conversa com o Bot da oficina.
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-600 font-bold bg-blue-100 p-2 rounded">
              <AlertTriangle size={14} />
              <span>Recurso em desenvolvimento (Simulado)</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            isLoading={loading}
          >
            {sendOption === "download" ? "Gerar PDF" : "Enviar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
