import { z } from 'zod';

const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((n) => !Number.isNaN(n) && n >= 0 && n <= 999.99, {
    message: 'Percentual inválido',
  });

export const criarEmprestimoSchema = z
  .object({
    nomeDevedor: z.string().min(2, 'Nome muito curto').max(120),
    pixDevedor: z.string().max(200).optional().or(z.literal('')),
    observacao: z.string().max(500).optional().or(z.literal('')),

    tipo: z.enum(['A_VISTA', 'PARCELADO']),
    valorOriginal: z.number().int().min(1),
    percentualJuros: decimalString,
    percentualJurosAtraso: decimalString,

    dataVencimento: z.string().optional(),

    parcelas: z
      .array(
        z.object({
          numero: z.number().int().min(1),
          valorDevido: z.number().int().min(1),
          dataVencimento: z.string(),
        }),
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.tipo === 'A_VISTA') return !!data.dataVencimento;
      if (data.tipo === 'PARCELADO') return !!data.parcelas && data.parcelas.length > 0;
      return true;
    },
    { message: 'Dados incompletos para o tipo de empréstimo escolhido' },
  );

// Editar emprestimo - todos os campos opcionais
export const editarEmprestimoSchema = z.object({
  nomeDevedor: z.string().min(2).max(120).optional(),
  pixDevedor: z.string().max(200).nullable().optional(),
  observacao: z.string().max(500).nullable().optional(),
  valorOriginal: z.number().int().min(1).optional(),
  percentualJuros: decimalString.optional(),
  percentualJurosAtraso: decimalString.optional(),
  dataVencimento: z.string().nullable().optional(),
});

// Novo schema unificado de baixa com 3 tipos
export const baixarEmprestimoSchema = z
  .object({
    dataPagamento: z.string(),
    tipo: z.enum(['INTEGRAL', 'SO_JUROS_RENOVOU', 'PARCIAL']),
    valorPago: z.number().int().min(1).optional(),
    diasRenovacao: z.number().int().min(1).max(365).optional(),
    observacao: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.tipo === 'PARCIAL') return data.valorPago !== undefined && data.valorPago > 0;
      if (data.tipo === 'SO_JUROS_RENOVOU') return (data.diasRenovacao ?? 30) > 0;
      return true;
    },
    { message: 'Dados inválidos para o tipo de pagamento' },
  );

export const baixarParcelaSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

// LEGACY - mantido pra retrocompat
export const baixarEmprestimoAVistaSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

export type CriarEmprestimoInput = z.infer<typeof criarEmprestimoSchema>;
export type EditarEmprestimoInput = z.infer<typeof editarEmprestimoSchema>;
export type BaixarEmprestimoInput = z.infer<typeof baixarEmprestimoSchema>;
