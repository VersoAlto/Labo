import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { coder, lienContact } from "./codage";
import { composer } from "./composer";
import { diagnostiquer } from "./diagnostic";
import { BRIEF_VIDE, EXEMPLES } from "./exemples";
import type { Brief, Diagnostic, Partition } from "./types";
import { contraste, LISTE_UNIVERS, UNIVERS } from "./univers";

const CLE = "verso-alto:labo";
type Etape = "brief" | "diagnostic" | "partition";

function charger(): { brief: Brief; partition: Partition | null } {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const { brief, partition } = JSON.parse(brut);
      if (brief) return { brief: { ...BRIEF_VIDE, ...brief }, partition: partition ?? null };
    }
  } catch {
    /* stockage refusé : on repart d'un brief vide */
  }
  return { brief: BRIEF_VIDE, partition: null };
}

function Champ({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <label className="lb-champ">
      <span className="lb-etiquette">{titre}</span>
      {children}
      {aide && <span className="lb-aide">{aide}</span>}
    </label>
  );
}

function Liste<T extends string>({
  valeur,
  options,
  surChange,
}: {
  valeur: T;
  options: [T, string][];
  surChange: (v: T) => void;
}) {
  return (
    <select value={valeur} onChange={(e) => surChange(e.target.value as T)}>
      {options.map(([v, nom]) => (
        <option key={v} value={v}>
          {nom}
        </option>
      ))}
    </select>
  );
}

/** L'octogone : huit ressorts, un score de 0 à 10 sur chaque axe. */
function Octogone({ diagnostic }: { diagnostic: Diagnostic }) {
  const c = 150;
  const r = 96;
  const point = (i: number, k: number) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * r * k, c + Math.sin(a) * r * k] as const;
  };
  const contour = (k: number) => Array.from({ length: 8 }, (_, i) => point(i, k).join(",")).join(" ");
  return (
    <svg viewBox="0 0 300 300" className="lb-octogone" role="img" aria-label="Scores des huit ressorts">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={contour(k)} className="lb-octo-grille" />
      ))}
      <polygon
        points={diagnostic.ressorts.map((x, i) => point(i, x.score / 10).join(",")).join(" ")}
        className="lb-octo-forme"
      />
      {diagnostic.ressorts.map((x, i) => {
        const [px, py] = point(i, 1.26);
        return (
          <text key={x.id} x={px} y={py} textAnchor="middle" dominantBaseline="middle" className="lb-octo-nom">
            {x.nom}
          </text>
        );
      })}
    </svg>
  );
}

export default function Labo() {
  const depart = useMemo(charger, []);
  const [brief, setBrief] = useState<Brief>(depart.brief);
  const [partition, setPartition] = useState<Partition | null>(depart.partition);
  const [etape, setEtape] = useState<Etape>("brief");
  const [telephone, setTelephone] = useState(false);
  const [copie, setCopie] = useState(false);
  const cadre = useRef<HTMLIFrameElement>(null);

  const diagnostic = useMemo(() => diagnostiquer(brief), [brief]);
  const code = useMemo(() => (partition ? coder(partition) : ""), [partition]);
  const adresse = `/labo/site#p=${code}`;
  // L'adresse du cadre n'est posée qu'une fois : ensuite seul le fragment
  // change, donc le site ne se recharge pas à chaque frappe.
  const adresseInitiale = useRef("");
  if (code && !adresseInitiale.current) adresseInitiale.current = adresse;

  useEffect(() => {
    document.title = "Le Labo · Verso Alto";
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLE, JSON.stringify({ brief, partition }));
    } catch {
      /* sans stockage, le travail vit le temps de la visite */
    }
  }, [brief, partition]);

  useEffect(() => {
    if (!code || etape !== "partition") return;
    const delai = setTimeout(() => {
      try {
        cadre.current?.contentWindow?.location.replace(adresse);
      } catch {
        /* cadre pas encore prêt */
      }
    }, 250);
    return () => clearTimeout(delai);
  }, [adresse, code, etape]);

  const b = <K extends keyof Brief>(cle: K, v: Brief[K]) => setBrief((x) => ({ ...x, [cle]: v }));
  const retoucher = (geste: (p: Partition) => void) =>
    setPartition((x) => {
      if (!x) return x;
      const copieP = structuredClone(x);
      geste(copieP);
      return copieP;
    });

  const pret = brief.nom.trim() !== "" && brief.promesse.trim() !== "";

  const composerPartition = () => {
    setPartition(composer(brief, diagnostic));
    adresseInitiale.current = "";
    setEtape("partition");
  };

  const telecharger = () => {
    if (!partition) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(partition, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `partition-${partition.nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + adresse);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papiers refusé : le lien reste ouvrable en plein écran */
    }
  };

  const gardeFous = useMemo(() => {
    if (!partition) return [];
    const u = UNIVERS[partition.univers];
    const jeux = [partition.seuil.actif, partition.epreuve.actif, partition.collection.actif].filter(Boolean).length;
    const ratio = (x: number) => x.toFixed(1).replace(".", ",");
    const cTexte = contraste(u.texte, u.fond);
    const cAccent = contraste(u.accent, u.fond);
    return [
      { ok: cTexte >= 4.5, texte: `Contraste du texte : ${ratio(cTexte)} (4,5 requis)` },
      { ok: cAccent >= 4.5, texte: `Contraste de l'accent : ${ratio(cAccent)} (4,5 requis)` },
      { ok: lienContact(partition.contact) !== null, texte: "Contact valide (adresse ou lien https)" },
      { ok: partition.hero.titre.length <= 90, texte: `Titre de ${partition.hero.titre.length} caractères (90 au plus)` },
      { ok: jeux <= 3 && jeux >= 1, texte: `${jeux} mécanique${jeux > 1 ? "s" : ""} de jeu active${jeux > 1 ? "s" : ""} (1 à 3)` },
      {
        ok: !partition.collection.actif || partition.sommet.recompense.trim() !== "",
        texte: "Pas de quête sans récompense réelle",
      },
      {
        ok: partition.preuves.actif && partition.preuves.temoignages.length + partition.preuves.chiffres.length > 0,
        texte: "Au moins une preuve réelle avant la demande",
      },
    ];
  }, [partition]);

  const ETAPES: [Etape, string][] = [
    ["brief", "1 · Brief"],
    ["diagnostic", "2 · Diagnostic"],
    ["partition", "3 · Partition et aperçu"],
  ];

  return (
    <div className="lb">
      <header className="lb-tete">
        <a href="/" className="lb-retour">
          Verso ⟂ Alto
        </a>
        <h1>Le Labo</h1>
        <nav aria-label="Étapes du Labo">
          {ETAPES.map(([id, nom]) => (
            <button
              key={id}
              type="button"
              className={etape === id ? "est-courante" : ""}
              aria-current={etape === id ? "step" : undefined}
              disabled={(id === "diagnostic" && !pret) || (id === "partition" && !partition)}
              onClick={() => setEtape(id)}
            >
              {nom}
            </button>
          ))}
        </nav>
      </header>

      {etape === "brief" && (
        <main className="lb-corps lb-etroit">
          <p className="lb-intro">
            Ce que dit le client, en treize champs. Rien d'autre n'entre dans la machine.
          </p>
          <div className="lb-exemples">
            <span>Briefs d'essai (fictifs) :</span>
            {EXEMPLES.map((ex) => (
              <button key={ex.titre} type="button" onClick={() => setBrief(ex.brief)}>
                {ex.titre}
              </button>
            ))}
            <button type="button" onClick={() => setBrief(BRIEF_VIDE)}>
              Vider
            </button>
          </div>

          <div className="lb-grille">
            <Champ titre="Nom de la structure">
              <input value={brief.nom} onChange={(e) => b("nom", e.target.value)} />
            </Champ>
            <Champ titre="Secteur">
              <Liste
                valeur={brief.secteur}
                surChange={(v) => b("secteur", v)}
                options={[
                  ["ecole", "École, formation"],
                  ["artisan", "Artisan, commerce"],
                  ["association", "Association, paroisse"],
                  ["independant", "Indépendant, coach"],
                  ["culture", "Culture, événement"],
                  ["entreprise", "Entreprise, services"],
                ]}
              />
            </Champ>
            <Champ titre="Public principal">
              <Liste
                valeur={brief.public}
                surChange={(v) => b("public", v)}
                options={[
                  ["jeunes", "Jeunes (11-25 ans)"],
                  ["familles", "Parents, familles"],
                  ["decideurs", "Décideurs, professionnels"],
                  ["grand-public", "Grand public"],
                  ["communaute", "Communauté, bénévoles"],
                ]}
              />
            </Champ>
            <Champ titre="Profils de visiteurs" aide="Séparés par des virgules, quatre au plus.">
              <input value={brief.profils} onChange={(e) => b("profils", e.target.value)} />
            </Champ>
            <Champ titre="Action attendue">
              <Liste
                valeur={brief.action}
                surChange={(v) => b("action", v)}
                options={[
                  ["rdv", "Prendre rendez-vous"],
                  ["inscription", "S'inscrire"],
                  ["devis", "Demander un devis"],
                  ["don", "Faire un don"],
                  ["achat", "Acheter"],
                  ["visite", "Venir sur place"],
                ]}
              />
            </Champ>
            <Champ titre="Ce qui retient le visiteur">
              <Liste
                valeur={brief.frein}
                surChange={(v) => b("frein", v)}
                options={[
                  ["mefiance", "Il se méfie"],
                  ["temps", "Il n'a pas le temps"],
                  ["incomprehension", "Il ne comprend pas l'offre"],
                  ["prix", "Il trouve ça cher"],
                  ["indifference", "Il s'en moque"],
                ]}
              />
            </Champ>
            <Champ titre="Ton">
              <Liste
                valeur={brief.ton}
                surChange={(v) => b("ton", v)}
                options={[
                  ["sobre", "Sobre"],
                  ["chaleureux", "Chaleureux"],
                  ["audacieux", "Audacieux"],
                ]}
              />
            </Champ>
            <Champ titre="Contact" aide="Adresse électronique ou lien https de prise de contact.">
              <input value={brief.contact} onChange={(e) => b("contact", e.target.value)} />
            </Champ>
          </div>

          <Champ titre="Promesse, en une phrase">
            <input value={brief.promesse} onChange={(e) => b("promesse", e.target.value)} />
          </Champ>
          <Champ titre="Étapes ou offres" aide="Une par ligne, « Titre : description ». Deux à cinq.">
            <textarea rows={4} value={brief.etapes} onChange={(e) => b("etapes", e.target.value)} />
          </Champ>
          <Champ titre="Témoignages réels" aide="Un par ligne, « Qui : citation ». Laisser vide s'il n'y en a pas.">
            <textarea rows={3} value={brief.temoignages} onChange={(e) => b("temoignages", e.target.value)} />
          </Champ>
          <Champ titre="Chiffres réels" aide="Un par ligne, « valeur : légende ».">
            <textarea rows={2} value={brief.chiffres} onChange={(e) => b("chiffres", e.target.value)} />
          </Champ>
          <Champ titre="Récompense réelle" aide="Ce que le client offre vraiment. Vide = pas de quête.">
            <input value={brief.recompense} onChange={(e) => b("recompense", e.target.value)} />
          </Champ>

          <div className="lb-actions">
            <button type="button" className="lb-principal" disabled={!pret} onClick={() => setEtape("diagnostic")}>
              Diagnostiquer
            </button>
            {!pret && <span className="lb-aide">Il faut au moins un nom et une promesse.</span>}
          </div>
        </main>
      )}

      {etape === "diagnostic" && (
        <main className="lb-corps">
          <div className="lb-deux">
            <section>
              <h2>Les ressorts de ce public</h2>
              <Octogone diagnostic={diagnostic} />
              <ul className="lb-scores">
                {diagnostic.ressorts.map((x) => (
                  <li key={x.id}>
                    <span>{x.nom}</span>
                    <span className="lb-barre">
                      <span style={{ width: `${x.score * 10}%` }} />
                    </span>
                    <span>{x.score}</span>
                  </li>
                ))}
              </ul>
              <p className="lb-aide">
                Barèmes par règles : des hypothèses de départ, à corriger avec les résultats réels.
              </p>
            </section>
            <section>
              <h2>Les mécaniques</h2>
              <ul className="lb-mecaniques">
                {diagnostic.mecaniques.map((m) => (
                  <li key={m.id} className={m.retenue ? "est-retenue" : ""}>
                    <span className="lb-verdict">{m.retenue ? "Retenue" : "Écartée"}</span>
                    <strong>{m.nom}</strong>
                    <p>{m.raison}</p>
                  </li>
                ))}
              </ul>
              <h2>L'univers</h2>
              <p>
                <strong>{UNIVERS[diagnostic.univers].nom}.</strong> {UNIVERS[diagnostic.univers].resume}{" "}
                {diagnostic.raisonUnivers}
              </p>
              <div className="lb-actions">
                <button type="button" className="lb-principal" onClick={composerPartition}>
                  {partition ? "Recomposer la partition" : "Composer la partition"}
                </button>
                {partition && <span className="lb-aide">Recomposer efface les retouches faites à la main.</span>}
              </div>
            </section>
          </div>
        </main>
      )}

      {etape === "partition" && partition && (
        <main className="lb-corps">
          <div className="lb-atelier">
            <section className="lb-edition">
              <h2>La partition</h2>

              <fieldset>
                <legend>Univers</legend>
                <div className="lb-univers">
                  {LISTE_UNIVERS.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      aria-pressed={partition.univers === u.id}
                      className={partition.univers === u.id ? "est-choisi" : ""}
                      onClick={() => retoucher((p) => void (p.univers = u.id))}
                    >
                      <span className="lb-pastille" style={{ background: u.fond, borderColor: u.accent }} />
                      {u.nom}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Ouverture</legend>
                <Champ titre="Titre">
                  <input value={partition.hero.titre} onChange={(e) => retoucher((p) => void (p.hero.titre = e.target.value))} />
                </Champ>
                <Champ titre="Sous-titre">
                  <textarea rows={2} value={partition.hero.sous} onChange={(e) => retoucher((p) => void (p.hero.sous = e.target.value))} />
                </Champ>
              </fieldset>

              <fieldset>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={partition.seuil.actif}
                      onChange={(e) => retoucher((p) => void (p.seuil.actif = e.target.checked))}
                    />
                    Le seuil
                  </label>
                </legend>
                {partition.seuil.actif && (
                  <>
                    <Champ titre="Question">
                      <input value={partition.seuil.question} onChange={(e) => retoucher((p) => void (p.seuil.question = e.target.value))} />
                    </Champ>
                    {partition.seuil.profils.map((pr, i) => (
                      <Champ key={i} titre={`Accroche · ${pr.nom}`}>
                        <textarea rows={2} value={pr.accroche} onChange={(e) => retoucher((p) => void (p.seuil.profils[i].accroche = e.target.value))} />
                      </Champ>
                    ))}
                    {partition.seuil.profils.length < 2 && <p className="lb-aide">Il faut au moins deux profils dans le brief.</p>}
                  </>
                )}
              </fieldset>

              <fieldset>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={partition.parcours.actif}
                      onChange={(e) => retoucher((p) => void (p.parcours.actif = e.target.checked))}
                    />
                    Le parcours
                  </label>
                </legend>
                {partition.parcours.actif && (
                  <>
                    <Champ titre="Titre">
                      <input value={partition.parcours.titre} onChange={(e) => retoucher((p) => void (p.parcours.titre = e.target.value))} />
                    </Champ>
                    {partition.parcours.etapes.map((et, i) => (
                      <div key={i} className="lb-paire">
                        <Champ titre={`Palier ${i + 1}`}>
                          <input value={et.titre} onChange={(e) => retoucher((p) => void (p.parcours.etapes[i].titre = e.target.value))} />
                        </Champ>
                        <Champ titre="Texte">
                          <textarea rows={2} value={et.texte} onChange={(e) => retoucher((p) => void (p.parcours.etapes[i].texte = e.target.value))} />
                        </Champ>
                      </div>
                    ))}
                  </>
                )}
              </fieldset>

              <fieldset>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={partition.epreuve.actif}
                      onChange={(e) => retoucher((p) => void (p.epreuve.actif = e.target.checked))}
                    />
                    L'épreuve
                  </label>
                </legend>
                {partition.epreuve.actif && (
                  <>
                    <Champ titre="Titre">
                      <input value={partition.epreuve.titre} onChange={(e) => retoucher((p) => void (p.epreuve.titre = e.target.value))} />
                    </Champ>
                    {partition.epreuve.questions.map((q, i) => (
                      <div key={i} className="lb-paire">
                        <Champ titre={`Question ${i + 1}`}>
                          <input value={q.q} onChange={(e) => retoucher((p) => void (p.epreuve.questions[i].q = e.target.value))} />
                        </Champ>
                        <Champ titre="Réponses" aide="Une par ligne.">
                          <textarea
                            rows={3}
                            value={q.options.join("\n")}
                            onChange={(e) => retoucher((p) => void (p.epreuve.questions[i].options = e.target.value.split("\n").slice(0, 4)))}
                          />
                        </Champ>
                      </div>
                    ))}
                    {!partition.parcours.actif && <p className="lb-aide">L'épreuve a besoin du parcours : elle y désigne un palier.</p>}
                  </>
                )}
              </fieldset>

              <fieldset>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={partition.preuves.actif}
                      onChange={(e) => retoucher((p) => void (p.preuves.actif = e.target.checked))}
                    />
                    Les preuves
                  </label>
                </legend>
                {partition.preuves.actif && (
                  <>
                    <Champ titre="Titre">
                      <input value={partition.preuves.titre} onChange={(e) => retoucher((p) => void (p.preuves.titre = e.target.value))} />
                    </Champ>
                    {partition.preuves.temoignages.map((t, i) => (
                      <Champ key={i} titre={`Témoignage · ${t.qui}`}>
                        <textarea rows={2} value={t.quoi} onChange={(e) => retoucher((p) => void (p.preuves.temoignages[i].quoi = e.target.value))} />
                      </Champ>
                    ))}
                    {partition.preuves.temoignages.length + partition.preuves.chiffres.length === 0 && (
                      <p className="lb-aide">Aucune preuve dans le brief : la section restera invisible.</p>
                    )}
                  </>
                )}
              </fieldset>

              <fieldset>
                <legend>
                  <label>
                    <input
                      type="checkbox"
                      checked={partition.collection.actif}
                      onChange={(e) => retoucher((p) => void (p.collection.actif = e.target.checked))}
                    />
                    La collection de sceaux
                  </label>
                </legend>
                {partition.collection.actif && partition.sommet.recompense.trim() === "" && (
                  <p className="lb-aide">Sans récompense, les sceaux ne sont pas affichés.</p>
                )}
              </fieldset>

              <fieldset>
                <legend>Sommet</legend>
                <Champ titre="Titre">
                  <input value={partition.sommet.titre} onChange={(e) => retoucher((p) => void (p.sommet.titre = e.target.value))} />
                </Champ>
                <Champ titre="Texte">
                  <textarea rows={2} value={partition.sommet.texte} onChange={(e) => retoucher((p) => void (p.sommet.texte = e.target.value))} />
                </Champ>
                <Champ titre="Bouton">
                  <input value={partition.sommet.cta} onChange={(e) => retoucher((p) => void (p.sommet.cta = e.target.value))} />
                </Champ>
                <Champ titre="Récompense">
                  <input value={partition.sommet.recompense} onChange={(e) => retoucher((p) => void (p.sommet.recompense = e.target.value))} />
                </Champ>
                <Champ titre="Contact">
                  <input value={partition.contact} onChange={(e) => retoucher((p) => void (p.contact = e.target.value))} />
                </Champ>
              </fieldset>
            </section>

            <section className="lb-apercu">
              <div className="lb-barre-apercu">
                <div className="lb-bascule" role="group" aria-label="Format de l'aperçu">
                  <button type="button" aria-pressed={!telephone} className={!telephone ? "est-choisi" : ""} onClick={() => setTelephone(false)}>
                    Ordinateur
                  </button>
                  <button type="button" aria-pressed={telephone} className={telephone ? "est-choisi" : ""} onClick={() => setTelephone(true)}>
                    Téléphone
                  </button>
                </div>
                <a href={adresse} target="_blank" rel="noreferrer">
                  Plein écran
                </a>
                <button type="button" onClick={copier}>
                  {copie ? "Lien copié" : "Copier le lien client"}
                </button>
                <button type="button" onClick={telecharger}>
                  Télécharger la partition
                </button>
              </div>
              <div className={`lb-cadre${telephone ? " est-telephone" : ""}`}>
                <iframe ref={cadre} src={adresseInitiale.current} title="Aperçu du site généré" />
              </div>
              <h3>Garde-fous</h3>
              <ul className="lb-gardes">
                {gardeFous.map((g) => (
                  <li key={g.texte} className={g.ok ? "est-ok" : "est-ko"}>
                    <span aria-hidden="true">{g.ok ? "✓" : "✕"}</span>
                    <span className="sr-only">{g.ok ? "Conforme :" : "À corriger :"}</span> {g.texte}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
