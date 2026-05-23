/**
 * REGRA: dinheiro armazenado em CENTAVOS (Int).
 */
export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function formatarBRL(centavos: number): string {
  return centavosParaReais(centavos).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function aplicarPercentual(centavos: number, percentual: number): number {
  return Math.round(centavos * (percentual / 100));
}
