import { z } from 'zod';
import { validarCPF, limparCPF } from '../cpf';

const cpfSchema = z
  .string()
  .transform(limparCPF)
  .refine((cpf) => cpf.length === 11, { message: 'CPF deve ter 11 dígitos' })
  .refine(validarCPF, { message: 'CPF inválido' });

const senhaSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(72, 'A senha deve ter no máximo 72 caracteres')
  .regex(/[A-Z]/, 'A senha deve conter ao menos uma letra maiúscula')
  .regex(/[a-z]/, 'A senha deve conter ao menos uma letra minúscula')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número');

export const loginSchema = z.object({
  cpf: cpfSchema,
  senha: z.string().min(1, 'Senha obrigatória'),
});

export const checkCpfSchema = z.object({
  cpf: cpfSchema,
});

export const tipoChavePixEnum = z.enum(['CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA']);

export const firstAccessSchema = z
  .object({
    cpf: cpfSchema,
    senha: senhaSchema,
    confirmarSenha: z.string(),
    tipoChavePix: tipoChavePixEnum,
    chavePix: z.string().min(1, 'Chave PIX obrigatória'),
    confirmacaoDados: z.literal(true, {
      errorMap: () => ({ message: 'Você precisa confirmar os dados antes de avançar' }),
    }),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmarSenha'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type CheckCpfInput = z.infer<typeof checkCpfSchema>;
export type FirstAccessInput = z.infer<typeof firstAccessSchema>;
export type TipoChavePix = z.infer<typeof tipoChavePixEnum>;
