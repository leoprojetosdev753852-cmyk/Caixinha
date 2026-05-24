import { z } from 'zod';

export const loginSchema = z.object({
  identificador: z
    .string()
    .min(3, 'Identificador muito curto')
    .max(50, 'Identificador muito longo'),
  senha: z.string().min(1, 'Senha obrigatória'),
});

export type LoginInput = z.infer<typeof loginSchema>;
