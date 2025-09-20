import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';

import type { Apartamento } from '@/crawlers/core/types';
import crawlers from '@/crawlers/registry';

export async function GET(): Promise<NextResponse<Apartamento[]>> {
  try {
    const combinedListings: Apartamento[] = [];
    for (const crawler of crawlers) {
      const raw = await readFile(crawler.getOutputFileName(true), 'utf-8');
      const listings = JSON.parse(raw) as Apartamento[];
      combinedListings.push(...listings);
    }

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
