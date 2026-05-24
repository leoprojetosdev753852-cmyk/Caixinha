import { z } from 'zod';

export const criarCaixinhaSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto').max(120),
  observacao: z.string().max(500).optional(),
  pontos: z
    .array(
      z.object({
        numero: z.number().int().min(1),
        valor: z.number().int().min(1, 'Valor deve ser maior que zero'),
        dataContemplacao: z.string().optional(),
      }),
    )
    .min(1, 'Crie pelo menos um ponto'),
});

export const atualizarPontoSchema = z.object({
  valor: z.number().int().min(1).optional(),
  dataContemplacao: z.string().nullable().optional(),
});

export const criarCotaSchema = z.object({
  usuarioId: z.string().min(1),
  valor: z.number().int().min(1),
});

export const atualizarCotaSchema = z.object({
  valor: z.number().int().min(1),
});

export const ativarCaixinhaSchema = z.object({
  parcelas: z
    .array(
      z.object({
        dataVencimento: z.string(), // YYYY-MM-DD
      }),
    )
    .min(1, 'Crie pelo menos uma parcela'),
});

export const baixarPagamentoSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

export type CriarCaixinhaInput = z.infer<typeof criarCaixinhaSchema>;
export type AtualizarPontoInput = z.infer<typeof atualizarPontoSchema>;
export type CriarCotaInput = z.infer<typeof criarCotaSchema>;
export type AtualizarCotaInput = z.infer<typeof atualizarCotaSchema>;
export type AtivarCaixinhaInput = z.infer<typeof ativarCaixinhaSchema>;
export type BaixarPagamentoInput = z.infer<typeof baixarPagamentoSchema>;
