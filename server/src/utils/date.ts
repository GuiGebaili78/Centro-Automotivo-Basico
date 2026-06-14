import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna o Date object representando o exato momento atual 
 * instanciado sob a ótica do fuso horário de São Paulo.
 * Isso garante que ao salvar no Prisma (UTC), o momento original
 * em UTC-3 esteja perfeitamente mapeado.
 */
export const nowSP = (): Date => {
  return dayjs().tz(TIMEZONE).toDate();
};

/**
 * Retorna o Início e o Fim de um dia sob a ótica de São Paulo.
 * O resultado é convertido para UTC, pronto para ser usado no Prisma em limites de (gte, lte).
 * 
 * @param date Data de referência (string ISO ou Date)
 */
export const getDayBoundsSP = (date: string | Date | dayjs.Dayjs) => {
  const localDate = dayjs(date).tz(TIMEZONE);
  return {
    start: localDate.startOf('day').utc().toDate(),
    end: localDate.endOf('day').utc().toDate()
  };
};

/**
 * Retorna o Início e o Fim de um mês sob a ótica de São Paulo.
 * 
 * @param date Data de referência (string ISO ou Date)
 */
export const getMonthBoundsSP = (date: string | Date | dayjs.Dayjs) => {
  const localDate = dayjs(date).tz(TIMEZONE);
  return {
    start: localDate.startOf('month').utc().toDate(),
    end: localDate.endOf('month').utc().toDate()
  };
};

export { dayjs, TIMEZONE };
