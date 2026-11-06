import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE_PATH = path.join(ROOT, "scripts", ".cache", "pt-cache.json");
const OUTPUT_PATH = path.join(ROOT, "public", "pt-br.json");

const SOURCES = {
  speciesNames: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv",
  flavor: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_flavor_text.csv",
  abilityNames: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/ability_names.csv",
  abilityFlavor: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/ability_flavor_text.csv",
  abilities: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/abilities.csv",
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function clean(value) {
  return value.replace(/POKéMON/g, "Pokémon").replace(/POKEMON/g, "Pokémon").replace(/\s+/g, " ").trim();
}

function polish(value) {
  const types = [
    ["Grass", "Planta"],
    ["Fire", "Fogo"],
    ["Water", "Água"],
    ["Electric", "Elétrico"],
    ["Psychic", "Psíquico"],
    ["Ice", "Gelo"],
    ["Dragon", "Dragão"],
    ["Dark", "Sombrio"],
    ["Fairy", "Fada"],
    ["Fighting", "Lutador"],
    ["Poison", "Venenoso"],
    ["Ground", "Terra"],
    ["Flying", "Voador"],
    ["Bug", "Inseto"],
    ["Rock", "Pedra"],
    ["Ghost", "Fantasma"],
    ["Steel", "Aço"],
    ["Normal", "Normal"],
  ];
  let text = value
    .replace(/\bPokemon\b/g, "Pokémon")
    .replace(/\bHP\b/g, "PS")
    .replace(/tipo [Gg]rama/g, "tipo Planta")
    .replace(/do tipo [Gg]rama/g, "do tipo Planta");
  for (const [english, portuguese] of types) {
    text = text.replace(new RegExp(`tipo ${english}`, "gi"), `tipo ${portuguese}`);
  }
  return text.replace(/\s+/g, " ").trim();
}

function polishGenus(value) {
  const text = polish(value);
  return text.replace(/^Pokémon\s+(\p{Ll})/u, (match, letter) => match.replace(letter, letter.toUpperCase()));
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${url} (${response.status})`);
  return response.text();
}

function latestBy(rows, idIndex, versionIndex, languageIndex, textIndex) {
  const chosen = new Map();
  for (const row of rows) {
    if (row[languageIndex] !== "9") continue;
    const id = row[idIndex];
    const version = Number(row[versionIndex]);
    const text = clean(row[textIndex] ?? "");
    if (!id || !text) continue;
    const current = chosen.get(id);
    if (!current || version >= current.version) chosen.set(id, { version, text });
  }
  return chosen;
}

async function loadCache() {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function translateBatch(texts) {
  const body = new URLSearchParams();
  for (const text of texts) body.append("q", text);
  const response = await fetch("https://translate.googleapis.com/translate_a/t?client=gtx&sl=en&tl=pt", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Tradução recusada (${response.status})`);
  const data = await response.json();
  if (texts.length === 1) return [typeof data === "string" ? data : String(data[0] ?? data)];
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error("A tradução voltou fora de ordem.");
  }
  return data.map((item) => (typeof item === "string" ? item : String(item)));
}

async function translateAll(texts, cache) {
  const missing = [...new Set(texts.filter((text) => text && !cache[text]))];
  const batches = [];
  let current = [];
  let size = 0;
  for (const text of missing) {
    if (current.length > 0 && (current.length >= 30 || size + text.length > 4000)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(text);
    size += text.length;
  }
  if (current.length > 0) batches.push(current);

  console.log(`${missing.length} textos novos em ${batches.length} lotes.`);
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    let translated = null;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        translated = await translateBatch(batch);
        break;
      } catch (error) {
        console.log(`Lote ${index + 1} tentativa ${attempt}: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
    if (!translated) {
      for (const text of batch) {
        translated = translated ?? [];
        let single = null;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            single = (await translateBatch([text]))[0];
            break;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          }
        }
        translated.push(single || text);
      }
    }
    batch.forEach((text, textIndex) => {
      cache[text] = translated[textIndex] || text;
    });
    await mkdir(path.dirname(CACHE_PATH), { recursive: true });
    await writeFile(CACHE_PATH, JSON.stringify(cache));
    console.log(`Lote ${index + 1}/${batches.length}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return cache;
}

const [speciesNamesCsv, flavorCsv, abilityNamesCsv, abilityFlavorCsv, abilitiesCsv] = await Promise.all([
  download(SOURCES.speciesNames),
  download(SOURCES.flavor),
  download(SOURCES.abilityNames),
  download(SOURCES.abilityFlavor),
  download(SOURCES.abilities),
]);

const speciesRows = parseCsv(speciesNamesCsv).slice(1);
const genusById = new Map();
for (const row of speciesRows) {
  if (row[1] !== "9") continue;
  const genus = clean(row[3] ?? "");
  if (row[0] && genus) genusById.set(row[0], genus);
}

const flavorById = latestBy(parseCsv(flavorCsv).slice(1), 0, 1, 2, 3);
const abilityIdToSlug = new Map(parseCsv(abilitiesCsv).slice(1).map((row) => [row[0], row[1]]));
const abilityNameById = new Map();
for (const row of parseCsv(abilityNamesCsv).slice(1)) {
  if (row[1] === "9" && row[0] && row[2]) abilityNameById.set(row[0], clean(row[2]));
}
const abilityTextById = latestBy(parseCsv(abilityFlavorCsv).slice(1), 0, 1, 2, 3);

const cache = await loadCache();
const needed = [
  ...genusById.values(),
  ...[...flavorById.values()].map((entry) => entry.text),
  ...abilityNameById.values(),
  ...[...abilityTextById.values()].map((entry) => entry.text),
];
await translateAll(needed, cache);

const bundle = { genus: {}, flavor: {}, abilities: {} };
for (const [id, genus] of genusById) bundle.genus[id] = polishGenus(cache[genus] || genus);
for (const [id, entry] of flavorById) bundle.flavor[id] = polish(cache[entry.text] || entry.text);
for (const [id, slug] of abilityIdToSlug) {
  if (!slug) continue;
  const name = abilityNameById.get(id);
  const text = abilityTextById.get(id)?.text;
  if (!name && !text) continue;
  bundle.abilities[slug] = {
    name: polish(cache[name] || name || slug),
    text: text ? polish(cache[text] || text) : "",
  };
}

await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, JSON.stringify(bundle));
console.log(
  `Pronto: ${Object.keys(bundle.flavor).length} descrições, ${Object.keys(bundle.genus).length} categorias, ${Object.keys(bundle.abilities).length} habilidades.`,
);
console.log("Bulbasaur:", bundle.genus["1"], "—", bundle.flavor["1"]);
console.log("Pikachu:", bundle.genus["25"], "—", bundle.flavor["25"]);
console.log("Habilidade static:", JSON.stringify(bundle.abilities.static));
