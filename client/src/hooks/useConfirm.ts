import { useState } from "react";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const requestConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm, // Dependendo do caso, pode ser interessante envolver em useCallback no consumidor
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
