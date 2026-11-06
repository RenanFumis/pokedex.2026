# Pokédex

## English

A national catalog of all 1,025 species, with search, filters, and a live entry for each Pokémon. The interface is in Portuguese. On the entry, the description, the category, and the abilities can stay in Portuguese or in the original English.

The site is a static application: the browser fetches the data from the [PokéAPI](https://pokeapi.co/), and the Portuguese translation travels with the published files.

### How it was built

The base is **React 19**, **TypeScript**, and **Vite**. There is no dedicated server. Everything the visitor sees comes from a static build, which makes it possible to host the site in a shared-hosting folder.

Development had help from **Cursor** to fix small routes and align the interface. Those adjustments were checked directly in the browser.

| Piece | Role |
| --- | --- |
| React 19 | Interface, entry, and filters |
| TypeScript | Types for the catalog, the entry, and the translation |
| Vite | Local server and static build |
| PokéAPI | Species, stats, abilities, evolution, and cries |
| `public/pt-br.json` | Descriptions, categories, and abilities in Portuguese |

Build paths use `base: "./"` in Vite. CSS and JavaScript files are relative, so the site opens both at the root of a subdomain and inside a subfolder.

### What the site does

- Lists the species from generations I through IX, from Kanto to Paldea.
- Searches by name or number.
- Filters by generation and by type. More than one type at once requires the species to have all of them.
- Sorts by number or by name.
- Stores favorites and the light or dark theme in this browser.
- Loads the grid gradually as the page scrolls down.
- Opens the entry with artwork, the shiny version, cry, height, weight, gender, capture rate, growth, habitat, eggs, stats, abilities, and evolutionary family.
- While scrolling, shows a Poké Ball in the top-left corner with search and a shortcut back to the top.
- Switches the entry text between **PT** and **EN**. The choice is saved.

Species names follow the games. Types, stats, and the other interface labels are in Portuguese.

### Where the text comes from

The PokéAPI does not include the description, category, or ability in pt-BR. The official English is translated once, outside the site, and the result is stored in `public/pt-br.json`.

The `scripts/build-pt.mjs` script downloads the public PokéAPI CSVs, translates the unique strings, and writes that file. A copy of the phrases already translated stays in `scripts/.cache/pt-cache.json`, so a new run does not redo work that is already done. The translation is automatic: some categories and ability names may sound different from the games.

On the entry, **PT** reads that file and **EN** reads the English that the PokéAPI returns at the moment. The catalog itself stays live. The species list is cached in the browser for 12 hours.

### Structure

```text
pokedex/
├── index.html              page and initial theme
├── public/
│   ├── favicon.svg
│   └── pt-br.json          translation published with the site
├── scripts/
│   ├── build-pt.mjs        generates the translation
│   └── .cache/             phrases already translated
├── src/
│   ├── main.tsx
│   ├── App.tsx             grid, filters, and Poké Ball
│   ├── api.ts              PokéAPI and cache
│   ├── portuguese.ts       reading pt-br.json
│   ├── format.ts           labels in Portuguese
│   ├── types.ts
│   ├── styles.css
│   └── components/
│       ├── Artwork.tsx
│       └── DetailPanel.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Run locally

The commands need to be run inside the project folder.

```bash
cd pokedex
npm install
npm run dev
```

Vite starts at `http://localhost:5173/`.

| Command | Effect |
| --- | --- |
| `npm run dev` | Opens the local site and refreshes on save |
| `npm run build` | Creates the `dist` folder, ready to publish |
| `npm run preview` | Serves the contents of `dist` for a final check |
| `node scripts/build-pt.mjs` | Updates `public/pt-br.json` |

### Publish

The server only needs to serve files. Node is not required on the host.

1. Run `npm run build` inside the project folder.
2. Upload the **contents** of `dist` to the site folder. `index.html` sits at the root of that folder, together with `assets/` and `pt-br.json`.
3. Folders at `755` and files at `644` are usually the right permissions.

If the site address moves to another folder, the build with relative paths remains valid. After changing the translation or the interface, generate `dist` again and upload the files once more. An old `dist` does not include changes made after it.

## Português

Catálogo nacional das 1.025 espécies, com busca, filtros e uma ficha ao vivo para cada Pokémon. A interface é em português. Na ficha, a descrição, a categoria e as habilidades podem ficar em português ou no inglês original.

O site é uma aplicação estática: o navegador busca os dados na [PokéAPI](https://pokeapi.co/) e a tradução em português viaja junto com os arquivos publicados.

### Como foi criado

A base é **React 19**, **TypeScript** e **Vite**. Não há servidor próprio. Tudo que o visitante vê sai de um build estático, o que permite hospedar o site em uma pasta de hospedagem compartilhada.

O desenvolvimento contou com o auxílio da **Cursor** para corrigir pequenas rotas e alinhar a interface. Esses ajustes foram conferidos direto no navegador.

| Peça | Função |
| --- | --- |
| React 19 | Interface, ficha e filtros |
| TypeScript | Tipos do catálogo, da ficha e da tradução |
| Vite | Servidor local e build estático |
| PokéAPI | Espécies, atributos, habilidades, evolução e gritos |
| `public/pt-br.json` | Descrições, categorias e habilidades em português |

Os caminhos do build usam `base: "./"` no Vite. Os arquivos de CSS e JavaScript são relativos, então o site abre tanto na raiz de um subdomínio quanto dentro de uma subpasta.

### O que o site faz

- Lista as espécies das gerações I a IX, de Kanto a Paldea.
- Busca por nome ou número.
- Filtra por geração e por tipo. Mais de um tipo ao mesmo tempo exige que a espécie tenha todos eles.
- Ordena por número ou por nome.
- Guarda favoritos e o tema claro ou escuro neste navegador.
- Carrega a grade aos poucos, conforme a página desce.
- Abre a ficha com arte, versão shiny, grito, altura, peso, gênero, captura, crescimento, habitat, ovos, atributos, habilidades e família evolutiva.
- Mostra, ao rolar a página, uma Pokébola no canto superior esquerdo com busca e um atalho para voltar ao início.
- Alterna o texto da ficha entre **PT** e **EN**. A escolha fica salva.

Os nomes das espécies seguem os jogos. Tipos, atributos e os demais rótulos da interface estão em português.

### De onde vêm os textos

A PokéAPI não traz descrição, categoria nem habilidade em pt-BR. O inglês oficial é traduzido uma vez, fora do site, e o resultado fica em `public/pt-br.json`.

O script `scripts/build-pt.mjs` baixa os CSVs públicos da PokéAPI, traduz os textos únicos e grava esse arquivo. Uma cópia das frases já traduzidas fica em `scripts/.cache/pt-cache.json`, então uma nova execução não refaz o que já foi feito. A tradução é automática: algumas categorias e nomes de habilidade podem soar diferentes dos jogos.

Na ficha, **PT** lê esse arquivo e **EN** lê o inglês que a PokéAPI devolve na hora. O catálogo em si continua ao vivo. A lista de espécies fica em cache no navegador por 12 horas.

### Estrutura

```text
pokedex/
├── index.html              página e tema inicial
├── public/
│   ├── favicon.svg
│   └── pt-br.json          tradução publicada com o site
├── scripts/
│   ├── build-pt.mjs        gera a tradução
│   └── .cache/             frases já traduzidas
├── src/
│   ├── main.tsx
│   ├── App.tsx             grade, filtros e Pokébola
│   ├── api.ts              PokéAPI e cache
│   ├── portuguese.ts       leitura do pt-br.json
│   ├── format.ts           rótulos em português
│   ├── types.ts
│   ├── styles.css
│   └── components/
│       ├── Artwork.tsx
│       └── DetailPanel.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Rodar no computador

Os comandos precisam ser executados dentro da pasta do projeto.

```bash
cd pokedex
npm install
npm run dev
```

O Vite sobe em `http://localhost:5173/`.

| Comando | Efeito |
| --- | --- |
| `npm run dev` | Abre o site local com atualização ao salvar |
| `npm run build` | Gera a pasta `dist`, pronta para publicar |
| `npm run preview` | Serve o conteúdo de `dist` para uma última conferência |
| `node scripts/build-pt.mjs` | Atualiza `public/pt-br.json` |

### Publicar

O servidor só precisa entregar arquivos. Não é necessário Node na hospedagem.

1. Rode `npm run build` dentro da pasta do projeto.
2. Envie o **conteúdo** de `dist` para a pasta do site. O `index.html` fica na raiz dessa pasta, junto com `assets/` e `pt-br.json`.
3. Pastas em `755` e arquivos em `644` costumam ser as permissões certas.

Se o endereço do site mudar de pasta, o build com caminhos relativos continua válido. Depois de alterar a tradução ou a interface, gere o `dist` de novo e envie os arquivos outra vez. Um `dist` antigo não inclui as mudanças feitas depois dele.
