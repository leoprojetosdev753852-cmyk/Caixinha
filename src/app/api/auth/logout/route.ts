import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorHandling } from '@/lib/api-helpers';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revogado: true },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('refreshToken');
  return response;
});
