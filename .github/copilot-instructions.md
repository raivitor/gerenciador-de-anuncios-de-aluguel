# Gerenciador de Anúncios de Aluguel - AI Agent Instructions

## Project Overview
This is a Next.js 15 (App Router) application that aggregates rental apartment listings from multiple Brazilian real estate websites. It scrapes listings, stores them as JSON, combines them with user annotations, and presents them in a filterable, paginated table interface.

## Architecture

### Core Components
1. **Crawler System** (`src/crawlers/`): Provider-specific web scrapers that inherit from base classes
2. **Data Layer** (`src/data/`): JSON files storing scraped listings and user annotations
3. **API Routes** (`src/app/api/`): Next.js route handlers for data access and crawler execution
4. **Frontend** (`src/app/page.tsx`): Material-UI table with filters, pagination, and inline editing

### Data Flow
```
Crawlers → JSON files (src/data/*.json) → Repository → API Routes → Frontend
                                              ↓
                                    User Annotations (anotacoes.json)
```
---

## 🧠 AI Agent Behavior Guidelines

These rules define how the AI assistant should interact with this project.

### 1. Minimal Code Changes
- Make the **smallest possible modification** to achieve the requested outcome.  
- Avoid refactoring or optimizing unrelated parts of the code.  
- Only touch files that are **strictly necessary** for the change.

### 2. Suggest Instead of Acting
- If a change seems broader than what was requested or may impact other areas:  
  → **Do not apply the change directly.**  
  → **Suggest it**, explaining briefly *why* it could be beneficial.  

### 3. Short and Objective Explanations
- After completing a task, provide a **short summary** of what was done (1–2 sentences max).  
- Example:  
  > “Updated the crawler selector to match the new page layout. No other changes made.”

### 4. Style and Communication
- Use concise, professional Portuguese.  
- Prefer clarity and focus over verbosity.  
- Avoid redundant explanations or repeating context already visible in code.

---

## Crawler Development

### Adding a New Crawler Provider
Each crawler provider lives in `src/crawlers/providers/<name>/` with this structure:
- `crawler.ts`: Main scraper class extending `BaseCrawler` or `PuppeteerCrawler`
- `filters.ts` (optional): Provider-specific search filters
- `index.ts`: Re-exports the crawler instance

**Key Pattern:**
```typescript
export class ProviderCrawler extends BaseCrawler {
  baseURL = 'https://provider.com';
  
  constructor() {
    super('providerName'); // This name becomes the JSON filename
  }
  
  protected async scrape(): Promise<Apartamento[]> {
    // Return array with required fields: id, valor_aluguel, valor_total, url_apartamento, corretora
    // Optional fields: bairro, tamanho, quartos, banheiros, garagem
  }
}

export default new ProviderCrawler();
```

**Critical:** 
- Generate unique IDs as `${this.name}_${uniqueIdentifier}` 
- Always set `corretora: this.name`
- Use `BaseCrawler` for Axios/Cheerio scraping, `PuppeteerCrawler` for JavaScript-rendered sites
- Register in `src/crawlers/registry.ts` to enable the crawler

### Scraping Techniques
- **Cheerio-based** (most providers): Use `axios` + `cheerio` for static HTML
- **Puppeteer-based** (dynamic sites): Extend `PuppeteerCrawler` for sites requiring browser execution
- Helper utilities in `BaseCrawler`: `parseFloat()` for currency strings, `save()` for JSON output

## Data Model

### Apartamento Interface
```typescript
{
  id: string;              // Required: Unique identifier
  valor_aluguel: number;   // Required: Base rent amount
  valor_total: number;     // Required: Total monthly cost
  url_apartamento: string; // Required: Listing URL
  corretora?: string;      // Provider/agency name
  bairro?: string;         // Neighborhood
  tamanho?: number;        // Size in m²
  quartos?: number;        // Bedrooms
  banheiros?: number;      // Bathrooms
  garagem?: number;        // Parking spaces
  observacao?: string;     // User notes (from annotations)
  tag?: Tag;               // User categorization (from annotations)
  nota?: number;           // User rating 1-5 (from annotations)
}
```

## Development Workflow

### Running the App
```bash
npm run dev          # Start Next.js dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Testing Crawlers
1. Run crawler via API: `POST /api/anuncios/fetch` (executes all registered crawlers)
2. Check output: `src/data/<crawlerName>_anuncio.json`
3. View in UI: Refresh the main page to see combined results

### User Annotations System
- User notes, tags, and ratings are stored separately in `src/data/anotacoes.json`
- Structure: `{ [apartamentoId]: { observacao?, tag?, nota? } }`
- Updated via `PUT /api/anuncios` with partial updates
- Merged with listings by `UserAnnotationsRepository.combineAnnotations()`

## Key Conventions

### Naming
- Crawler names: camelCase (e.g., `creditoReal`, not `credito-real`)
- File outputs: `{crawlerName}_anuncio.json`
- Crawler IDs: `{crawlerName}_{providerSpecificId}`

### File Organization
- All scraped data goes to `src/data/`
- Each provider has isolated directory in `src/crawlers/providers/`
- No shared utilities between providers (copy helpers if needed)

### API Patterns
- `GET /api/anuncios`: Fetch listings with filters/pagination
  - `?page=1&limit=10`: Paginated results
  - `?all=true`: All data (for building filter options)
  - `?bairro=X&quartos=3`: Filter parameters
- `POST /api/anuncios/fetch`: Execute all crawlers
- `PUT /api/anuncios`: Update user annotations

### Frontend State Management
- Filters reset pagination to page 1
- Inline edits (observacao, tag, nota) trigger immediate API saves
- Filter options (neighborhoods, bedrooms, etc.) derived from `?all=true` query
- Uses debouncing pattern: User changes trigger API calls, state updates optimistically

## Common Tasks

### Debugging a Crawler
1. Check the crawler's output JSON in `src/data/`
2. Inspect the target website's HTML structure (it may have changed)
3. Test scraping logic in isolation before registering
4. For Puppeteer crawlers: Set `headless: false` temporarily to watch browser actions

### Updating Filters
Filter logic in `UserAnnotationsRepository.applyFilters()` uses:
- String matching (case-insensitive): `bairro`, `corretora`
- Exact match: `quartos`, `banheiros`, `garagem`, `tag`, `nota`
- Minimum value: `tamanho`

### Constants
- `DEFAULT_MIN_SIZE = 60`: Minimum apartment size filter
- `DEFAULT_MAX_VALUE = 4200`: Maximum rent filter
- Both defined in `src/crawlers/core/base-crawler.ts`

## Tech Stack Notes
- **Next.js 15** with Turbopack: Use `npm run dev` (turbopack enabled by default)
- **TypeScript**: Strict mode enabled, use `satisfies` for type safety
- **Material-UI v7**: Component library for UI
- **Cheerio**: jQuery-like HTML parsing
- **Puppeteer**: Headless browser for dynamic sites
- **ESLint + Prettier**: Code quality tools
