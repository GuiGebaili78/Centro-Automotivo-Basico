import React, { useState, useEffect, useRef } from "react";
import { FinanceiroService } from "../../services/financeiro.service";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

// Registro global em memória para desduplicação de chamadas HTTP simultâneas para o mesmo nf_numero
const pendingRequests = new Map<string, Promise<{ matchPercent: number }>>();
const resolvedCache = new Map<string, { matchPercent: number; timestamp: number }>();
const STALE_TIME = 30000; // Tempo de cache de 30 segundos

/**
 * Função de-duplicadora e cache de requisições ao backend.
 * Garante que se múltiplas parcelas com a mesma NF renderizarem simultaneamente,
 * apenas uma única chamada HTTP é disparada e compartilhada por todas as instâncias.
 */
const fetchNfSyncStatus = (nfNumero: string, idFornecedor?: number): Promise<{ matchPercent: number }> => {
  const cacheKey = `${nfNumero}_${idFornecedor || 'null'}`;
  const now = Date.now();
  const cached = resolvedCache.get(cacheKey);

  // Retorna do cache se estiver válido
  if (cached && now - cached.timestamp < STALE_TIME) {
    return Promise.resolve(cached);
  }

  // Se já houver uma requisição em andamento para esta NF, reaproveita a mesma promessa
  let promise = pendingRequests.get(cacheKey);
  if (!promise) {
    promise = FinanceiroService.getNfSyncStatus(nfNumero, idFornecedor)
      .then((data) => {
        const result = { matchPercent: Number(data.matchPercent || 0) };
        resolvedCache.set(cacheKey, { ...result, timestamp: Date.now() });
        pendingRequests.delete(cacheKey);
        return result;
      })
      .catch((err) => {
        pendingRequests.delete(cacheKey);
        throw err;
      });
    pendingRequests.set(cacheKey, promise);
  }
  return promise;
};

interface NfSyncBadgeProps {
  nf_numero: string;
  id_fornecedor?: number;
}

export const NfSyncBadge: React.FC<NfSyncBadgeProps> = ({ nf_numero, id_fornecedor }) => {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [percent, setPercent] = useState<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const isMounted = useRef<boolean>(true);

  // Mantém controle seguro de montagem do componente para evitar vazamento de memória / memory leaks
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadStatus = async (force = false) => {
    if (!nf_numero) return;
    setStatus("loading");
    try {
      if (force) {
        resolvedCache.delete(`${nf_numero}_${id_fornecedor || 'null'}`);
        pendingRequests.delete(`${nf_numero}_${id_fornecedor || 'null'}`);
      }
      const data = await fetchNfSyncStatus(nf_numero, id_fornecedor);
      if (isMounted.current) {
        setPercent(data.matchPercent);
        setStatus("success");
      }
    } catch (error) {
      if (isMounted.current) {
        console.error(`Erro ao carregar status da NF ${nf_numero}:`, error);
        setStatus("error");
      }
    }
  };

  // IntersectionObserver: Dispara a busca apenas se o componente estiver visível no visor (viewport)
  useEffect(() => {
    const element = elementRef.current;
    if (!element || !nf_numero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && isMounted.current) {
          loadStatus();
          observer.unobserve(element);
        }
      },
      {
        rootMargin: "50px", // pré-carrega ligeiramente antes de entrar na tela
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [nf_numero]);

  if (!nf_numero) return null;

  return (
    <div ref={elementRef} className="inline-flex items-center gap-1.5 text-xs mt-1">
      {status === "idle" && (
        <span className="text-neutral-400 animate-pulse italic">Aguardando...</span>
      )}

      {status === "loading" && (
        <span className="inline-flex items-center gap-1 text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
          <RefreshCw size={10} className="animate-spin text-slate-400" /> Sincronizando...
        </span>
      )}

      {status === "error" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            loadStatus(true);
          }}
          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full border border-red-200 transition-colors shadow-sm"
          title="Erro ao carregar sincronização. Clique para tentar novamente."
        >
          <AlertCircle size={10} /> Erro (Recarregar)
        </button>
      )}

      {status === "success" && percent !== null && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            {percent > 100 ? (
              <span className="inline-flex items-center gap-1 text-white bg-red-600 border border-red-700 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <AlertCircle size={10} className="text-white" /> Ultrapassou o valor da NF ({Math.round(percent)}%)
              </span>
            ) : percent === 100 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <CheckCircle2 size={10} className="text-emerald-500" /> 💲 Valor: {Math.round(percent)}%
              </span>
            ) : percent === 0 ? (
              <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <AlertCircle size={10} className="text-red-500" /> 💲 Valor: {Math.round(percent)}%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                <AlertCircle size={10} className="text-amber-500" /> 💲 Valor: {Math.round(percent)}%
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadStatus(true);
              }}
              className="text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 p-1 rounded-md transition-all active:scale-95"
              title="Atualizar Status de Sincronização"
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
