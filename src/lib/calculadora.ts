import { aplicarPercentual } from '@/shared';
import { diffDays } from './date';

interface CalculoEmprestimoAVista {
  valorOriginal: number; // centavos
  percentualJuros: number; // ex: 10
  percentualJurosAtraso: number; // ex: 0.5 (por dia)
  dataVencimento: Date;
  dataReferencia: Date; // hoje, ou data do pagamento
}

interface ResultadoCalculo {
  valorBase: number; // original + juros normal
  jurosNormal: number;
  jurosAtraso: number;
  diasAtraso: number;
  valorTotal: number; // valor a receber
}

/**
 * Calcula valor a receber de um empréstimo à vista.
 * Se dataReferencia <= dataVencimento → juros atraso = 0
 * Se dataReferencia > dataVencimento → juros atraso = base * (% atraso/dia) * dias
 */
export function calcularEmprestimoAVista(params: CalculoEmprestimoAVista): ResultadoCalculo {
  const { valorOriginal, percentualJuros, percentualJurosAtraso, dataVencimento, dataReferencia } =
    params;

  const jurosNormal = aplicarPercentual(valorOriginal, percentualJuros);
  const valorBase = valorOriginal + jurosNormal;

  const dias = diffDays(dataVencimento, dataReferencia);
  const diasAtraso = dias > 0 ? dias : 0;

  let jurosAtraso = 0;
  if (diasAtraso > 0) {
    // Juros atraso aplicado sobre valorBase (valor + juros normal)
    const jurosPorDia = aplicarPercentual(valorBase, percentualJurosAtraso);
    jurosAtraso = jurosPorDia * diasAtraso;
  }

  return {
    valorBase,
    jurosNormal,
    jurosAtraso,
    diasAtraso,
    valorTotal: valorBase + jurosAtraso,
  };
}

interface CalculoParcela {
  valorDevido: number;
  percentualJurosAtraso: number;
  dataVencimento: Date;
  dataReferencia: Date;
}

/**
 * Calcula valor a pagar de uma parcela em uma data.
 * O valor da parcela JÁ inclui juros normais (admin definiu).
 * Aplica juros atraso se atrasada.
 */
export function calcularParcela(params: CalculoParcela): ResultadoCalculo {
  const { valorDevido, percentualJurosAtraso, dataVencimento, dataReferencia } = params;

  const dias = diffDays(dataVencimento, dataReferencia);
  const diasAtraso = dias > 0 ? dias : 0;

  let jurosAtraso = 0;
  if (diasAtraso > 0) {
    const jurosPorDia = aplicarPercentual(valorDevido, percentualJurosAtraso);
    jurosAtraso = jurosPorDia * diasAtraso;
  }

  return {
    valorBase: valorDevido,
    jurosNormal: 0,
    jurosAtraso,
    diasAtraso,
    valorTotal: valorDevido + jurosAtraso,
  };
}
