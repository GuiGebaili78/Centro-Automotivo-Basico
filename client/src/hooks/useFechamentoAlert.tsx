import { useState, useEffect } from 'react';

export const useFechamentoAlert = () => {
  const [shouldAlert, setShouldAlert] = useState(false);

  useEffect(() => {
    const checkAlert = () => {
      const now = new Date();
      const isAfter4PM = now.getHours() >= 16;
      
      const lastClosed = sessionStorage.getItem('fechamentoAlertDismissed');
      const todayString = now.toLocaleDateString('pt-BR');
      
      if (isAfter4PM && lastClosed !== todayString) {
        setShouldAlert(true);
      } else {
        setShouldAlert(false);
      }
    };

    checkAlert();
    
    // Check every minute
    const interval = setInterval(checkAlert, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = () => {
    const now = new Date();
    sessionStorage.setItem('fechamentoAlertDismissed', now.toLocaleDateString('pt-BR'));
    setShouldAlert(false);
  };

  return { shouldAlert, dismissAlert };
};
