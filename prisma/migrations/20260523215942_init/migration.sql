-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TipoChavePix" AS ENUM ('CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- CreateEnum
CREATE TYPE "StatusCaixinha" AS ENUM ('ATIVA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusPagamentoPonto" AS ENUM ('PENDENTE', 'PAGO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "StatusEmprestimo" AS ENUM ('ATIVO', 'QUITADO', 'ATRASADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "senhaHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "perfilCompleto" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tipoChavePix" "TipoChavePix",
    "chavePix" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "criadoPorId" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixinhas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "valorTotal" INTEGER NOT NULL,
    "quantidadePontos" INTEGER NOT NULL,
    "valorPorPonto" INTEGER NOT NULL,
    "diaPagamento" INTEGER NOT NULL,
    "duracaoMeses" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "status" "StatusCaixinha" NOT NULL DEFAULT 'ATIVA',
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caixinhas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos_caixinha" (
    "id" TEXT NOT NULL,
    "caixinhaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "usuarioId" TEXT,
    "mesContemplacao" INTEGER NOT NULL,
    "alocadoEm" TIMESTAMP(3),

    CONSTRAINT "pontos_caixinha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_ponto" (
    "id" TEXT NOT NULL,
    "pontoId" TEXT NOT NULL,
    "mesReferencia" INTEGER NOT NULL,
    "valorDevido" INTEGER NOT NULL,
    "status" "StatusPagamentoPonto" NOT NULL DEFAULT 'PENDENTE',
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "baixadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_ponto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "valorOriginal" INTEGER NOT NULL,
    "percentualJuros" DECIMAL(5,2) NOT NULL,
    "percentualJurosAtraso" DECIMAL(5,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,
    "valorPago" INTEGER NOT NULL DEFAULT 0,
    "dataPagamento" TIMESTAMP(3),
    "diasAtraso" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusEmprestimo" NOT NULL DEFAULT 'ATIVO',
    "baixadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "categoria" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE INDEX "usuarios_cpf_idx" ON "usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE INDEX "pontos_caixinha_usuarioId_idx" ON "pontos_caixinha"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "pontos_caixinha_caixinhaId_numero_key" ON "pontos_caixinha"("caixinhaId", "numero");

-- CreateIndex
CREATE INDEX "pagamentos_ponto_status_idx" ON "pagamentos_ponto"("status");

-- CreateIndex
CREATE INDEX "pagamentos_ponto_dataVencimento_idx" ON "pagamentos_ponto"("dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_ponto_pontoId_mesReferencia_key" ON "pagamentos_ponto"("pontoId", "mesReferencia");

-- CreateIndex
CREATE INDEX "emprestimos_usuarioId_idx" ON "emprestimos"("usuarioId");

-- CreateIndex
CREATE INDEX "emprestimos_status_idx" ON "emprestimos"("status");

-- CreateIndex
CREATE INDEX "emprestimos_dataVencimento_idx" ON "emprestimos"("dataVencimento");

-- CreateIndex
CREATE INDEX "auditorias_categoria_idx" ON "auditorias"("categoria");

-- CreateIndex
CREATE INDEX "auditorias_usuarioId_idx" ON "auditorias"("usuarioId");

-- CreateIndex
CREATE INDEX "auditorias_criadoEm_idx" ON "auditorias"("criadoEm");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_caixinha" ADD CONSTRAINT "pontos_caixinha_caixinhaId_fkey" FOREIGN KEY ("caixinhaId") REFERENCES "caixinhas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos_caixinha" ADD CONSTRAINT "pontos_caixinha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_ponto" ADD CONSTRAINT "pagamentos_ponto_pontoId_fkey" FOREIGN KEY ("pontoId") REFERENCES "pontos_caixinha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
