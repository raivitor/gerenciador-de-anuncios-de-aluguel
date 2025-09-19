import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';

import type { RentalListing } from '@/corretoras/crawler';

const dataDir = join(process.cwd(), 'src', 'data');
const creditoRealFile = join(dataDir, 'credito_real_anuncio.json');
const ibagyFile = join(dataDir, 'ibaggy_anuncio.json');
const oxlFile = join(dataDir, 'olx_anuncio.json');

export async function GET(): Promise<NextResponse<RentalListing[]>> {
  try {
    const [creditoRealRaw, ibagyRaw, oxlRaw] = await Promise.all([
      readFile(creditoRealFile, 'utf-8'),
      readFile(ibagyFile, 'utf-8'),
      readFile(oxlFile, 'utf-8'),
    ]);

    const creditoRealListings = JSON.parse(creditoRealRaw) as RentalListing[];
    const ibagyListings = JSON.parse(ibagyRaw) as RentalListing[];
    const oxlListings = JSON.parse(oxlRaw) as RentalListing[];

    const combinedListings: RentalListing[] = [
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
