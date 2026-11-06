import { useEffect, useState } from "react";

type ArtworkProps = {
  id: number;
  name: string;
  shiny?: boolean;
  priority?: boolean;
};

function sourcesFor(id: number, shiny: boolean): string[] {
  if (shiny) {
    return [
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/shiny/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`,
    ];
  }
  return [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  ];
}

export function Artwork({ id, name, shiny = false, priority = false }: ArtworkProps) {
  const [index, setIndex] = useState(0);
  const sources = sourcesFor(id, shiny);

  useEffect(() => {
    setIndex(0);
  }, [id, shiny]);

  if (index >= sources.length) {
    return <span className="art-fallback">{name.slice(0, 1)}</span>;
  }

  return (
    <img
      className="sprite"
      src={sources[index]}
      alt={shiny ? `${name} shiny` : name}
      width={160}
      height={160}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setIndex((current) => current + 1)}
    />
  );
}

export function Heart({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
