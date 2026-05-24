import { z } from 'zod';

const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => Number(v))
  .refine((n) => !Number.isNaN(n) && n >= 0 && n <= 999.99, {
    message: 'Percentual inválido',
  });

export const criarEmprestimoSchema = z
  .object({
    usuarioId: z.string().min(1),
    tipo: z.enum(['A_VISTA', 'PARCELADO']),
    valorOriginal: z.number().int().min(1),
    percentualJuros: decimalString,
    percentualJurosAtraso: decimalString,
    observacao: z.string().max(500).optional(),

    // Para A_VISTA
    dataVencimento: z.string().optional(),

    // Para PARCELADO
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

export const baixarEmprestimoAVistaSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

export const baixarParcelaSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

export type CriarEmprestimoInput = z.infer<typeof criarEmprestimoSchema>;
