import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  variant?: "danger" | "primary";
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = "danger",
}: ConfirmModalProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 z-10">
        {/* Icon & Header */}
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-full ${isDanger ? "bg-red-50 text-red-600" : "bg-primary-50 text-primary-600"}`}
          >
            {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-neutral-900 leading-6">
              {title}
            </h3>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-neutral-50"
          >
            Cancelar
          </Button>
          <Button variant={isDanger ? "danger" : "primary"} onClick={onConfirm}>
            {isDanger ? "Excluir" : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
