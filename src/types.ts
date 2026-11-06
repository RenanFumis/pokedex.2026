export type PokemonSummary = {
  id: number;
  slug: string;
  name: string;
  types: string[];
  generation: string;
};

export type PokemonStat = {
  key: string;
  value: number;
};

export type PokemonAbility = {
  name: string;
  nameEn: string;
  hidden: boolean;
  text: string;
  textEn: string;
};

export type EvolutionMember = {
  id: number;
  slug: string;
  name: string;
};

export type PokemonDetail = {
  id: number;
  genus: string;
  genusEn: string;
  flavor: string;
  flavorEn: string;
  height: number;
  weight: number;
  baseExperience: number | null;
  captureRate: number;
  growthRate: string;
  habitat: string | null;
  eggGroups: string[];
  genderRate: number;
  abilities: PokemonAbility[];
  stats: PokemonStat[];
  types: string[];
  cry: string | null;
  evolution: EvolutionMember[];
};

export type GenerationOption = {
  id: string;
  label: string;
};

export type Catalog = {
  entries: PokemonSummary[];
  types: string[];
  generations: GenerationOption[];
};
