/**
 * Formata um valor em centavos como reais (ex.: 1999 -> "R$ 19,99").
 * Usa espaço comum entre "R$" e o número para ter a mesma saída em qualquer
 * sistema operacional, independentemente dos dados de localidade do Node.
 */
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`Valor em centavos deve ser inteiro: ${cents}`);
  }
  const sign = cents < 0 ? '-' : '';
  const absolute = Math.abs(cents);
  const reais = Math.floor(absolute / 100);
  const centavos = String(absolute % 100).padStart(2, '0');
  const reaisWithThousands = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${reaisWithThousands},${centavos}`;
}
