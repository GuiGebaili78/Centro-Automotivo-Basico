import type { ReactNode } from "react";
import { MessagesContainer } from "../components/ui/MessagesContainer";

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <MessagesContainer>
      {/* Futuros providers (Auth, Theme, Query) serão aninhados aqui */}
      {children}
    </MessagesContainer>
  );
}
