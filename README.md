# Pokédex

Catálogo nacional das 1.025 espécies, com busca, filtros e uma ficha ao vivo para cada Pokémon. A interface é em português. Na ficha, a descrição, a categoria e as habilidades podem ficar em português ou no inglês original.

O site é uma aplicação estática: o navegador busca os dados na [PokéAPI](https://pokeapi.co/) e a tradução em português viaja junto com os arquivos publicados.

## Como foi criado

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

## O que o site faz

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

## De onde vêm os textos

A PokéAPI não traz descrição, categoria nem habilidade em pt-BR. O inglês oficial é traduzido uma vez, fora do site, e o resultado fica em `public/pt-br.json`.

O script `scripts/build-pt.mjs` baixa os CSVs públicos da PokéAPI, traduz os textos únicos e grava esse arquivo. Uma cópia das frases já traduzidas fica em `scripts/.cache/pt-cache.json`, então uma nova execução não refaz o que já foi feito. A tradução é automática: algumas categorias e nomes de habilidade podem soar diferentes dos jogos.

Na ficha, **PT** lê esse arquivo e **EN** lê o inglês que a PokéAPI devolve na hora. O catálogo em si continua ao vivo. A lista de espécies fica em cache no navegador por 12 horas.

## Estrutura

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

## Rodar no computador

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

## Publicar

O servidor só precisa entregar arquivos. Não é necessário Node na hospedagem.

1. Rode `npm run build` dentro da pasta do projeto.
2. Envie o **conteúdo** de `dist` para a pasta do site. O `index.html` fica na raiz dessa pasta, junto com `assets/` e `pt-br.json`.
3. Pastas em `755` e arquivos em `644` costumam ser as permissões certas.

Se o endereço do site mudar de pasta, o build com caminhos relativos continua válido. Depois de alterar a tradução ou a interface, gere o `dist` de novo e envie os arquivos outra vez. Um `dist` antigo não inclui as mudanças feitas depois dele.
