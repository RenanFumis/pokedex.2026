import type { Catalog, EvolutionMember, PokemonAbility, PokemonDetail, PokemonSummary } from "./types.ts";
import { displayName, generationLabel, TYPE_ORDER } from "./format.ts";
import { loadPortuguese } from "./portuguese.ts";

const API = "https://pokeapi.co/api/v2";
const CACHE_KEY = "pokedex-catalog-v1";
const MAX_AGE = 1000 * 60 * 60 * 12;

type NamedResource = { name: string; url: string };
type NamedList = { count: number; results: NamedResource[] };

type TypePayload = {
  name: string;
  pokemon: { slot: number; pokemon: NamedResource }[];
};

type GenerationPayload = {
  name: string;
  pokemon_species: NamedResource[];
};

type FlavorEntry = { flavor_text: string; language: { name: string } };
type NamedEntry = { name: string; language: { name: string } };

type SpeciesPayload = {
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: FlavorEntry[];
  capture_rate: number;
  gender_rate: number;
  growth_rate: { name: string };
  habitat: { name: string } | null;
  egg_groups: { name: string }[];
  evolution_chain: { url: string };
};

type PokemonPayload = {
  height: number;
  weight: number;
  base_experience: number | null;
  abilities: { is_hidden: boolean; ability: NamedResource }[];
  stats: { base_stat: number; stat: { name: string } }[];
  types: { slot: number; type: { name: string } }[];
  cries?: { latest?: string | null; legacy?: string | null };
};

type AbilityPayload = {
  names: NamedEntry[];
  flavor_text_entries: FlavorEntry[];
};

type EvoNode = {
  species: NamedResource;
  evolves_to: EvoNode[];
};

const detailCache = new Map<number, Promise<PokemonDetail>>();
const abilityCache = new Map<string, Promise<{ name: string; text: string }>>();
let catalogRequest: Promise<Catalog> | null = null;

export function idFromUrl(url: string): number {
  const parts = url.split("/").filter(Boolean);
  return Number(parts[parts.length - 1]);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível consultar a PokéAPI (${response.status}).`);
  }
  return (await response.json()) as T;
}

function readCache(): Catalog | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; catalog: Catalog };
    if (!parsed.catalog?.entries?.length) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE) return null;
    return parsed.catalog;
  } catch {
    return null;
  }
}

function writeCache(catalog: Catalog) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), catalog }));
  } catch {
    // O catálogo continua em memória se o navegador recusar o cache.
  }
}

function cleanText(value: string): string {
  return value.replace(/[\f\n\r]+/g, " ").replace(/\s+/g, " ").trim();
}

function englishFlavor(entries: FlavorEntry[]): string {
  const match = entries.filter((entry) => entry.language.name === "en").at(-1);
  if (match) return cleanText(match.flavor_text);
  return pickFlavor(entries).text;
}

function pickFlavor(entries: FlavorEntry[]): { text: string; language: string } {
  const preferred = ["en", "es", "es-419", "fr", "de", "it"];
  for (const code of preferred) {
    const match = entries.filter((entry) => entry.language.name === code).at(-1);
    if (match) return { text: cleanText(match.flavor_text), language: code };
  }
  const fallback = entries.at(-1);
  return {
    text: fallback ? cleanText(fallback.flavor_text) : "",
    language: fallback?.language.name ?? "",
  };
}

function flattenEvolution(node: EvoNode): EvolutionMember[] {
  return [
    {
      id: idFromUrl(node.species.url),
      slug: node.species.name,
      name: displayName(node.species.name),
    },
    ...node.evolves_to.flatMap(flattenEvolution),
  ];
}

async function loadAbility(slug: string, url: string): Promise<{ name: string; text: string }> {
  const cached = abilityCache.get(slug);
  if (cached) return cached;
  const pending = fetchJson<AbilityPayload>(url)
    .then((payload) => ({
      name: payload.names.find((entry) => entry.language.name === "en")?.name ?? displayName(slug),
      text: cleanText(
        payload.flavor_text_entries.filter((entry) => entry.language.name === "en").at(-1)?.flavor_text ?? "",
      ),
    }))
    .catch((error: unknown) => {
      abilityCache.delete(slug);
      throw error;
    });
  abilityCache.set(slug, pending);
  return pending;
}

async function fetchCatalog(): Promise<Catalog> {
  const [species, typeList, generationList] = await Promise.all([
    fetchJson<NamedList>(`${API}/pokemon-species?limit=10000`),
    fetchJson<NamedList>(`${API}/type`),
    fetchJson<NamedList>(`${API}/generation`),
  ]);

  if (species.results.length === 0) {
    throw new Error("A PokéAPI não devolveu nenhuma espécie.");
  }

  const byId = new Map<number, PokemonSummary>();
  for (const item of species.results) {
    const id = idFromUrl(item.url);
    byId.set(id, {
      id,
      slug: item.name,
      name: displayName(item.name),
      types: [],
      generation: "",
    });
  }

  const typePayloads = await Promise.allSettled(
    typeList.results
      .filter((type) => type.name !== "unknown" && type.name !== "shadow")
      .map((type) => fetchJson<TypePayload>(type.url)),
  );

  for (const result of typePayloads) {
    if (result.status !== "fulfilled") continue;
    for (const entry of result.value.pokemon) {
      const pokemon = byId.get(idFromUrl(entry.pokemon.url));
      if (!pokemon) continue;
      pokemon.types[entry.slot - 1] = result.value.name;
    }
  }

  const generationPayloads = await Promise.allSettled(
    generationList.results.map((generation) => fetchJson<GenerationPayload>(generation.url)),
  );

  for (const result of generationPayloads) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.pokemon_species) {
      const pokemon = byId.get(idFromUrl(item.url));
      if (pokemon) pokemon.generation = result.value.name;
    }
  }

  const entries = [...byId.values()]
    .map((entry) => ({ ...entry, types: entry.types.filter(Boolean) }))
    .sort((a, b) => a.id - b.id);

  const present = new Set(entries.flatMap((entry) => entry.types));
  const types = [
    ...TYPE_ORDER.filter((type) => present.has(type)),
    ...[...present].filter((type) => !TYPE_ORDER.includes(type)),
  ];

  const seen = new Set<string>();
  const generations = [];
  for (const entry of entries) {
    if (!entry.generation || seen.has(entry.generation)) continue;
    seen.add(entry.generation);
    generations.push({ id: entry.generation, label: generationLabel(entry.generation) });
  }

  const catalog = { entries, types, generations };
  const typed = entries.filter((entry) => entry.types.length > 0).length;
  if (typed > entries.length * 0.5) writeCache(catalog);
  return catalog;
}

export function loadCatalog(force = false): Promise<Catalog> {
  if (!force) {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
  } else {
    catalogRequest = null;
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      // Sem cache para limpar.
    }
  }

  if (!catalogRequest) {
    catalogRequest = fetchCatalog().catch((error: unknown) => {
      catalogRequest = null;
      throw error;
    });
  }
  return catalogRequest;
}

async function fetchDetail(id: number): Promise<PokemonDetail> {
  const [pokemon, species, portuguese] = await Promise.all([
    fetchJson<PokemonPayload>(`${API}/pokemon/${id}`),
    fetchJson<SpeciesPayload>(`${API}/pokemon-species/${id}`),
    loadPortuguese(),
  ]);

  const [abilities, evolution] = await Promise.all([
    Promise.all(
      pokemon.abilities.map(async (ability): Promise<PokemonAbility> => {
        try {
          const info = await loadAbility(ability.ability.name, ability.ability.url);
          const translated = portuguese?.abilities[ability.ability.name];
          return {
            name: translated?.name || info.name,
            nameEn: info.name,
            text: translated?.text || info.text,
            textEn: info.text,
            hidden: ability.is_hidden,
          };
        } catch {
          const fallback = displayName(ability.ability.name);
          return { name: fallback, nameEn: fallback, hidden: ability.is_hidden, text: "", textEn: "" };
        }
      }),
    ),
    fetchJson<{ chain: EvoNode }>(species.evolution_chain.url)
      .then((payload) => flattenEvolution(payload.chain))
      .catch(() => [] as EvolutionMember[]),
  ]);

  const flavorEn = englishFlavor(species.flavor_text_entries);
  const speciesKey = String(id);
  const flavorPt = portuguese?.flavor[speciesKey];
  const genusEn = species.genera.find((entry) => entry.language.name === "en")?.genus || "";
  const genusPt = portuguese?.genus[speciesKey];
  return {
    id,
    genus: genusPt || genusEn,
    genusEn,
    flavor: flavorPt || flavorEn,
    flavorEn,
    height: pokemon.height,
    weight: pokemon.weight,
    baseExperience: pokemon.base_experience,
    captureRate: species.capture_rate,
    growthRate: species.growth_rate.name,
    habitat: species.habitat?.name ?? null,
    eggGroups: species.egg_groups.map((group) => group.name),
    genderRate: species.gender_rate,
    abilities,
    stats: pokemon.stats.map((stat) => ({ key: stat.stat.name, value: stat.base_stat })),
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((type) => type.type.name),
    cry: pokemon.cries?.latest || pokemon.cries?.legacy || null,
    evolution,
  };
}

export function loadDetail(id: number, force = false): Promise<PokemonDetail> {
  if (force) detailCache.delete(id);
  const cached = detailCache.get(id);
  if (cached) return cached;
  const pending = fetchDetail(id).catch((error: unknown) => {
    detailCache.delete(id);
    throw error;
  });
  detailCache.set(id, pending);
  return pending;
}
