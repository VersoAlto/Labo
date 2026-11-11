import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { decoder, lienContact } from "./codage";
import Objet from "./Objet";
import type { Partition } from "./types";
import { UNIVERS } from "./univers";

/**
 * Le site généré. Il ne connaît que la partition, lue dans le fragment de
 * l'URL : ce qu'on voit ici est exactement ce que verra le client.
 */

function lirePartition(): Partition | null {
  const m = window.location.hash.match(/p=([A-Za-z0-9_-]+)/);
  return m ? decoder(m[1]) : null;
}

function Sceau({ pris, surPrise }: { pris: boolean; surPrise: () => void }) {
  return (
    <button
      type="button"
      className={`sg-sceau${pris ? " est-pris" : ""}`}
      onClick={surPrise}
      disabled={pris}
      aria-label={pris ? "Sceau déjà pris" : "Prendre ce sceau"}
    >
      <span aria-hidden="true">✦</span>
    </button>
  );
}

export default function Site() {
  const [p, setP] = useState<Partition | null>(lirePartition);
  const [profil, setProfil] = useState<number | null>(null);
  const [reponses, setReponses] = useState<number[]>([]);
  const [sceaux, setSceaux] = useState<number[]>([]);
  const [avance, setAvance] = useState(0);
  const progres = useRef(0);
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surFragment = () => setP(lirePartition());
    window.addEventListener("hashchange", surFragment);
    return () => window.removeEventListener("hashchange", surFragment);
  }, []);

  useEffect(() => {
    if (p) document.title = p.nom;
  }, [p]);

  useEffect(() => {
    let attente = 0;
    const mesurer = () => {
      attente = 0;
      const course = document.documentElement.scrollHeight - window.innerHeight;
      progres.current = course > 0 ? window.scrollY / course : 0;
      setAvance(Math.round(progres.current * 100));
    };
    const surDefilement = () => {
      if (!attente) attente = requestAnimationFrame(mesurer);
    };
    mesurer();
    window.addEventListener("scroll", surDefilement, { passive: true });
    window.addEventListener("resize", surDefilement);
    return () => {
      cancelAnimationFrame(attente);
      window.removeEventListener("scroll", surDefilement);
      window.removeEventListener("resize", surDefilement);
    };
  }, []);

  // Les blocs se révèlent en entrant dans l'écran. Rejoué quand la partition
  // change, pour que les sections ajoutées depuis le Labo soient observées.
  useEffect(() => {
    const blocs = racine.current?.querySelectorAll("[data-rev]");
    if (!blocs) return;
    const veille = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) if (e.isIntersecting) e.target.classList.add("est-vu");
      },
      { threshold: 0.2 },
    );
    blocs.forEach((b) => veille.observe(b));
    return () => veille.disconnect();
  }, [p, reponses.length, profil]);

  const univers = p ? UNIVERS[p.univers] : null;
  const style = useMemo(
    () =>
      univers &&
      ({
        "--fond": univers.fond,
        "--surface": univers.surface,
        "--texte": univers.texte,
        "--doux": univers.doux,
        "--accent": univers.accent,
        "--sur-accent": univers.surAccent,
        "--display": univers.display,
        "--graisse": univers.graisse,
        "--penche": univers.italique ? "italic" : "normal",
        "--rayon": univers.rayon,
        colorScheme: univers.sombre ? "dark" : "light",
      } as CSSProperties),
    [univers],
  );

  if (!p || !univers || !style) {
    return (
      <main className="sg-vide">
        <p>Ce lien ne contient pas de site, ou il est incomplet.</p>
        <a href="/labo">Retourner au Labo</a>
      </main>
    );
  }

  const etapes = p.parcours.actif ? p.parcours.etapes : [];
  const quete = p.collection.actif && p.sommet.recompense.trim() !== "";
  const preuvesVisibles =
    p.preuves.actif && p.preuves.temoignages.length + p.preuves.chiffres.length > 0;
  // Un sceau par section présente, le sommet en dernier recours : sur une
  // page courte, on ne cache pas plus de sceaux qu'il n'y a d'endroits.
  const emplacements = [
    "hero",
    ...(etapes.length > 0 ? ["parcours"] : []),
    ...(preuvesVisibles ? ["preuves"] : []),
    "sommet",
  ];
  const nbSceaux = quete ? Math.min(p.collection.nb, emplacements.length) : 0;
  const prendre = (i: number) => setSceaux((x) => (x.includes(i) ? x : [...x, i]));
  const complet = quete && sceaux.length >= nbSceaux;
  const sceau = (lieu: string) => {
    const i = emplacements.indexOf(lieu);
    return i >= 0 && i < nbSceaux ? (
      <Sceau pris={sceaux.includes(i)} surPrise={() => prendre(i)} />
    ) : null;
  };
  const questions = p.epreuve.actif && etapes.length > 0 ? p.epreuve.questions : [];
  const fini = questions.length > 0 && reponses.length >= questions.length;
  // La deuxième question (« ce qui compte ») désigne l'étape d'entrée.
  const entree = fini ? etapes[(reponses[1] ?? 0) % etapes.length] : null;
  const lien = lienContact(p.contact);
  const profilChoisi = p.seuil.actif && profil !== null ? p.seuil.profils[profil] : null;

  return (
    <div className="sg" style={style} ref={racine}>
      <Objet univers={univers} progres={progres} eclat={nbSceaux ? sceaux.length / nbSceaux : 0} />

      <header className="sg-capsule">
        <span className="sg-capsule-nom">{p.nom}</span>
        <span
          className="sg-jauge"
          role="progressbar"
          aria-label="Progression dans la page"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={avance}
        >
          <span style={{ width: `${avance}%` }} />
        </span>
        {quete && (
          <span className="sg-compte" aria-live="polite">
            ✦ {sceaux.length}/{nbSceaux}
          </span>
        )}
      </header>

      <main>
        <section className="sg-section sg-hero">
          <p className="sg-sur">{p.hero.surtitre}</p>
          <h1>{p.hero.titre}</h1>
          <p className="sg-chapo">{p.hero.sous}</p>
          <p className="sg-descendre" aria-hidden="true">
            ↓ Descendre
          </p>
          {sceau("hero")}
        </section>

        {p.seuil.actif && p.seuil.profils.length > 1 && (
          <section className="sg-section" data-rev>
            <h2>{p.seuil.question}</h2>
            <div className="sg-choix">
              {p.seuil.profils.map((pr, i) => (
                <button
                  key={i}
                  type="button"
                  className={profil === i ? "est-choisi" : ""}
                  aria-pressed={profil === i}
                  onClick={() => setProfil(i)}
                >
                  {pr.nom}
                </button>
              ))}
            </div>
            <p className="sg-accroche" aria-live="polite">
              {profilChoisi?.accroche}
            </p>
          </section>
        )}

        {etapes.length > 0 && (
          <section className="sg-section">
            <h2 data-rev>{p.parcours.titre}</h2>
            <ol className="sg-paliers">
              {etapes.map((e, i) => (
                <li key={i} data-rev className={entree === e ? "est-entree" : ""}>
                  <span className="sg-numero">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{e.titre}</h3>
                    {e.texte && <p>{e.texte}</p>}
                    {entree === e && <p className="sg-marque">Votre point d'entrée</p>}
                  </div>
                </li>
              ))}
            </ol>
            {sceau("parcours")}
          </section>
        )}

        {questions.length > 0 && (
          <section className="sg-section" data-rev>
            <h2>{p.epreuve.titre}</h2>
            {!fini ? (
              <div className="sg-epreuve">
                <p className="sg-pas">
                  Question {reponses.length + 1} sur {questions.length}
                </p>
                <p className="sg-question">{questions[reponses.length].q}</p>
                <div className="sg-choix">
                  {questions[reponses.length].options.map((op, i) => (
                    <button key={i} type="button" onClick={() => setReponses((r) => [...r, i])}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sg-resultat" aria-live="polite">
                <p className="sg-pas">Votre point d'entrée</p>
                <h3>{entree?.titre}</h3>
                {entree?.texte && <p>{entree.texte}</p>}
                <button type="button" className="sg-lien" onClick={() => setReponses([])}>
                  Recommencer
                </button>
              </div>
            )}
          </section>
        )}

        {preuvesVisibles && (
          <section className="sg-section">
            <h2 data-rev>{p.preuves.titre}</h2>
            {p.preuves.chiffres.length > 0 && (
              <dl className="sg-chiffres" data-rev>
                {p.preuves.chiffres.map((c, i) => (
                  <div key={i}>
                    <dt>{c.valeur}</dt>
                    <dd>{c.legende}</dd>
                  </div>
                ))}
              </dl>
            )}
            {p.preuves.temoignages.map((t, i) => (
              <figure key={i} className="sg-temoin" data-rev>
                <blockquote>« {t.quoi} »</blockquote>
                <figcaption>{t.qui}</figcaption>
              </figure>
            ))}
            {sceau("preuves")}
          </section>
        )}

        <section className="sg-section sg-sommet" data-rev>
          {sceau("sommet")}
          <h2>{p.sommet.titre}</h2>
          <p className="sg-chapo">
            {profilChoisi ? `${profilChoisi.nom} : ` : ""}
            {p.sommet.texte}
          </p>
          {p.sommet.recompense && (
            <p className={`sg-prix${!quete || complet ? " est-ouvert" : ""}`} aria-live="polite">
              {!quete
                ? `Offert : ${p.sommet.recompense}.`
                : complet
                  ? `Sceaux réunis. Vous avez gagné : ${p.sommet.recompense}.`
                  : `Encore ${nbSceaux - sceaux.length} sceau${nbSceaux - sceaux.length > 1 ? "x" : ""} à trouver dans la page pour débloquer : ${p.sommet.recompense}.`}
            </p>
          )}
          {/* Le contact n'est jamais verrouillé par le jeu : la quête ajoute
              un prix, elle ne retire pas la porte. */}
          {lien ? (
            <a className="sg-cta" href={lien}>
              {p.sommet.cta}
            </a>
          ) : (
            <p className="sg-manque">Contact à renseigner dans la partition.</p>
          )}
        </section>
      </main>
    </div>
  );
}
