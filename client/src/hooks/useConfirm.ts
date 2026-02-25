import { useState } from "react";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  variant?: "danger" | "primary";
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    variant: "primary",
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "primary" = "primary",
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      variant,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  return {
    confirmState,
    requestConfirm,
    closeConfirm,
  };
};
