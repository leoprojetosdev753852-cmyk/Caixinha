// Seed: cria admin com username 'admcaixa'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_USERNAME = 'admcaixa';
const ADMIN_SENHA = 'adm@2026caixa';
const ADMIN_NOME = 'Administrador';

async function main() {
  // Verifica se já existe admin com este username
  const existente = await prisma.usuario.findUnique({
    where: { username: ADMIN_USERNAME },
  });

  if (existente) {
    console.log(`✅ Admin já existe (username ${ADMIN_USERNAME}). Nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(ADMIN_SENHA, 10);

  const admin = await prisma.usuario.create({
    data: {
      nomeCompleto: ADMIN_NOME,
      username: ADMIN_USERNAME,
      cpf: null,
      senhaHash,
      role: 'ADMIN',
      perfilCompleto: true,
      ativo: true,
    },
  });

  console.log(`✅ Admin criado: ${admin.nomeCompleto} (username: ${admin.username})`);
  console.log(`   Senha: ${ADMIN_SENHA}`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
