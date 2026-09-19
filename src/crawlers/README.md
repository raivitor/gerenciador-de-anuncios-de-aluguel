# Crawlers

Cada provider mantém sua URL de busca, filtros e regras do site. `BaseCrawler.run()` coleta e,
se a coleta terminar sem erro, grava `src/data/<provider>_anuncio.json`. Os IDs têm o formato
`<provider>_<codigo>` e vinculam os anúncios às anotações; preserve-os ao alterar um parser.

## Código reutilizável

Os módulos em `shared/` são independentes das regras de seleção de imóveis:

| Módulo | Uso |
| --- | --- |
| `http.ts` | `createHttpClient()` centraliza User-Agent, Accept e timeout padrão de 30 segundos. Headers e timeout podem ser sobrescritos por cliente ou requisição. |
| `numbers.ts` | `parseBrazilianNumber`, `parsePrice` e `parseArea` interpretam texto; `parseApiNumber` interpreta números e strings numéricas de APIs com ponto decimal. Ausência retorna `undefined`, inclusive área sem número e strings em branco. Preços preservam o sinal e não extraem anos de rótulos sem valor monetário. `roundMoney` arredonda o total a centavos. |
| `listings.ts` | `resolveListingUrl` resolve links relativos e rejeita links vazios/protocolos inválidos. `createListing` valida código/URL e monta ID e corretora. `uniqueBy` deduplica mantendo a primeira posição e os últimos dados. |
| `pagination.ts` | `pageUrl` altera apenas o parâmetro de página. `collectPages` consulta uma página por vez, deduplica pela chave fornecida e rejeita páginas repetidas ou páginas vazias que indicam continuação. `hasNextApiPage` valida a contagem e o tamanho recebido antes de avançar o offset, evitando pular registros de uma resposta incompleta. |
| `search.ts` | `hasEmptySearchMessage` reconhece mensagens explícitas de busca vazia, ignorando scripts, estilos e chamadas como “Não encontrou o imóvel?”. É usado pelos parsers HTML; contagens de APIs continuam sendo validadas separadamente. |
| `card-with-buttons.ts` | Coleta compartilhada de Viver Imóveis e Goretti: cards, paginação e enriquecimento do valor total. Use apenas para sites com esse mesmo formato. |

`PuppeteerCrawler` gerencia abertura e fechamento do navegador. Esperas, rolagem e seletores
continuam no provider. Parsers de HTML usam Cheerio fora do contexto do navegador.

Use `parsePrice` para valores monetários e `parseArea` para áreas, inclusive nos detalhes:
o conversor geral de números brasileiros não interpreta ponto decimal. Tokens numéricos
malformados retornam `undefined`, sem aproveitar apenas parte dos dígitos. Nas APIs, converta
os campos para número antes de escolher alternativas, para que `"0"` e `0` sejam equivalentes.

## Adicionar um provider

1. Crie `providers/<nome>/crawler.ts` e `index.ts`, exportando a instância padrão. Use
   `BaseCrawler` para HTTP ou `PuppeteerCrawler` quando houver renderização dinâmica.
2. Separe a interpretação do HTML/JSON em `parser.ts`. Se houver tradução extensa de filtros
   da URL para uma API, coloque-a em `filters.ts`.
3. Reutilize `createHttpClient`, conversões e `createListing`. Preserve códigos como strings,
   inclusive zeros iniciais e letras. Não transforme um valor desconhecido em zero sem uma
   decisão explícita do provider.
4. Para buscas paginadas, passe ao coletor uma função `(page) => { items, hasNext }` e uma
   função que extrai o código. Calcule página/offset pela página recebida, não pelo número de
   imóveis deduplicados. O parser deve distinguir busca vazia legítima de resposta inválida.
5. Percorra os imóveis com `for...of` e `await` para consultar detalhes um por vez. Defina no
   provider se a falha deve interromper a coleta ou usar um fallback com aviso.
6. Registre a instância em `registry.ts`. Não aplique novos filtros globais: preço, área,
   quartos, vagas e interpretação de encargos pertencem às regras de cada site.

Use Habitacional como exemplo de HTML com detalhes, Remax como exemplo de API e Intelecto
como exemplo de navegador com carregamento progressivo. Emobi combina navegador e HTTP.
Na Emobi, a quantidade final de códigos únicos precisa coincidir com a contagem publicada;
uma contagem ausente ou divergente interrompe a coleta antes da gravação.

## Validação e revisão manual

Não é necessário adicionar testes automatizados. Execute a verificação de tipos
(`./node_modules/.bin/tsc --noEmit --incremental false`) e ESLint nos arquivos alterados.
Faça a coleta manual com a gravação redirecionada para um diretório temporário, preservando
os JSONs existentes. Confira amostras por ID e investigue diferenças em valores e características;
os anúncios disponíveis podem mudar entre coletas.

Após implementar, revise o diff contra o plano, procure bugs e simplificações, corrija os
achados e repita a verificação dos fluxos afetados. Repita a revisão até não restarem achados
pertinentes ao escopo. Registre falhas externas que tenham impedido a validação.
