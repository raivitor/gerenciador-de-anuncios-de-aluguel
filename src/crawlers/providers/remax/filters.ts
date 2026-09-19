export function buildRemaxFilterFromUrl(searchUrl: string): string {
  const url = new URL(searchUrl);
  const params = url.searchParams;

  const filters: string[] = [
    'content/TenantId eq 6',
    'content/OnHoldListing eq false',
    'content/IsRegionalOffice eq false',
    'content/IsViewable eq true',
  ];

  const countryId = params.get('CountryId');
  if (countryId) {
    filters.push(`content/MacroRegionId eq ${countryId}`);
  }

  const provinceId = params.get('Province');
  if (provinceId) {
    filters.push(`content/ProvinceID eq ${provinceId}`);
  }

  const cityParam = params.get('City');
  if (cityParam) {
    const cityIds = cityParam
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    if (cityIds.length === 1) {
      filters.push(`content/CityID eq ${cityIds[0]}`);
    } else if (cityIds.length > 1) {
      filters.push(`(${cityIds.map(id => `content/CityID eq ${id}`).join(' or ')})`);
    }
  }

  const transactionType = params.get('TransactionTypeUID');
  if (transactionType) {
    filters.push(`content/TransactionTypeUID eq ${transactionType}`);
  }

  const macroTypes = params.get('MacroPropertyTypeUIDs');
  if (macroTypes) {
    const typeIds = macroTypes
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    if (typeIds.length === 1) {
      filters.push(`content/MacroPropertyTypeUID eq ${typeIds[0]}`);
    } else if (typeIds.length > 1) {
      filters.push(`(${typeIds.map(id => `content/MacroPropertyTypeUID eq ${id}`).join(' or ')})`);
    }
  }

  const bedrooms = params.get('Bedrooms');
  if (bedrooms) {
    filters.push(`content/NumberOfBedrooms ge ${bedrooms}`);
  }

  const parking = params.get('ParkingSpaces');
  if (parking) {
    filters.push(`content/ParkingSpaces ge ${parking}`);
  }

  const minArea = params.get('MinTotalArea');
  if (minArea) {
    filters.push(`content/TotalArea ge ${minArea}`);
  }

  const maxArea = params.get('MaxTotalArea');
  if (maxArea) {
    filters.push(`content/TotalArea le ${maxArea}`);
  }

  const priceMax = params.get('PriceMax');
  if (priceMax) {
    filters.push(`content/ListingPrice le ${priceMax}`);
  }

  const priceMin = params.get('PriceMin');
  if (priceMin) {
    filters.push(`content/ListingPrice ge ${priceMin}`);
  }

  return filters.join(' and ');
}
