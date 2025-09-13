import { NextResponse } from 'next/server';
import creditoReal from '@/corretoras/creditoReal';

export async function GET() {
  const creditoRealData = await creditoReal();
  return NextResponse.json(creditoRealData);
}
