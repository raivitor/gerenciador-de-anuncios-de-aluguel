import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';

import type creditoRealData from '@/data/credito_real_anuncio.json';
import type ibagyData from '@/data/ibaggy_anuncio.json';

type CreditoRealItem = (typeof creditoRealData)[number];
type IbagyItem = (typeof ibagyData)[number];

type Listing = CreditoRealItem | IbagyItem;

const dataDir = join(process.cwd(), 'src', 'data');
const creditoRealFile = join(dataDir, 'credito_real_anuncio.json');
const ibagyFile = join(dataDir, 'ibaggy_anuncio.json');

export async function GET(): Promise<NextResponse<Listing[]>> {
  try {
    const [creditoRealRaw, ibagyRaw] = await Promise.all([
      readFile(creditoRealFile, 'utf-8'),
      readFile(ibagyFile, 'utf-8'),
    ]);

    const creditoRealListings = JSON.parse(creditoRealRaw) as CreditoRealItem[];
    const ibagyListings = JSON.parse(ibagyRaw) as IbagyItem[];

    const combinedListings: Listing[] = [...creditoRealListings, ...ibagyListings];

    combinedListings.sort((a, b) => {
      const totalA = typeof a.valor_total === 'number' ? a.valor_total : Number(a.valor_total) || 0;
      const totalB = typeof b.valor_total === 'number' ? b.valor_total : Number(b.valor_total) || 0;
      return totalA - totalB;
    });

    return NextResponse.json(combinedListings);
  } catch (error) {
    console.error('Failed to load listings data', error);
    return NextResponse.json([], { status: 500 });
  }
}
