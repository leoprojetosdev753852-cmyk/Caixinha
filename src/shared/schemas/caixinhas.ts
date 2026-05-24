import { z } from 'zod';

export const criarCaixinhaSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto').max(120),
  observacao: z.string().max(500).optional(),
  diaPagamento: z.number().int().min(1).max(31),
  mesInicio: z.number().int().min(1).max(12),
  anoInicio: z.number().int().min(2000).max(2100),
  quantidadePontos: z.number().int().min(1).max(60),
  valorTotal: z.number().int().min(1),
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

export const ativarCaixinhaSchema = z.object({}).optional();

export const baixarPagamentoSchema = z.object({
  dataPagamento: z.string(),
  observacao: z.string().max(500).optional(),
});

export type CriarCaixinhaInput = z.infer<typeof criarCaixinhaSchema>;
export type AtualizarPontoInput = z.infer<typeof atualizarPontoSchema>;
export type CriarCotaInput = z.infer<typeof criarCotaSchema>;
export type AtualizarCotaInput = z.infer<typeof atualizarCotaSchema>;
export type BaixarPagamentoInput = z.infer<typeof baixarPagamentoSchema>;
