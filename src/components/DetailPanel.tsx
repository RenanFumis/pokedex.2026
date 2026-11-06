import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { EvolutionMember, PokemonDetail, PokemonSummary } from "../types.ts";
import { loadDetail } from "../api.ts";
import {
  eggLabel,
  formatKilograms,
  formatMeters,
  genderLabel,
  growthLabel,
  habitatLabel,
  padNumber,
  regionName,
  statLabel,
  typeColor,
  typeInk,
  typeLabel,
} from "../format.ts";
import { Artwork, Heart } from "./Artwork.tsx";

type TextLang = "pt" | "en";

const TEXT_LANG_KEY = "pokedex-text-lang";

function readTextLang(): TextLang {
  try {
    return localStorage.getItem(TEXT_LANG_KEY) === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

type DetailPanelProps = {
  pokemon: PokemonSummary;
  favorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onPick: (member: EvolutionMember) => void;
  onExploreType: (type: string) => void;
};

export function DetailPanel({
  pokemon,
  favorite,
  onClose,
  onToggleFavorite,
  onPrev,
  onNext,
  onPick,
  onExploreType,
}: DetailPanelProps) {
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [shiny, setShiny] = useState(false);
  const [cryError, setCryError] = useState(false);
  const [textLang, setTextLang] = useState<TextLang>(readTextLang);

  function chooseLang(next: TextLang) {
    setTextLang(next);
    try {
      localStorage.setItem(TEXT_LANG_KEY, next);
    } catch {
      // A escolha vale só nesta visita se o navegador recusar o armazenamento.
    }
  }

  useEffect(() => {
    let active = true;
    setPhase("loading");
    setDetail(null);
    setCryError(false);
    loadDetail(pokemon.id, attempt > 0).then(
      (next) => {
        if (!active) return;
        setDetail(next);
        setPhase("ready");
      },
      () => {
        if (!active) return;
        setPhase("error");
      },
    );
    return () => {
      active = false;
    };
  }, [pokemon.id, attempt]);

  const types = detail?.types.length ? detail.types : pokemon.types;
  const accent = types[0] ?? "normal";
  const total = detail?.stats.reduce((sum, stat) => sum + stat.value, 0) ?? 0;
  const english = textLang === "en";
  const genus = detail ? (english ? detail.genusEn || detail.genus : detail.genus) : "";
  const flavor = detail ? (english ? detail.flavorEn || detail.flavor : detail.flavor) : "";

  async function playCry() {
    if (!detail?.cry) return;
    try {
      await new Audio(detail.cry).play();
      setCryError(false);
    } catch {
      setCryError(true);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${pokemon.name}`}
        style={{ "--type": typeColor(accent) } as CSSProperties}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-top">
          <div className="nav">
            <button type="button" className="ghost" onClick={onClose}>
              Fechar
            </button>
            <button type="button" className="ghost" disabled={onPrev === null} onClick={() => onPrev?.()}>
              Anterior
            </button>
            <button type="button" className="ghost" disabled={onNext === null} onClick={() => onNext?.()}>
              Próximo
            </button>
          </div>
          <button
            type="button"
            className="fav fav-inline"
            aria-pressed={favorite}
            aria-label={favorite ? `Remover ${pokemon.name} dos favoritos` : `Favoritar ${pokemon.name}`}
            onClick={onToggleFavorite}
          >
            <Heart filled={favorite} />
          </button>
        </div>

        <div className="drawer-body">
          <div className="hero-art">
            <Artwork id={pokemon.id} name={pokemon.name} shiny={shiny} priority />
          </div>

          <div className="identity">
            <p className="meta">
              <span>#{padNumber(pokemon.id)}</span>
              <span>{regionName(pokemon.generation)}</span>
              {genus && <span>{genus}</span>}
            </p>
            <h2>{pokemon.name}</h2>
            <div className="pills">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="pill pill-button"
                  style={{ background: typeColor(type), color: typeInk(type) }}
                  onClick={() => onExploreType(type)}
                >
                  {typeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="art-actions">
            <button type="button" className="ghost" aria-pressed={shiny} onClick={() => setShiny((value) => !value)}>
              {shiny ? "Versão normal" : "Versão shiny"}
            </button>
            {detail?.cry && (
              <button type="button" className="ghost" onClick={() => void playCry()}>
                Ouvir grito
              </button>
            )}
          </div>
          {cryError && <p className="cry-error">O grito não está disponível para esta espécie.</p>}

          {phase === "loading" && <p className="detail-status">Buscando atributos, habilidades e evolução…</p>}

          {phase === "error" && (
            <div className="notice compact">
              <p>Não consegui abrir a ficha agora.</p>
              <button type="button" className="solid" onClick={() => setAttempt((value) => value + 1)}>
                Tentar de novo
              </button>
            </div>
          )}

          {phase === "ready" && detail && (
            <>
              <div className="lang-dex" role="group" aria-label="Idioma do texto">
                <button
                  type="button"
                  className="dex-btn dex-pt"
                  aria-pressed={textLang === "pt"}
                  onClick={() => chooseLang("pt")}
                >
                  PT
                </button>
                <button
                  type="button"
                  className="dex-btn dex-en"
                  aria-pressed={textLang === "en"}
                  onClick={() => chooseLang("en")}
                >
                  EN
                </button>
              </div>

              {flavor && (
                <p className="flavor" lang={english ? "en" : "pt"}>
                  {flavor}
                </p>
              )}

              <div className="facts">
                <Fact label="Altura" value={formatMeters(detail.height)} />
                <Fact label="Peso" value={formatKilograms(detail.weight)} />
                <Fact label="Gênero" value={genderLabel(detail.genderRate)} />
                <Fact label="Captura" value={`${detail.captureRate} / 255`} />
                <Fact label="Crescimento" value={growthLabel(detail.growthRate)} />
                <Fact label="Habitat" value={detail.habitat ? habitatLabel(detail.habitat) : "—"} />
                <Fact label="Exp. base" value={detail.baseExperience === null ? "—" : String(detail.baseExperience)} />
                <Fact
                  label="Ovos"
                  value={detail.eggGroups.length > 0 ? detail.eggGroups.map(eggLabel).join(", ") : "—"}
                />
              </div>

              <section>
                <div className="section-title">
                  <h3>Atributos</h3>
                  <span>Total {total}</span>
                </div>
                <div className="stats">
                  {detail.stats.map((stat) => (
                    <div className="stat" key={stat.key}>
                      <span>{statLabel(stat.key)}</span>
                      <b>{stat.value}</b>
                      <div className="track">
                        <div className="fill" style={{ width: `${Math.min(100, (stat.value / 255) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3>Habilidades</h3>
                <ul className="abilities">
                  {detail.abilities.map((ability) => {
                    const name = english ? ability.nameEn || ability.name : ability.name;
                    const text = english ? ability.textEn || ability.text : ability.text;
                    return (
                      <li key={`${ability.nameEn}-${ability.hidden}`}>
                        <strong>
                          {name}
                          {ability.hidden && <em>{english ? "hidden" : "oculta"}</em>}
                        </strong>
                        {text && <p>{text}</p>}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {detail.evolution.length > 1 && (
                <section>
                  <h3>Família evolutiva</h3>
                  <div className="evo">
                    {detail.evolution.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        aria-current={member.id === pokemon.id}
                        onClick={() => onPick(member)}
                      >
                        <Artwork id={member.id} name={member.name} />
                        <span>{member.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          <p className="keyhint">Esc fecha · setas trocam de espécie</p>
        </div>
      </aside>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
