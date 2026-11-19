// Banc du lot « suivi des patros » (migration 070). Un scénario sur une base
// neuve, puis rejoué sur des bases où l'on a défait une règle : chaque mutant
// doit faire échouer l'affirmation qui le surveille. Les cas marqués (audit, …)
// viennent du rapport du 19 novembre 2026.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { monterBase, enTantQue } from '../../../../reserve/banc/socle.mjs';

const MIG = process.argv[2];
const SQL070 = readFileSync(join(MIG, '070_suivi_des_patros.sql'), 'utf8');
const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const A = U('0a'), B = U('0b'), C = U('0c'), D = U('0d'), E = U('0e'), CODIR = U('1a'), PARENT = U('aa');

// Ce qu'une carte de patro a le droit de porter, et rien d'autre.
const CLES = new Set(['id', 'nom', 'ville', 'fonde_le', 'forfait', 'signal', 'jours_sans_activite',
  'derniere_activite', 'enfants', 'equipe', 'familles', 'seances_30j', 'derniere_seance',
  'dernier_appel', 'derniere_ouverture', 'foyers', 'validations_30j', 'mise_en_route']);
const ORDRE = ['identite', 'mfa', 'foyers', 'enfants', 'equipe', 'honorabilite', 'grands_freres', 'seance', 'mot', 'familles'];

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
  const etape = (c, cle) => c.mise_en_route.etapes.find(e => e.cle === cle)?.fait;
  const signal = async (patro, jour = null) => carte(await suivi(jour), patro).signal;

  await su(`insert into auth.users (id, email) values ($1,'a@banc.test'),($2,'b@banc.test'),($3,'c@banc.test'),($4,'d@banc.test'),($5,'e@banc.test'),($6,'parent@banc.test')`, [A, B, C, D, E, PARENT]);
  for (const [e, f] of [['a@banc.test', 'mv'], ['b@banc.test', 'patronage'], ['c@banc.test', 'mv'], ['d@banc.test', 'patronage'], ['e@banc.test', 'patronage']])
    must(await comme(ADMIN, `select inviter_patro($1, null, $2::forfait_patro)`, [e, f]), 'invitation');
  const pa = must(await comme(A, `select bootstrap_patro('Patro A') id`), 'fondation A')[0].id;
  const pb = must(await comme(B, `select bootstrap_patro('Patro B') id`), 'fondation B')[0].id;
  const pc = must(await comme(C, `select bootstrap_patro('Patro C') id`), 'fondation C')[0].id;
  const pd = must(await comme(D, `select bootstrap_patro('Patro D') id`), 'fondation D')[0].id;
  const pe = must(await comme(E, `select bootstrap_patro('Patro E') id`), 'fondation E')[0].id;

  const enfant = async (patro, prenom, cree = null) => {
    const id = (await su(`insert into vaillants (patro_id, prenom, nom, date_naissance, maison, age_progression, consentement_parental, consentement_date, created_at)
      values ($1,$2,'Banc',(now() - interval '7 years 2 months')::date,'corps',7,true,now(),coalesce($3::timestamptz, now())) returning id`, [patro, prenom, cree]))[0].id;
    await su(`update vaillants set provisoire = false, confirme_le = now() where id = $1`, [id]);
    return id;
  };
  // Une date d'il y a N jours, à midi à Paris : le jour ne dépend pas de l'heure du banc.
  const ilYa = (n) => `${new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)} 12:00+01`;
  const silence = async (patro, dir, n) => {
    await su(`update seances set created_at = $2 where patro_id = $1`, [patro, ilYa(n)]);
    await su(`update vaillants set created_at = $2 where patro_id = $1`, [patro, ilYa(n)]);
    await su(`update auth.users set last_sign_in_at = $2 where id = $1`, [dir, ilYa(n)]);
  };

  // A vit : un foyer, une enfant, une fiche provisoire, un archivé, une séance il y a trois jours, l'appel, une validation, une famille.
  must(await comme(A, `select creer_foyers(array['Les Aigles'], 'corps')`), 'foyer');
  const anne = await enfant(pa, 'Anne');
  await enfant(pa, 'Archibald'); await su(`update vaillants set archive_le = now() where patro_id=$1 and prenom='Archibald'`, [pa]);
  await enfant(pa, 'Provisoire'); await su(`update vaillants set provisoire = true where patro_id=$1 and prenom='Provisoire'`, [pa]);
  const sa = (await su(`insert into seances (patro_id, date, titre) values ($1, current_date - 3, 'Séance') returning id`, [pa]))[0].id;
  await su(`insert into presences (patro_id, seance_id, vaillant_id, present) values ($1,$2,$3,true)`, [pa, sa, anne]);
  const obj = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=7 order by ordre limit 1`, [pa]))[0].id;
  must(await comme(A, `select valider_objectif($1,$2,gen_random_uuid(),now())`, [anne, obj]), 'validation');
  const famille = (await su(`insert into parents (patro_id, nom, auth_id) values ($1,'Famille Anne',$2) returning id`, [pa, PARENT]))[0].id;
  must(await comme(A, `select set_pin('parent', $1, '1234')`, [famille]), 'code de la famille');
  await su(`update auth.users set last_sign_in_at = now() where id = $1`, [A]);

  // B : fondé, rien d'autre. C : un enfant et une séance, tout date de 29 jours.
  const cyprien = await enfant(pc, 'Cyprien');
  const sc = (await su(`insert into seances (patro_id, date, titre) values ($1, current_date - 29, 'Séance') returning id`, [pc]))[0].id;
  await silence(pc, C, 29);

  // ── Qui lit ──
  const s = await suivi();
  note('la plateforme lit le suivi des cinq patros', s.patros.length === 5, String(s.patros.length));
  note('un directeur ne lit pas le suivi', !!(await comme(A, `select plateforme_suivi()`)).erreur?.includes('Réservé'));
  note('un anonyme ne lit pas le suivi : la fonction ne lui est pas accordée', !!(await comme(null, `select plateforme_suivi()`, [], 'anon')).erreur?.includes('permission denied'));
  note('le signe de vie est fermé à la lecture', !!(await comme(A, `select * from patros_passages`)).erreur?.includes('permission denied'));
  note('un anonyme ne note pas de signe de vie', !!(await comme(null, `select noter_passage()`, [], 'anon')).erreur?.includes('permission denied'));
  await comme(PARENT, `select noter_passage()`);
  note('une famille ne note pas de signe de vie pour le patro', (await su(`select count(*)::int n from patros_passages`))[0].n === 0);

  // ── Le signal ──
  const ete = s.pause_ete;
  note('A, qui vit, est actif', carte(s, pa).signal === 'actif', carte(s, pa).signal);
  note('B, fondé sans rien, n’a pas démarré', carte(s, pb).signal === 'pas_demarre', carte(s, pb).signal);
  note('C, silencieux depuis 29 jours, est à relancer', carte(s, pc).signal === (ete ? 'en_pause' : 'a_relancer'), carte(s, pc).signal);
  const RANG = { a_relancer: 1, pas_demarre: 2, actif: 3, en_pause: 4 };
  const rangs = s.patros.map(p => RANG[p.signal]);
  note('à relancer d’abord, puis pas démarré, puis actif',
    rangs.every((r, i) => i === 0 || rangs[i - 1] <= r) && new Set(rangs).size >= 3,
    s.patros.map(p => `${p.nom} ${p.signal}`).join(' · '));
  note('C dit ses jours de silence', carte(s, pc).jours_sans_activite === 29, String(carte(s, pc).jours_sans_activite));

  // Le seuil : 28 jours tout juste, c'est encore actif ; un patro du samedi passe ses petites vacances (audit, SF3).
  await silence(pc, C, 28);
  await su(`update seances set date = current_date - 28 where id = $1`, [sc]);
  note('à 28 jours de silence, encore actif', (await signal(pc)) === 'actif');
  await silence(pc, C, 29);

  // Une date écrite dans le futur ne compte pas (audit, SF2).
  must(await comme(C, `update seances set created_at = '2099-01-01' where patro_id = $1 returning id`, [pc]), 'séance postdatée');
  note('une séance « créée » en 2099 ne réveille pas un patro', (await signal(pc)) === (ete ? 'en_pause' : 'a_relancer'));
  await silence(pc, C, 29);

  // Les gestes du quotidien comptent (audit, SF1) : une feuille d'appel imprimée hier.
  const feuille = (await su(`insert into feuilles_appel (patro_id, seance_id, code, ordre, imprimee_le) values ($1,$2,424,array[$3]::uuid[],$4) returning id`, [pc, sc, cyprien, ilYa(1)]))[0].id;
  note('une feuille d’appel imprimée hier rend le patro actif', (await signal(pc)) === 'actif');
  await su(`delete from feuilles_appel where id = $1`, [feuille]);
  // … une réponse de famille.
  await su(`insert into inscriptions (patro_id, seance_id, vaillant_id, present, repondu_le) values ($1,$2,$3,true,$4)`, [pc, sc, cyprien, ilYa(2)]);
  note('une réponse de famille rend le patro actif', (await signal(pc)) === 'actif');
  await su(`delete from inscriptions where patro_id = $1`, [pc]);
  // … et l'équipe qui ouvre l'application, session gardée ouverte.
  note('avant tout signe de vie, C reste à relancer', (await signal(pc)) === (ete ? 'en_pause' : 'a_relancer'));
  must(await comme(C, `select noter_passage()`), 'signe de vie');
  const sv = carte(await suivi(), pc);
  note('l’équipe qui ouvre l’application rend le patro actif', sv.signal === 'actif' && sv.jours_sans_activite === 0, `${sv.signal} ${sv.jours_sans_activite}`);
  note('un signe de vie par patro et par jour', !(await comme(C, `select noter_passage()`)).erreur
    && (await su(`select count(*)::int n from patros_passages where patro_id = $1`, [pc]))[0].n === 1);
  await su(`delete from patros_passages where patro_id = $1`, [pc]);

  // L'été (audit, SF4). D a vécu jusqu'au 20 juin : en pause le 1er août et jusqu'au 30 septembre.
  // E s'est arrêté en mai : à relancer, même l'été.
  const an = new Date().getFullYear() - 1;
  const ed = await enfant(pd, 'Delphine', `${an}-06-10 12:00+02`);
  await su(`insert into seances (patro_id, date, titre, created_at) values ($1, $2, 'Séance', $3)`, [pd, `${an}-06-20`, `${an}-06-01 12:00+02`]);
  await su(`insert into presences (patro_id, seance_id, vaillant_id, present, saisi_le) select $1, id, $2, true, $3 from seances where patro_id = $1`, [pd, ed, `${an}-06-20 17:00+02`]);
  await enfant(pe, 'Émile', `${an}-05-01 12:00+02`);
  await su(`insert into seances (patro_id, date, titre, created_at) values ($1, $2, 'Séance', $3)`, [pe, `${an}-05-10`, `${an}-05-01 12:00+02`]);
  const aout = await suivi(`${an}-08-01`);
  note('l’été, un patro qui a vécu jusqu’en juin est en pause', aout.pause_ete === true && carte(aout, pd).signal === 'en_pause', carte(aout, pd).signal);
  note('l’été, un patro arrêté avant juin est à relancer', carte(aout, pe).signal === 'a_relancer', carte(aout, pe).signal);
  note('la pause tient jusqu’au 30 septembre', (await signal(pd, `${an}-09-30`)) === 'en_pause');
  note('le 1er octobre, sans reprise, à relancer', (await signal(pd, `${an}-10-01`)) === 'a_relancer');
  note('un jour de référence ignore ce qui vient après lui', carte(aout, pa).derniere_activite === null || carte(aout, pa).derniere_activite <= `${an}-08-01`, carte(aout, pa).derniere_activite);

  // ── Les chiffres ──
  const a = carte(s, pa);
  note('A : les enfants inscrits, provisoires compris, sans l’archivé', a.enfants === 2, String(a.enfants));
  note('A : équipe, famille, séance du mois', a.equipe === 1 && a.familles === 1 && a.seances_30j === 1, JSON.stringify([a.equipe, a.familles, a.seances_30j]));
  note('A : une famille avec un compte et un code compte une fois', a.familles === 1, String(a.familles));
  note('A : son appel et son ouverture sont datés', !!a.dernier_appel && !!a.derniere_ouverture && !!a.derniere_seance);
  note('A (MV) : ses foyers et ses validations du mois', a.foyers === 1 && a.validations_30j === 1, JSON.stringify([a.foyers, a.validations_30j]));
  note('B : une date absente reste absente, pas zéro', carte(s, pb).derniere_activite === null && carte(s, pb).jours_sans_activite === null && carte(s, pb).derniere_ouverture === null);
  note('B (Patronage) : le jeu ne se compte pas', carte(s, pb).foyers === null && carte(s, pb).validations_30j === null);
  note('la mise en route compte 10 étapes en MV, 8 en Patronage',
    a.mise_en_route.total === 10 && carte(s, pb).mise_en_route.total === 8, `${a.mise_en_route.total} / ${carte(s, pb).mise_en_route.total}`);
  note('les étapes arrivent dans l’ordre de l’écran du directeur',
    a.mise_en_route.etapes.map(e => e.cle).join() === ORDRE.join(), a.mise_en_route.etapes.map(e => e.cle).join());
  note('A a fait ses étapes foyers, enfants, séance, familles',
    ['foyers', 'enfants', 'seance', 'familles'].every(k => etape(a, k) === true) && etape(a, 'identite') === false,
    JSON.stringify(a.mise_en_route.etapes));

  // ── Rien d'une personne ──
  const texte = JSON.stringify(s);
  const nom = /Anne|Cyprien|Archibald|Delphine|Émile|Famille|@banc|Banc/;
  note('aucun prénom, aucun nom de famille, aucune adresse', !nom.test(texte), texte.match(nom)?.[0]);
  const hors = s.patros.flatMap(p => Object.keys(p).filter(k => !CLES.has(k)));
  note('une carte ne porte que les clés prévues', hors.length === 0, hors.join());

  // ── La double authentification : tous les directeurs (audit, E5) ──
  await su(`insert into auth.users (id, email) values ($1, 'codir@banc.test')`, [CODIR]);
  await su(`insert into profils (id, patro_id, prenom, nom, role) values ($1, $2, 'Co', 'Directeur', 'directeur')`, [CODIR, pa]);
  await su(`insert into auth.mfa_factors (user_id, status, factor_type) values ($1, 'verified', 'totp')`, [CODIR]);
  note('un codirecteur protégé ne suffit pas à cocher l’étape', etape(carte(await suivi(), pa), 'mfa') === false);
  await su(`insert into auth.mfa_factors (user_id, status, factor_type) values ($1, 'verified', 'totp')`, [A]);
  note('tous les directeurs protégés : étape faite', etape(carte(await suivi(), pa), 'mfa') === true);

  // ── Le forfait change, le suivi suit ; une validation passée reste de la vie (audit, SF6) ──
  await su(`update seances set created_at = $2 where patro_id = $1`, [pa, ilYa(40)]);
  await su(`update vaillants set created_at = $2 where patro_id = $1`, [pa, ilYa(40)]);
  await su(`update presences set saisi_le = $2 where patro_id = $1`, [pa, ilYa(40)]);
  await su(`update auth.users set last_sign_in_at = $2 where id in ($1, $3)`, [A, ilYa(40), CODIR]);
  await su(`update seances set date = current_date - 40 where patro_id = $1`, [pa]);
  note('A ne vit plus que par sa validation du jour : actif', (await signal(pa)) === 'actif');
  must(await comme(ADMIN, `select changer_forfait($1, 'patronage')`, [pa]), 'changement');
  const sp = carte(await suivi(), pa);
  note('A passé en Patronage : ses foyers ne se comptent plus', sp.foyers === null && sp.validations_30j === null && sp.mise_en_route.total === 8);
  note('… et changer de forfait ne fait pas sonner l’alarme', sp.signal === 'actif', sp.signal);

  // ── Un patro qui ne démarre jamais remonte au bout d'un mois (audit, SF5) ──
  await su(`update patros set created_at = now() - interval '40 days' where id = $1`, [pb]);
  note('fondé il y a 40 jours sans rien : à relancer', (await signal(pb)) === 'a_relancer');
  return R;
}

const defait = (...paires) => {
  let sql = SQL070;
  for (let i = 0; i < paires.length; i += 2) {
    if (sql.split(paires[i]).length !== 2) throw new Error('mutant introuvable : ' + paires[i]);
    sql = sql.replace(paires[i], paires[i + 1]);
  }
  return sql;
};
const MUTANTS = [
  ['sans la garde de la plateforme', defait('if not est_admin_plateforme() then', 'if false then'), 'un directeur ne lit pas le suivi'],
  ['accordée aux anonymes', `grant execute on function plateforme_suivi(date) to anon`, 'un anonyme ne lit pas le suivi : la fonction ne lui est pas accordée'],
  ['signe de vie ouvert', `grant select on patros_passages to authenticated; create policy tout on patros_passages for select to authenticated using (true)`, 'le signe de vie est fermé à la lecture'],
  ['seuil à 21 jours', defait('v_seuil constant int := 28;', 'v_seuil constant int := 21;'), 'à 28 jours de silence, encore actif'],
  ['seuil compté étroit', defait("v_jour - c.derniere_activite <= v_seuil then 'actif'", "v_jour - c.derniere_activite < v_seuil then 'actif'"), 'à 28 jours de silence, encore actif'],
  ['date future comptée', defait('    ) t where d <= v_jour) as dernier_geste', '    ) t) as dernier_geste'), 'une séance « créée » en 2099 ne réveille pas un patro'],
  ['feuille d’appel oubliée', defait("              union all select (f.imprimee_le at time zone 'Europe/Paris')::date from feuilles_appel f where f.patro_id = p.id\n", ''), 'une feuille d’appel imprimée hier rend le patro actif'],
  ['réponses des familles oubliées', defait("              union all select (i.repondu_le at time zone 'Europe/Paris')::date from inscriptions i where i.patro_id = p.id\n", ''), 'une réponse de famille rend le patro actif'],
  ['signe de vie ignoré', defait('(select max(g.jour) from patros_passages g where g.patro_id = p.id and g.jour <= v_jour)', 'null::date'), 'l’équipe qui ouvre l’application rend le patro actif'],
  ['sans la pause d’été', defait('v_ete   := v_jour between', 'v_ete   := false and v_jour between'), 'l’été, un patro qui a vécu jusqu’en juin est en pause'],
  ['pause aveugle à juin', defait("when v_ete and c.derniere_activite >= v_juin then 'en_pause'", "when v_ete then 'en_pause'"), 'l’été, un patro arrêté avant juin est à relancer'],
  ['pause qui finit au 31 août', defait('make_date(v_annee, 9, 30)', 'make_date(v_annee, 8, 31)'), 'la pause tient jusqu’au 30 septembre'],
  ['validation masquée en Patronage', defait("              union all select (x.valide_le at time zone 'Europe/Paris')::date from validations x where x.patro_id = p.id\n", ''), '… et changer de forfait ne fait pas sonner l’alarme'],
  ['le jeu compté en Patronage', defait("'foyers', case when s.jeu then s.nb_foyers end", "'foyers', s.nb_foyers"), 'B (Patronage) : le jeu ne se compte pas'],
  ['les provisoires oubliés', defait('where v.patro_id = p.id and v.archive_le is null)::int as enfants', 'where v.patro_id = p.id and v.archive_le is null and not v.provisoire)::int as enfants'), 'A : les enfants inscrits, provisoires compris, sans l’archivé'],
  ['les archivés comptés', defait('where v.patro_id = p.id and v.archive_le is null)::int as enfants', 'where v.patro_id = p.id)::int as enfants'), 'A : les enfants inscrits, provisoires compris, sans l’archivé'],
  ['une famille comptée deux fois', defait(
    "(select count(*) from parents x where x.patro_id = p.id\n               and (x.auth_id",
    "((select count(*) from parents x where x.patro_id = p.id\n               and (x.auth_id",
    "m.sujet_id = x.id)))::int as familles",
    "m.sujet_id = x.id))) + (select count(*) from mv_pins m where m.patro_id = p.id and m.sujet_type = 'parent'))::int as familles"), 'A : une famille avec un compte et un code compte une fois'],
  ['un seul directeur suffit', defait(
    "and not exists (select 1 from profils x where x.patro_id = p.id and x.role = 'directeur'\n                              and not exists",
    "and exists (select 1 from profils x where x.patro_id = p.id and x.role = 'directeur'\n                              and exists"), 'un codirecteur protégé ne suffit pas à cocher l’étape'],
  ['étapes triées par nom', defait('order by e.rang))', 'order by e.cle))'), 'les étapes arrivent dans l’ordre de l’écran du directeur'],
  ['un prénom qui fuit', defait("'forfait', s.forfait,", "'forfait', s.forfait, 'directeur', (select string_agg(prenom || ' ' || coalesce(nom, ''), ',') from vaillants where patro_id = s.id),"), 'aucun prénom, aucun nom de famille, aucune adresse'],
  ['une clé de trop', defait("'forfait', s.forfait,", "'forfait', s.forfait, 'slug', (select slug from patros where id = s.id),"), 'une carte ne porte que les clés prévues'],
  ['ordre alphabétique', defait("order by case s.signal when 'a_relancer' then 1", "order by s.nom, case s.signal when 'a_relancer' then 1"), 'à relancer d’abord, puis pas démarré, puis actif'],
  ['pas démarré éternel', defait("case when v_jour - c.fonde_jour > v_seuil then 'a_relancer' else 'pas_demarre' end", "'pas_demarre'"), 'fondé il y a 40 jours sans rien : à relancer'],
  ['pas démarré oublié', defait("when c.seances_total = 0 and c.enfants = 0 then", "when false then"), 'B, fondé sans rien, n’a pas démarré'],
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
