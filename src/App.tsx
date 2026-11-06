import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { loadCatalog } from "./api.ts";
import { loadPortuguese } from "./portuguese.ts";
import { Artwork, Heart } from "./components/Artwork.tsx";
import { DetailPanel } from "./components/DetailPanel.tsx";
import {
  normalizeText,
  padNumber,
  regionName,
  typeColor,
  typeInk,
  typeLabel,
} from "./format.ts";
import type { Catalog, EvolutionMember, PokemonSummary } from "./types.ts";

const THEME_KEY = "pokedex-theme";
const FAV_KEY = "pokedex-favorites";
const PAGE_SIZE = 48;

type Theme = "light" | "dark";
type SortMode = "id" | "name";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Segue a preferência do sistema.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "number") : [];
  } catch {
    return [];
  }
}

export function App() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [favorites, setFavorites] = useState<number[]>(readFavorites);
  const [query, setQuery] = useState("");
  const [generation, setGeneration] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortMode>("id");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<PokemonSummary | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [scrolled, setScrolled] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const skipScroll = useRef(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // O tema continua aplicado nesta visita.
    }
  }, [theme]);

  useEffect(() => {
    void loadPortuguese();
    let active = true;
    loadCatalog().then(
      (next) => {
        if (!active) return;
        setCatalog(next);
        setStatus("ready");
      },
      (reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar a Pokédex.");
        setStatus("error");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const compact = query.trim().replace(/^#/, "");
    const numeric = /^\d+$/.test(compact);
    const needle = normalizeText(compact);
    const favoriteSet = new Set(favorites);

    const list = catalog.entries.filter((mon) => {
      if (generation !== "all" && mon.generation !== generation) return false;
      if (selectedTypes.length > 0 && !selectedTypes.every((type) => mon.types.includes(type))) return false;
      if (favoritesOnly && !favoriteSet.has(mon.id)) return false;
      if (!compact) return true;
      if (numeric) return String(mon.id).includes(compact);
      return normalizeText(mon.name).includes(needle) || normalizeText(mon.slug).includes(needle);
    });

    return list.sort((a, b) => {
      if (numeric) {
        const rankA = a.id === Number(compact) ? 0 : 1;
        const rankB = b.id === Number(compact) ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
      }
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      return a.id - b.id;
    });
  }, [catalog, favorites, favoritesOnly, generation, query, selectedTypes, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, generation, selectedTypes, sort, favoritesOnly]);

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [generation, selectedTypes, sort, favoritesOnly]);

  useEffect(() => {
    function onScroll() {
      const next = window.scrollY > 220;
      setScrolled((current) => (current === next ? current : next));
      if (!next) setQuickOpen(false);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!quickOpen) return;
    quickSearchRef.current?.focus();
    function onPointer(event: PointerEvent) {
      if (!quickRef.current?.contains(event.target as Node)) setQuickOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [quickOpen]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible((current) => current + PAGE_SIZE);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length, status]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    document.title = selected ? `${selected.name} · Pokédex` : "Pokédex";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selected]);

  const selectedIndex = selected ? filtered.findIndex((mon) => mon.id === selected.id) : -1;
  const previous = selectedIndex > 0 ? filtered[selectedIndex - 1] ?? null : null;
  const next = selectedIndex >= 0 ? filtered[selectedIndex + 1] ?? null : null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelected(null);
        setQuickOpen(false);
      }
      if (!selected) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "ArrowRight" && next) {
        event.preventDefault();
        setSelected(next);
      }
      if (event.key === "ArrowLeft" && previous) {
        event.preventDefault();
        setSelected(previous);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous, selected]);

  function toggleFavorite(id: number) {
    setFavorites((current) => {
      const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(updated));
      } catch {
        // Favoritos ficam só nesta sessão.
      }
      return updated;
    });
  }

  function toggleType(type: string) {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function clearFilters() {
    setQuery("");
    setGeneration("all");
    setSelectedTypes([]);
    setFavoritesOnly(false);
  }

  async function refresh() {
    setRefreshing(true);
    setBanner("");
    try {
      const nextCatalog = await loadCatalog(true);
      setCatalog(nextCatalog);
      setStatus("ready");
    } catch (reason) {
      setBanner(reason instanceof Error ? reason.message : "Não consegui atualizar agora.");
    } finally {
      setRefreshing(false);
    }
  }

  function openEvolution(member: EvolutionMember) {
    const found = catalog?.entries.find((entry) => entry.id === member.id);
    setSelected(
      found ?? {
        id: member.id,
        slug: member.slug,
        name: member.name,
        types: [],
        generation: "",
      },
    );
  }

  const filtersActive = query !== "" || generation !== "all" || selectedTypes.length > 0 || favoritesOnly;
  const shown = filtered.slice(0, visible);

  return (
    <div className="shell">
      <header className="header">
        <div className="brand">
          <span className="ball" aria-hidden="true" />
          <div>
            <p className="eyebrow">Catálogo nacional</p>
            <h1>Pokédex</h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="count">
            {catalog ? `${catalog.entries.length.toLocaleString("pt-BR")} espécies` : "Carregando"}
          </span>
          <button type="button" className="ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
          <button type="button" className="ghost" onClick={() => void refresh()} disabled={refreshing || status === "loading"}>
            {refreshing ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      {banner && <p className="banner">{banner}</p>}

      {status === "loading" && !catalog && (
        <>
          <p className="detail-status">Consultando a PokéAPI. A primeira abertura leva alguns segundos.</p>
          <div className="grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="skeleton" />
            ))}
          </div>
        </>
      )}

      {status === "error" && !catalog && (
        <div className="notice">
          <h2>A Pokédex não abriu</h2>
          <p>{error}</p>
          <button type="button" className="solid" onClick={() => void refresh()}>
            Tentar de novo
          </button>
        </div>
      )}

      {catalog && (
        <>
          <section className="controls">
            <form role="search" onSubmit={(event) => event.preventDefault()}>
              <label className="search">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por nome ou número"
                  aria-label="Buscar Pokémon"
                  autoComplete="off"
                />
              </label>
            </form>

            <div className="toolbar">
              <div className="gens">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={generation === "all"}
                  onClick={() => setGeneration("all")}
                >
                  Todas
                </button>
                {catalog.generations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chip"
                    aria-pressed={generation === item.id}
                    onClick={() => setGeneration(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label className="sort">
                Ordenar
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  aria-label="Ordenar"
                >
                  <option value="id">Número</option>
                  <option value="name">Nome</option>
                </select>
              </label>
              <button
                type="button"
                className="ghost"
                aria-pressed={favoritesOnly}
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                Favoritos ({favorites.length})
              </button>
              {filtersActive && (
                <button type="button" className="ghost" onClick={clearFilters}>
                  Limpar
                </button>
              )}
            </div>

            <div className="types">
              {catalog.types.map((type) => {
                const pressed = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className="chip type"
                    aria-pressed={pressed}
                    style={{ "--type": typeColor(type), "--on-type": typeInk(type) } as CSSProperties}
                    onClick={() => toggleType(type)}
                  >
                    <span className="dot" style={{ background: typeColor(type) }} />
                    {typeLabel(type)}
                  </button>
                );
              })}
            </div>
            {selectedTypes.length > 1 && (
              <p className="hint">Mostrando espécies que têm todos os tipos marcados.</p>
            )}
          </section>

          <p className="results">
            {filtered.length.toLocaleString("pt-BR")} de {catalog.entries.length.toLocaleString("pt-BR")} espécies
          </p>

          {filtered.length === 0 ? (
            <div className="notice">
              <h2>{favoritesOnly ? "Nenhum favorito por aqui" : "Nenhum Pokémon encontrado"}</h2>
              <p>Ajuste a busca ou limpe os filtros para ver o catálogo de novo.</p>
              <button type="button" className="solid" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid">
              {shown.map((mon) => (
                <DexCard
                  key={mon.id}
                  mon={mon}
                  favorite={favorites.includes(mon.id)}
                  onOpen={setSelected}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
          {visible < filtered.length && <div ref={sentinelRef} className="sentinel" />}
        </>
      )}

      <footer className="footer">
        <p>
          Dados ao vivo da PokéAPI. Os nomes seguem os jogos. Descrições, categorias e habilidades estão em português,
          numa tradução automática.
        </p>
      </footer>

      {scrolled && !selected && (
        <div className={`quick${quickOpen ? " open" : ""}`} ref={quickRef}>
          <button
            type="button"
            className="quick-ball"
            aria-expanded={quickOpen}
            aria-controls="atalhos-pokedex"
            aria-label={quickOpen ? "Fechar busca" : "Abrir busca e voltar ao início"}
            onClick={() => setQuickOpen((value) => !value)}
          >
            <span className="ball ball-float" />
          </button>
          {quickOpen && (
            <div className="quick-panel" id="atalhos-pokedex">
              <form
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQuickOpen(false);
                }}
              >
                <label className="search">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={quickSearchRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nome ou número"
                    aria-label="Buscar Pokémon"
                    autoComplete="off"
                  />
                </label>
              </form>
              <button
                type="button"
                className="solid quick-top"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setQuickOpen(false);
                }}
              >
                Voltar ao início
              </button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <DetailPanel
          key={selected.id}
          pokemon={selected}
          favorite={favorites.includes(selected.id)}
          onClose={() => setSelected(null)}
          onToggleFavorite={() => toggleFavorite(selected.id)}
          onPrev={previous ? () => setSelected(previous) : null}
          onNext={next ? () => setSelected(next) : null}
          onPick={openEvolution}
          onExploreType={(type) => {
            setQuery("");
            setGeneration("all");
            setFavoritesOnly(false);
            setSelectedTypes([type]);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function DexCard({
  mon,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  mon: PokemonSummary;
  favorite: boolean;
  onOpen: (mon: PokemonSummary) => void;
  onToggleFavorite: (id: number) => void;
}) {
  const accent = mon.types[0] ?? "normal";
  return (
    <article className="card" style={{ "--type": typeColor(accent) } as CSSProperties}>
      <button type="button" className="card-open" onClick={() => onOpen(mon)}>
        <span className="watermark" aria-hidden="true">#{padNumber(mon.id)}</span>
        <span className="number-row">
          <span className="number">#{padNumber(mon.id)}</span>
        </span>
        <span className="art-wrap">
          <Artwork id={mon.id} name={mon.name} />
        </span>
        <span className="name">{mon.name}</span>
        <span className="region">{regionName(mon.generation)}</span>
        <span className="pills">
          {mon.types.map((type) => (
            <span key={type} className="pill" style={{ background: typeColor(type), color: typeInk(type) }}>
              {typeLabel(type)}
            </span>
          ))}
        </span>
      </button>
      <button
        type="button"
        className="fav"
        aria-pressed={favorite}
        aria-label={favorite ? `Remover ${mon.name} dos favoritos` : `Favoritar ${mon.name}`}
        onClick={() => onToggleFavorite(mon.id)}
      >
        <Heart filled={favorite} />
      </button>
    </article>
  );
}
