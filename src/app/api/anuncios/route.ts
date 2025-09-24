import { NextResponse, NextRequest } from 'next/server';
import type { Apartamento } from '@/crawlers/core/types';
import repository from '../../repository/user-annotations-repository';

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ anuncios: Apartamento[]; total: number } | Apartamento[]>> {
  try {
    const { searchParams } = new URL(request.url);

    // Check if requesting all data (for filter options)
    const all = searchParams.get('all') === 'true';

    // Get pagination parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Get filter parameters
    const filters = {
      bairro: searchParams.get('bairro') || undefined,
      quartos: searchParams.get('quartos') || undefined,
      banheiros: searchParams.get('banheiros') || undefined,
      garagem: searchParams.get('garagem') || undefined,
      tamanho: searchParams.get('tamanho') || undefined,
    };

    // Remove undefined filters
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );

    const result = await repository.readAnnotations({
      page,
      limit,
      filters: Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined,
      all,
    });

    // For backward compatibility, return just the array if no pagination was requested
    if (!page && !limit && !all) {
      return NextResponse.json(result.anuncios);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to load listings data', error);
    return NextResponse.json({ anuncios: [], total: 0 }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    console.log(body);
    await repository.writeAnnotations(body);
    return NextResponse.json([], { status: 201 });
  } catch (error) {
    console.error('Failed to load listings data', error);
    return NextResponse.json([], { status: 500 });
  }
}
