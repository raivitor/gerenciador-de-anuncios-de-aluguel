 ### Imobiliárias já presentes no projeto (para referência)

  │ Já implementadas: Abreu, Emobi, Goretti, Habitacional, Ibeda, Imóveis Potiguares, Intelecto, Karlla Brandão, RE/MAX e Viver Imóveis.
  ──────
  ### 1. Imobiliárias com Maior Sinergia Técnica (Plataforma Kenlo)
  Estas imobiliárias utilizam a plataforma Kenlo. Algumas usam a mesma estrutura HTML de crawler.ts e crawler.ts, permitindo reaproveitamento quase direto de card-with-buttons.ts.

   Imobiliária                          | Site / Busca de Aluguel        | Foco Principal / Bairros                   | Viabilidade Técnica
  --------------------------------------|--------------------------------|--------------------------------------------|---------------------------------------------------------------------------------------
   Heloísa Correia Imóveis (CRECI 2801) | heloisacorreiaimoveis.com.br[1 | Tirol, Petrópolis, Ponta Negra, Lagoa Nova | Muito Alta: Utiliza exatamente a mesma estrutura moderna do Kenlo (a.card-with-
                                        | ]                              |                                            | buttons) já mapeada no projeto.
   Imobiliária Reis Magos (CRECI 037-J) | imobiliariareismagos.com.br[2] | Tirol, Lagoa Nova, Barro Vermelho, Capim   | Alta: Uma das mais tradicionais de Natal (desde 1977), focada em administração de
                                        |                                | Macio                                      | aluguéis. Usa tema clássico Kenlo (div.card.card-listing).
   Bezerra Imóveis (CRECI 2700-J)       | bezerraimoveis.com.br[3]       | Lagoa Nova, Capim Macio, Candelária        | Alta: Também usa Kenlo clássico (div.card.card-listing), com SSR sem barreiras.
  [1]: heloisacorreiaimoveis.com.br https://www.heloisacorreiaimoveis.com.br/imoveis/para-alugar/apartamento/natal
  [2]: imobiliariareismagos.com.br https://www.imobiliariareismagos.com.br/imoveis/para-alugar/apartamento/natal
  [3]: bezerraimoveis.com.br https://www.bezerraimoveis.com.br/imoveis/para-alugar/apartamento/natal
  ──────
  ### 2. Destaque por Volume de Imóveis (Plataforma Própria / Tradicional)

   Imobiliária                          | Site / Busca de Aluguel         | Foco Principal / Bairros                                | Viabilidade Técnica
  --------------------------------------|---------------------------------|---------------------------------------------------------|-------------------------------------------------------------------------
   Caio Fernandes Negócios Imobiliários | caiofernandes.com.br/locacao[1] | Ponta Negra, Lagoa Nova, Tirol, Capim Macio, Petrópolis | Média: Uma das maiores e mais conhecidas de Natal. Catálogo amplo de
                                        |                                 |                                                         | aluguel residencial. Renderiza páginas diretamente em PHP/HTML
                                        |                                 |                                                         | (Dimensão Web), fácil de consumir via HTTP + Cheerio sem precisar de
                                        |                                 |                                                         | Puppeteer.

  [1]: caiofernandes.com.br/locacao https://www.caiofernandes.com.br/locacao?finalidade=1&tipo=1&cidade=1
  ──────
  ### 3. Imobiliárias em Plataforma Compartilhada (Vista Software / CRM Vista)

  Várias imobiliárias locais usam o CMS da Vista Software. Se um crawler/parser genérico para Vista for criado, ele poderá atender a todo esse grupo.

   Imobiliária                    | Site / Busca de Aluguel           | Foco Principal / Bairros                 | Viabilidade Técnica
  --------------------------------|-----------------------------------|------------------------------------------|--------------------------------------------------------------------------------------------
   Aliança Imobiliária            | aliancaimobiliaria.com.br[1]      | Natal e Grande Natal (Parnamirim)        | Média/Alta: Permite paginação com até 100 resultados por página via query param (qtd=100).
   JL Imóveis RN (CRECI 3341-J)   | jlimoveisrn.com.br[2]             | Lagoa Nova, Nova Parnamirim, Capim Macio | Média: Estrutura padrão de filtros via query string (finalidade=locacao&tipo=apartamento).
   Morais Bacurau Imóveis         | moraisbacurau.com.br[3]           | Tirol, Petrópolis, Lagoa Nova            | Média: Foco em aluguel e administração predial.
   KM Imóveis                     | kmimoveis.com.br[4]               | Natal e Mossoró                          | Média: Bom volume de apartamentos residenciais.
   Imobiliária Martta Pessoa      | imobiliariamarttapessoa.com.br[5] | Tirol, Barro Vermelho, Centro            | Média: Aluguéis residenciais e comerciais em áreas centrais de Natal.
   Gondim Imóveis (CRECI 2123-J)  | gondimimoveis.com.br[6]           | Zona Sul / Pitimbu / Planalto            | Média: Foco em locação residencial na Zona Sul.

  [1]: aliancaimobiliaria.com.br https://www.aliancaimobiliaria.com.br/busca.php?finalidade=aluguel&categoria=residencial&pagina=1&qtd=100
  [2]: jlimoveisrn.com.br https://www.jlimoveisrn.com.br/imovel/?finalidade=locacao&tipo=apartamento
  [3]: moraisbacurau.com.br https://www.moraisbacurau.com.br/imovel/?finalidade=locacao&tipo=apartamento
  [4]: kmimoveis.com.br https://www.kmimoveis.com.br/alugar/apartamento/natal/
  [5]: imobiliariamarttapessoa.com.br https://www.imobiliariamarttapessoa.com.br/
  [6]: gondimimoveis.com.br https://www.gondimimoveis.com.br/
  ──────
  ### 4. Imobiliárias Especializadas e Alto Padrão

   Imobiliária                                  | Site                                        | Foco Principal                              | Observações
  ----------------------------------------------|---------------------------------------------|---------------------------------------------|-----------------------------------------------------------------
   Penates Inteligência Imobiliária             | penates.com.br[1]                           | Tirol, Petrópolis e Ponta Negra             | Foco em perfis residenciais selecionados e bairros nobres.
   Aziz Imóveis Únicos                          | eusouaziz.com.br[2]                         | Ponta Negra, Tirol, Areia Preta             | Especializada em imóveis de alto padrão e condomínios fechados.
   Seletos Imóveis (CRECI 7600-J)               | seletosimoveis.com[3]                       | Capim Macio, Ponta Negra                    | Portfólio focado na Zona Sul de Natal.
   Ferraz Imóveis (CRECI 2932-PJ)               | ferrazimoveis.com[4]                        | Natal e Parnamirim                          | Locação e venda residencial.
   KL Imóveis (CRECI 6980-J)                    | klimoveis.com[5]                            | Natal em geral                              | Imobiliária local com catálogo ativo de locação.

  [1]: penates.com.br https://penates.com.br/
  [2]: eusouaziz.com.br https://www.eusouaziz.com.br/
  [3]: seletosimoveis.com https://seletosimoveis.com/
  [4]: ferrazimoveis.com https://ferrazimoveis.com/
  [5]: klimoveis.com https://klimoveis.com/
  ──────
  ### Recomendações para análise:

  1. Pelo menor esforço de implementação: Heloísa Correia, pois é Kenlo com o mesmo layout de cards já implementado no projeto (a.card-with-buttons).
  2. Pela relevância e volume no mercado de Natal: Caio Fernandes (marca de grande peso em Natal, volume expressivo de locações) e Reis Magos (tradicional em administração de aluguéis em bairros
  centrais/nobres).
  3. Pela escalabilidade de plataforma: As imobiliárias do grupo Vista Software (Aliança, JL Imóveis, Morais Bacurau), caso decida criar um scraper modular para esse CMS assim como existe para Kenlo.
