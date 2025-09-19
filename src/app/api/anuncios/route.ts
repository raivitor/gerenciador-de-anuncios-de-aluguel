import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';

import type { Apartamento } from '@/corretoras/crawler';

const dataDir = join(process.cwd(), 'src', 'data');
const creditoRealFile = join(dataDir, 'credito_real_anuncio.json');
const ibagyFile = join(dataDir, 'ibagy_anuncio.json');
const oxlFile = join(dataDir, 'olx_anuncio.json');

export async function GET(): Promise<NextResponse<Apartamento[]>> {
  try {
    const [creditoRealRaw, ibagyRaw, oxlRaw] = await Promise.all([
      readFile(creditoRealFile, 'utf-8'),
      readFile(ibagyFile, 'utf-8'),
      readFile(oxlFile, 'utf-8'),
    ]);

    const creditoRealListings = JSON.parse(creditoRealRaw) as Apartamento[];
    const ibagyListings = JSON.parse(ibagyRaw) as Apartamento[];
    const oxlListings = JSON.parse(oxlRaw) as Apartamento[];

    const combinedListings: Apartamento[] = [
      ...creditoRealListings,
      ...ibagyListings,
      ...oxlListings,
    ];
    combinedListings.sort((a, b) => {
      const totalA = typeof a.valor_total === 'number' ? a.valor_total : Number(a.valor_total) || 0;
      const totalB = typeof b.valor_total === 'number' ? b.valor_total : Number(b.valor_total) || 0;
      return totalA - totalB;
    });

    return NextResponse.json(combinedListings.filter(listing => listing.valor_total > 0));
  } catch (error) {
    console.error('Failed to load listings data', error);
    return NextResponse.json([], { status: 500 });
  }
}
