const SPECIAL_NAMES: Record<string, string> = {
  "nidoran-f": "Nidoran♀",
  "nidoran-m": "Nidoran♂",
  "mr-mime": "Mr. Mime",
  "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime",
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  "type-null": "Type: Null",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  flabebe: "Flabébé",
  "porygon-z": "Porygon-Z",
};

const GENERATIONS: Record<string, { roman: string; region: string }> = {
  "generation-i": { roman: "I", region: "Kanto" },
  "generation-ii": { roman: "II", region: "Johto" },
  "generation-iii": { roman: "III", region: "Hoenn" },
  "generation-iv": { roman: "IV", region: "Sinnoh" },
  "generation-v": { roman: "V", region: "Unova" },
  "generation-vi": { roman: "VI", region: "Kalos" },
  "generation-vii": { roman: "VII", region: "Alola" },
  "generation-viii": { roman: "VIII", region: "Galar" },
  "generation-ix": { roman: "IX", region: "Paldea" },
};

const TYPE_LABEL: Record<string, string> = {
  normal: "Normal",
  fighting: "Lutador",
  flying: "Voador",
  poison: "Venenoso",
  ground: "Terra",
  rock: "Pedra",
  bug: "Inseto",
  ghost: "Fantasma",
  steel: "Aço",
  fire: "Fogo",
  water: "Água",
  grass: "Planta",
  electric: "Elétrico",
  psychic: "Psíquico",
  ice: "Gelo",
  dragon: "Dragão",
  dark: "Sombrio",
  fairy: "Fada",
  stellar: "Estelar",
};

const TYPE_COLOR: Record<string, string> = {
  normal: "#A8A77A",
  fighting: "#C22E28",
  flying: "#A98FF3",
  poison: "#A33EA1",
  ground: "#D3B144",
  rock: "#B6A136",
  bug: "#A6B91A",
  ghost: "#735797",
  steel: "#B7B7CE",
  fire: "#EE8130",
  water: "#6390F0",
  grass: "#7AC74C",
  electric: "#F2C20B",
  psychic: "#F95587",
  ice: "#96D9D6",
  dragon: "#6F35FC",
  dark: "#705746",
  fairy: "#D685AD",
  stellar: "#40B5A5",
};

const DARK_TEXT = new Set(["electric", "ice", "ground", "steel", "fairy"]);

const STAT_LABEL: Record<string, string> = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defesa",
  "special-attack": "Atq. Esp.",
  "special-defense": "Def. Esp.",
  speed: "Velocidade",
};

const GROWTH: Record<string, string> = {
  slow: "Lento",
  medium: "Médio",
  fast: "Rápido",
  "medium-slow": "Médio-lento",
  "slow-then-very-fast": "Lento, depois muito rápido",
  "fast-then-very-slow": "Rápido, depois muito lento",
};

const EGGS: Record<string, string> = {
  monster: "Monstro",
  water1: "Água 1",
  water2: "Água 2",
  water3: "Água 3",
  bug: "Inseto",
  flying: "Voador",
  ground: "Campo",
  fairy: "Fada",
  plant: "Planta",
  humanshape: "Humanoide",
  "human-like": "Humanoide",
  mineral: "Mineral",
  amorphous: "Amorfo",
  ditto: "Ditto",
  dragon: "Dragão",
  undiscovered: "Desconhecido",
};

const HABITATS: Record<string, string> = {
  cave: "Caverna",
  forest: "Floresta",
  grassland: "Campo",
  mountain: "Montanha",
  rare: "Raro",
  "rough-terrain": "Terreno acidentado",
  sea: "Mar",
  urban: "Urbano",
  "waters-edge": "Beira d'água",
};

export const TYPE_ORDER = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
  "stellar",
];

export function displayName(slug: string): string {
  const special = SPECIAL_NAMES[slug];
  if (special) return special;
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function padNumber(id: number): string {
  return String(id).padStart(4, "0");
}

export function generationLabel(id: string): string {
  const known = GENERATIONS[id];
  if (!known) {
    const suffix = id.replace("generation-", "").toUpperCase();
    return suffix || "Outra";
  }
  return `${known.roman} · ${known.region}`;
}

export function regionName(id: string): string {
  return GENERATIONS[id]?.region ?? (id ? id.replace("generation-", "").toUpperCase() : "—");
}

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? displayName(type);
}

export function typeColor(type: string): string {
  return TYPE_COLOR[type] ?? "#8d8478";
}

export function typeInk(type: string): string {
  return DARK_TEXT.has(type) ? "#2a241c" : "#fffdf8";
}

export function statLabel(key: string): string {
  return STAT_LABEL[key] ?? displayName(key);
}

export function growthLabel(name: string): string {
  return GROWTH[name] ?? displayName(name);
}

export function eggLabel(name: string): string {
  return EGGS[name] ?? displayName(name);
}

export function habitatLabel(name: string): string {
  return HABITATS[name] ?? displayName(name);
}

export function formatMeters(decimeters: number): string {
  return `${(decimeters / 10).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} m`;
}

export function formatKilograms(hectograms: number): string {
  return `${(hectograms / 10).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
}

export function genderLabel(rate: number): string {
  if (rate < 0) return "Sem gênero";
  const female = (rate / 8) * 100;
  const male = 100 - female;
  const format = (value: number) =>
    `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return `${format(male)} macho · ${format(female)} fêmea`;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[''.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
