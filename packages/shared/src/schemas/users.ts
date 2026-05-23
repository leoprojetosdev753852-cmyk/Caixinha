import { z } from 'zod';
import { validarCPF, limparCPF } from '../cpf';

export const criarUsuarioSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3, 'Nome muito curto')
    .max(120, 'Nome muito longo')
    .regex(/^[\p{L}\s']+$/u, 'Nome só pode conter letras e espaços'),
  cpf: z
    .string()
    .transform(limparCPF)
    .refine((cpf) => cpf.length === 11, { message: 'CPF deve ter 11 dígitos' })
    .refine(validarCPF, { message: 'CPF inválido' }),
});

export const atualizarPerfilFinanceiroSchema = z.object({
  tipoChavePix: z.enum(['CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA']),
  chavePix: z.string().min(1, 'Chave PIX obrigatória'),
});

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
export type AtualizarPerfilFinanceiroInput = z.infer<typeof atualizarPerfilFinanceiroSchema>;
