// Banc du lot « suivi des patros » (migration 070). Un scénario sur une base
// neuve, puis rejoué sur des bases où l'on a défait une règle : chaque mutant
// doit faire échouer l'affirmation qui le surveille.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { monterBase, enTantQue } from '../../../../reserve/banc/socle.mjs';

const MIG = process.argv[2];
const SQL070 = readFileSync(join(MIG, '070_suivi_des_patros.sql'), 'utf8');
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const PARENT = '00000000-0000-4000-8000-0000000000aa';

// Ce qu'une carte de patro a le droit de porter, et rien d'autre.
const CLES = new Set(['id', 'nom', 'ville', 'fonde_le', 'forfait', 'signal', 'jours_sans_activite',
  'derniere_activite', 'enfants', 'equipe', 'familles', 'seances_30j', 'derniere_seance',
  'dernier_appel', 'derniere_connexion', 'foyers', 'validations_30j', 'mise_en_route']);

async function scenario(db, ADMIN) {
  const R = {};
  const note = (nom, ok, detail = '') => { R[nom] = ok ? true : (detail || 'faux'); };
  const su = async (sql, p = []) => (await db.query(sql, p)).rows;
  const comme = async (uid, sql, p = [], role = 'authenticated') => {
    try { return { rows: (await enTantQue(db, uid, sql, p, role)).rows }; }
    catch (e) { return { erreur: e.message }; }
  };
  const must = (r, quoi) => { if (r.erreur) throw new Error(`préparation (${quoi}) : ${r.erreur}`); return r.rows; };
  const suivi = async (jour = null) => {
    const r = await comme(ADMIN, `select plateforme_suivi($1::date) j`, [jour]);
    if (r.erreur) throw new Error('lecture du suivi : ' + r.erreur);
    return r.rows[0].j;
  };
  const carte = (s, patro) => s.patros.find(p => p.id === patro);

  await su(`insert into auth.users (id, email) values ($1,'a@banc.test'),($2,'b@banc.test'),($3,'c@banc.test'),($4,'parent@banc.test')`, [A, B, C, PARENT]);
  for (const [e, f] of [['a@banc.test', 'mv'], ['b@banc.test', 'patronage'], ['c@banc.test', 'mv']])
    must(await comme(ADMIN, `select inviter_patro($1, null, $2::forfait_patro)`, [e, f]), 'invitation');
  const pa = must(await comme(A, `select bootstrap_patro('Patro A') id`), 'fondation A')[0].id;
  const pb = must(await comme(B, `select bootstrap_patro('Patro B') id`), 'fondation B')[0].id;
  const pc = must(await comme(C, `select bootstrap_patro('Patro C') id`), 'fondation C')[0].id;

  const enfant = async (patro, prenom) => {
    const id = (await su(`insert into vaillants (patro_id, prenom, nom, date_naissance, maison, age_progression, consentement_parental, consentement_date)
      values ($1,$2,'Banc',(now() - interval '7 years 2 months')::date,'corps',7,true,now()) returning id`, [patro, prenom]))[0].id;
    await su(`update vaillants set provisoire = false, confirme_le = now() where id = $1`, [id]);
    return id;
  };

  // A vit : un foyer, une enfant, une séance il y a trois jours, l'appel, une validation, une famille.
  must(await comme(A, `select creer_foyers(array['Les Aigles'], 'corps')`), 'foyer');
  const anne = await enfant(pa, 'Anne');
  await enfant(pa, 'Archibald'); await su(`update vaillants set archive_le = now() where patro_id=$1 and prenom='Archibald'`, [pa]);
  await enfant(pa, 'Provisoire'); await su(`update vaillants set provisoire = true where patro_id=$1 and prenom='Provisoire'`, [pa]);
  const sa = (await su(`insert into seances (patro_id, date, titre) values ($1, current_date - 3, 'Séance') returning id`, [pa]))[0].id;
  await su(`insert into presences (patro_id, seance_id, vaillant_id, present) values ($1,$2,$3,true)`, [pa, sa, anne]);
  const obj = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=7 order by ordre limit 1`, [pa]))[0].id;
  must(await comme(A, `select valider_objectif($1,$2,gen_random_uuid(),now())`, [anne, obj]), 'validation');
  await su(`insert into parents (patro_id, nom, auth_id) values ($1,'Famille Anne',$2)`, [pa, PARENT]);
  await su(`update auth.users set last_sign_in_at = now() where id = $1`, [A]);

  // B : fondé, rien d'autre. C : un enfant et une séance, mais tout date de 22 jours.
  await enfant(pc, 'Cyprien');
  await su(`insert into seances (patro_id, date, titre, created_at) values ($1, current_date - 22, 'Séance', now() - interval '22 days')`, [pc]);
  await su(`update auth.users set last_sign_in_at = now() - interval '22 days' where id = $1`, [C]);

  // ── Qui lit ──
  const s = await suivi();
  note('la plateforme lit le suivi des trois patros', s.patros.length === 3, String(s.patros.length));
  note('un directeur ne lit pas le suivi', !!(await comme(A, `select plateforme_suivi()`)).erreur?.includes('Réservé'));
  note('un anonyme ne lit pas le suivi : la fonction ne lui est pas accordée', !!(await comme(null, `select plateforme_suivi()`, [], 'anon')).erreur?.includes('permission denied'));

  // ── Le signal ──
  const ete = s.pause_ete;
  note('A, qui vit, est actif', carte(s, pa).signal === 'actif', carte(s, pa).signal);
  note('B, fondé sans rien, n’a pas démarré', carte(s, pb).signal === 'pas_demarre', carte(s, pb).signal);
  note('C, silencieux depuis 22 jours, est à relancer', carte(s, pc).signal === (ete ? 'en_pause' : 'a_relancer'), carte(s, pc).signal);
  note('à relancer d’abord, puis pas démarré, puis actif',
    s.patros.map(p => p.id).join() === [pc, pb, pa].join(), s.patros.map(p => p.nom).join(' · '));
  note('C dit ses jours de silence', carte(s, pc).jours_sans_activite === 22, String(carte(s, pc).jours_sans_activite));

  // Le seuil : 21 jours tout juste, c'est encore actif.
  await su(`update seances set created_at = now() - interval '21 days' where patro_id = $1`, [pc]);
  await su(`update auth.users set last_sign_in_at = now() - interval '21 days' where id = $1`, [C]);
  note('à 21 jours de silence, encore actif', carte(await suivi(), pc).signal === 'actif');
  await su(`update seances set created_at = now() - interval '22 days' where patro_id = $1`, [pc]);
  await su(`update auth.users set last_sign_in_at = now() - interval '22 days' where id = $1`, [C]);

  // L'été : le 1er août qui vient, tout patro silencieux est en pause, pas à relancer.
  const aout = `${new Date().getFullYear() + 1}-08-01`;
  const se = await suivi(aout);
  note('l’été, un silence est une pause', se.pause_ete === true && carte(se, pc).signal === 'en_pause' && carte(se, pa).signal === 'en_pause',
    `${carte(se, pc).signal} / ${carte(se, pa).signal}`);
  note('l’été, un patro qui n’a pas démarré le reste', carte(se, pb).signal === 'pas_demarre');

  // ── Les chiffres ──
  const a = carte(s, pa);
  note('A : un enfant actif, ni l’archivé ni le provisoire', a.enfants === 1, String(a.enfants));
  note('A : équipe, famille, séance du mois', a.equipe === 1 && a.familles === 1 && a.seances_30j === 1, JSON.stringify([a.equipe, a.familles, a.seances_30j]));
  note('A : son appel et sa connexion sont datés', !!a.dernier_appel && !!a.derniere_connexion && !!a.derniere_seance);
  note('A (MV) : ses foyers et ses validations du mois', a.foyers === 1 && a.validations_30j === 1, JSON.stringify([a.foyers, a.validations_30j]));
  note('B : une date absente reste absente, pas zéro', carte(s, pb).derniere_activite === null && carte(s, pb).jours_sans_activite === null && carte(s, pb).derniere_connexion === null);
  note('B (Patronage) : le jeu ne se compte pas', carte(s, pb).foyers === null && carte(s, pb).validations_30j === null);
  note('la mise en route compte 10 étapes en MV, 8 en Patronage',
    a.mise_en_route.total === 10 && carte(s, pb).mise_en_route.total === 8, `${a.mise_en_route.total} / ${carte(s, pb).mise_en_route.total}`);
  note('A a fait ses étapes foyers, enfants, séance, familles',
    ['foyers', 'enfants', 'seance', 'familles'].every(k => a.mise_en_route.etapes[k] === true) && a.mise_en_route.etapes.identite === false,
    JSON.stringify(a.mise_en_route.etapes));

  // ── Rien d'une personne ──
  const texte = JSON.stringify(s);
  note('aucun prénom, aucun nom de famille, aucune adresse', !/Anne|Cyprien|Archibald|Famille|@banc|Banc/.test(texte), texte.match(/Anne|Cyprien|Archibald|Famille|@banc|Banc/)?.[0]);
  const hors = s.patros.flatMap(p => Object.keys(p).filter(k => !CLES.has(k)));
  note('une carte ne porte que les clés prévues', hors.length === 0, hors.join());

  // ── Le forfait change, le suivi suit ──
  must(await comme(ADMIN, `select changer_forfait($1, 'patronage')`, [pa]), 'changement');
  const sp = carte(await suivi(), pa);
  note('A passé en Patronage : ses foyers ne se comptent plus', sp.foyers === null && sp.validations_30j === null && sp.mise_en_route.total === 8);
  note('… et il reste actif par ses séances', sp.signal === 'actif', sp.signal);
  return R;
}

const defait = (ancien, neuf) => {
  if (SQL070.split(ancien).length !== 2) throw new Error('mutant introuvable : ' + ancien);
  return SQL070.replace(ancien, neuf);
};
const MUTANTS = [
  ['sans la garde de la plateforme', defait('if not est_admin_plateforme() then', 'if false then'), 'un directeur ne lit pas le suivi'],
  ['accordée aux anonymes', `grant execute on function plateforme_suivi(date) to anon`, 'un anonyme ne lit pas le suivi : la fonction ne lui est pas accordée'],
  ['seuil à 30 jours', defait('v_seuil constant int := 21;', 'v_seuil constant int := 30;'), 'C, silencieux depuis 22 jours, est à relancer'],
  ['seuil compté large', defait('v_jour - c.derniere_activite > v_seuil', 'v_jour - c.derniere_activite >= v_seuil'), 'à 21 jours de silence, encore actif'],
  ['sans la pause d’été', defait('v_ete := v_jour between', 'v_ete := false and v_jour between'), 'l’été, un silence est une pause'],
  ['le jeu compté en Patronage', defait("'foyers', case when s.jeu then s.nb_foyers end", "'foyers', s.nb_foyers"), 'B (Patronage) : le jeu ne se compte pas'],
  ['les archivés comptés', defait('and v.archive_le is null and not v.provisoire', ''), 'A : un enfant actif, ni l’archivé ni le provisoire'],
  ['un prénom qui fuit', defait("'forfait', s.forfait,", "'forfait', s.forfait, 'directeur', (select string_agg(prenom || ' ' || coalesce(nom, ''), ',') from vaillants where patro_id = s.id),"), 'aucun prénom, aucun nom de famille, aucune adresse'],
  ['une clé de trop', defait("'forfait', s.forfait,", "'forfait', s.forfait, 'slug', (select slug from patros where id = s.id),"), 'une carte ne porte que les clés prévues'],
  ['ordre alphabétique', defait("order by case s.signal when 'a_relancer' then 1", "order by s.nom, case s.signal when 'a_relancer' then 1"), 'à relancer d’abord, puis pas démarré, puis actif'],
  ['pas démarré oublié', defait("when c.seances_total = 0 and c.enfants = 0 then 'pas_demarre'", "when false then 'pas_demarre'"), 'B, fondé sans rien, n’a pas démarré'],
];

let mauvais = 0;
{
  const { db, echecs, fondateur } = await monterBase(MIG);
  if (echecs.length) { console.log('MIGRATIONS EN ÉCHEC', echecs); process.exit(1); }
  const R = await scenario(db, fondateur);
  const ko = Object.entries(R).filter(([, v]) => v !== true);
  console.log(`Scénario : ${Object.keys(R).length - ko.length}/${Object.keys(R).length} affirmations tenues`);
  for (const [n, v] of ko) { console.log('  ÉCHEC', n, '→', v); mauvais++; }
}
for (const [nom, sql, cible] of MUTANTS) {
  const { db, fondateur } = await monterBase(MIG);
  await db.exec(sql);
  let R; try { R = await scenario(db, fondateur); } catch (e) { R = { [cible]: 'scénario interrompu : ' + e.message }; }
  const tue = R[cible] !== true;
  console.log(`Mutant « ${nom} » : ${tue ? 'tué' : 'SURVIT'}  (${cible})${tue ? ' → ' + String(R[cible]).slice(0, 90) : ''}`);
  if (!tue) mauvais++;
}
process.exit(mauvais ? 1 : 0);
