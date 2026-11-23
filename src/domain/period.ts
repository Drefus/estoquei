const MILLISECONDS_PER_DAY = 86_400_000;

/** Converte dias completos em UTC para um intervalo com fim exclusivo. */
export function getUtcDayPeriod(start: Date, end: Date): { start: number; endExclusive: number } {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new RangeError('O período deve conter datas válidas.');
  }

  const firstDay = new Date(start.getTime());
  const lastDay = new Date(end.getTime());
  firstDay.setUTCHours(0, 0, 0, 0);
  lastDay.setUTCHours(0, 0, 0, 0);

  if (firstDay.getTime() > lastDay.getTime()) {
    throw new RangeError('O início do período não pode ser posterior ao fim.');
  }

  return {
    start: firstDay.getTime(),
    endExclusive: lastDay.getTime() + MILLISECONDS_PER_DAY,
  };
}
