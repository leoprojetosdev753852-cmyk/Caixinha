import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const cpf = process.env.ADMIN_INITIAL_CPF?.replace(/\D/g, '');
  const senha = process.env.ADMIN_INITIAL_PASSWORD;
  const nome = process.env.ADMIN_INITIAL_NAME ?? 'Administrador';

  if (!cpf || !senha) {
    console.error('❌ ADMIN_INITIAL_CPF e ADMIN_INITIAL_PASSWORD precisam estar no .env');
    process.exit(1);
  }

  if (cpf.length !== 11) {
    console.error('❌ ADMIN_INITIAL_CPF deve ter 11 dígitos (sem pontuação)');
    process.exit(1);
  }

  const existente = await prisma.usuario.findUnique({ where: { cpf } });

  if (existente) {
    console.log(`✅ Admin já existe (CPF ${cpf}). Nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const admin = await prisma.usuario.create({
    data: {
      nomeCompleto: nome,
      cpf,
      senhaHash,
      role: 'ADMIN',
      perfilCompleto: true,
      ativo: true,
    },
  });

  console.log('✅ Admin criado com sucesso:');
  console.log(`   ID: ${admin.id}`);
  console.log(`   Nome: ${admin.nomeCompleto}`);
  console.log(`   CPF: ${admin.cpf}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
