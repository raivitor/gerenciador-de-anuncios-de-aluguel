# Validação da Intelecto

Requer Node.js >= 22.15 e o navegador do Puppeteer já instalado. Sem dependências adicionais.

```sh
node --import ./tests/intelecto/register-typescript.mjs --test tests/intelecto/intelecto.test.mjs
```

Os HTMLs são recortes dos cards e detalhes públicos inspecionados em 17/09/2026, sem imagens ou
formulários de contato. O teste com navegador usa um servidor local para reproduzir o carregamento
dos cards por rolagem e dos detalhes em blocos. Os demais testes não acessam a rede.

Para coletar somente a Intelecto (atualiza `src/data/intelecto_anuncio.json`):

```sh
node --import ./tests/intelecto/register-typescript.mjs --input-type=module -e \
  "import crawler from './src/crawlers/providers/intelecto/crawler.ts'; console.log(await crawler.run());"
```

A busca padrão reproduz os filtros do plano: apartamentos para aluguel, 2 ou 3 quartos, 1 ou 2 vagas
e nenhuma restrição adicional de localidade. O plano não contém a URL original. É possível passá-la
ao construtor `new IntelectoCrawler(url)`; a paginação altera apenas `pagina`, preservando os demais
parâmetros.
