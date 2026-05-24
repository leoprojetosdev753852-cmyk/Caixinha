import { z } from 'zod';
import { validarCPF, limparCPF } from '../cpf';

export const criarUsuarioSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3, 'Nome muito curto')
    .max(120, 'Nome muito longo')
    .regex(/^[\p{L}\s'.-]+$/u, 'Nome só pode conter letras e espaços'),
  cpf: z
    .string()
    .transform((v) => (v ? limparCPF(v) : ''))
    .refine((cpf) => cpf === '' || cpf.length === 11, { message: 'CPF deve ter 11 dígitos' })
    .refine((cpf) => cpf === '' || validarCPF(cpf), { message: 'CPF inválido' })
    .optional()
    .or(z.literal('')),
});

export const atualizarUsuarioAdminSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[\p{L}\s'.-]+$/u, 'Nome inválido')
    .optional(),
  ativo: z.boolean().optional(),
  cpf: z
    .string()
    .transform((v) => (v ? limparCPF(v) : ''))
    .refine((cpf) => cpf === '' || cpf.length === 11)
    .refine((cpf) => cpf === '' || validarCPF(cpf))
    .optional()
    .or(z.literal('')),
});

export const atualizarPerfilFinanceiroSchema = z.object({
  tipoChavePix: z.enum(['CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA']),
  chavePix: z.string().min(1).max(200),
});

export const listarUsuariosQuerySchema = z.object({
  busca: z.string().optional(),
  apenas: z.enum(['ativos', 'inativos', 'todos']).default('ativos'),
});

export type CriarUsuarioInput = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioAdminInput = z.infer<typeof atualizarUsuarioAdminSchema>;
export type AtualizarPerfilFinanceiroInput = z.infer<typeof atualizarPerfilFinanceiroSchema>;
export type ListarUsuariosQuery = z.infer<typeof listarUsuariosQuerySchema>;
