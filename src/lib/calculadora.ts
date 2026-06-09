// Helpers de calculo de emprestimos

interface CalcAVistaInput {
  valorOriginal: number; // centavos
  percentualJuros: number; // % normal
  percentualJurosAtraso: number; // % por dia
  dataVencimento: Date;
  dataReferencia: Date;
}

export function calcularEmprestimoAVista(input: CalcAVistaInput): {
  valorTotal: number;
  valorJuros: number;
  valorJurosAtraso: number;
  diasAtraso: number;
} {
  const { valorOriginal, percentualJuros, percentualJurosAtraso } = input;

  const jurosBase = Math.round((valorOriginal * percentualJuros) / 100);

  const venc = new Date(input.dataVencimento);
  venc.setHours(0, 0, 0, 0);
  const ref = new Date(input.dataReferencia);
  ref.setHours(0, 0, 0, 0);

  const diffMs = ref.getTime() - venc.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  // Juros de atraso: incide sobre (valorOriginal + jurosBase)
  const baseAtraso = valorOriginal + jurosBase;
  const jurosAtraso = Math.round((baseAtraso * percentualJurosAtraso * diasAtraso) / 100);

  return {
    valorTotal: valorOriginal + jurosBase + jurosAtraso,
    valorJuros: jurosBase,
    valorJurosAtraso: jurosAtraso,
    diasAtraso,
  };
}

interface CalcParcelaInput {
  valorDevido: number;
  percentualJurosAtraso: number;
  dataVencimento: Date;
  dataReferencia: Date;
}

export function calcularParcela(input: CalcParcelaInput): {
  valorTotal: number;
  valorJurosAtraso: number;
  diasAtraso: number;
} {
  const { valorDevido, percentualJurosAtraso } = input;

  const venc = new Date(input.dataVencimento);
  venc.setHours(0, 0, 0, 0);
  const ref = new Date(input.dataReferencia);
  ref.setHours(0, 0, 0, 0);

  const diffMs = ref.getTime() - venc.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const jurosAtraso = Math.round((valorDevido * percentualJurosAtraso * diasAtraso) / 100);

  return {
    valorTotal: valorDevido + jurosAtraso,
    valorJurosAtraso: jurosAtraso,
    diasAtraso,
  };
}

/**
 * Calcula só os juros (sem capital) - usado pra "Pagar só juros e renovar"
 */
export function calcularSoJuros(input: CalcAVistaInput): {
  valorJuros: number;
  valorJurosAtraso: number;
  totalJuros: number;
  diasAtraso: number;
} {
  const calc = calcularEmprestimoAVista(input);
  return {
    valorJuros: calc.valorJuros,
    valorJurosAtraso: calc.valorJurosAtraso,
    totalJuros: calc.valorJuros + calc.valorJurosAtraso,
    diasAtraso: calc.diasAtraso,
  };
}
