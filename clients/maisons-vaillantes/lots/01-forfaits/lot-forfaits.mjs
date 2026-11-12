// Banc du lot « forfaits » (migration 069). Un scénario, joué sur une base
// neuve, puis rejoué sur des bases où l'on a retiré une garde : chaque
// mutant doit faire échouer l'affirmation qui le surveille.
import { monterBase, enTantQue } from '../../../../reserve/banc/socle.mjs';

const MIG = process.argv[2];
const ADMIN = 'c6df8302-85d0-4ad0-8292-f0fb7d41d35c';
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

async function scenario(db) {
  const R = {};                                   // nom → true | message d'échec
  const note = (nom, ok, detail = '') => { R[nom] = ok ? true : (detail || 'faux'); };
  const su = async (sql, p = []) => (await db.query(sql, p)).rows;
  const comme = async (uid, sql, p = []) => {
    try { return { rows: (await enTantQue(db, uid, sql, p)).rows }; }
    catch (e) { return { erreur: e.message }; }
  };
  const compte = (r) => r.erreur ? 'erreur : ' + r.erreur : r.rows?.[0]?.n;
  const refuse = (r, motif) => !!r.erreur && (!motif || r.erreur.includes(motif));
  const MV = 'forfait Maisons Vaillantes';

  await su(`insert into auth.users (id, email) values ($1, 'a@banc.test'), ($2, 'b@banc.test')`, [A, B]);
  for (const e of ['a@banc.test', 'b@banc.test']) {
    const r = await comme(ADMIN, `select autoriser_acces($1)`, [e]);
    if (r.erreur) throw new Error('préparation : ' + r.erreur);
  }
  note('admin règle le forfait d’une invitation',
    !(await comme(ADMIN, `select regler_forfait_invitation('b@banc.test', 'patronage')`)).erreur);
  note('un directeur ne règle pas une invitation',
    refuse(await comme(A, `select regler_forfait_invitation('b@banc.test', 'mv')`), 'Réservé'));

  const fa = await comme(A, `select bootstrap_patro('Patro A') id`);
  const fb = await comme(B, `select bootstrap_patro('Patro B') id`);
  if (fa.erreur || fb.erreur) throw new Error('fondation : ' + (fa.erreur || fb.erreur));
  const pa = fa.rows[0].id, pb = fb.rows[0].id;

  note('un patro fondé sans réglage est en mv', (await comme(A, `select mon_forfait() f`)).rows?.[0]?.f === 'mv');
  note('un patro fondé sur invitation patronage est en patronage',
    (await comme(B, `select mon_forfait() f`)).rows?.[0]?.f === 'patronage');
  note('aucune ligne pour un patro mv', (await su(`select count(*)::int n from patros_forfaits where patro_id=$1`, [pa]))[0].n === 0);

  // Les objectifs du modèle sont copiés dans les deux patros ; seul le mv les lit.
  const [{ n: objA }] = await su(`select count(*)::int n from objectifs where patro_id=$1`, [pa]);
  const [{ n: objB }] = await su(`select count(*)::int n from objectifs where patro_id=$1`, [pb]);
  note('les objectifs dorment dans le patro patronage', objA > 0 && objB === objA, `A=${objA} B=${objB}`);
  note('mv lit ses objectifs', (await comme(A, `select count(*)::int n from objectifs`)).rows?.[0]?.n === objA);
  note('patronage ne lit aucun objectif', (await comme(B, `select count(*)::int n from objectifs`)).rows?.[0]?.n === 0);

  // Les foyers.
  const cfa = await comme(A, `select creer_foyers(array['Les Aigles'], 'corps')`);
  note('mv crée un foyer', !cfa.erreur, cfa.erreur);
  note('patronage : creer_foyers refusé', refuse(await comme(B, `select creer_foyers(array['Les Loups'], 'corps')`), MV));
  note('patronage : insertion directe d’un foyer refusée',
    refuse(await comme(B, `insert into foyers (patro_id, maison, nom) values ($1, 'corps', 'Direct')`, [pb])));
  note('aucun foyer n’est né en patronage', (await su(`select count(*)::int n from foyers where patro_id=$1`, [pb]))[0].n === 0);

  // Un enfant par patro, posé par la base ; son âge donne ses objectifs.
  const enfant = async (patro, prenom) => (await su(
    `insert into vaillants (patro_id, prenom, nom, date_naissance, maison, age_progression, consentement_parental, consentement_date) values ($1, $2, 'Banc', (now() - interval '7 years 2 months')::date, 'corps', 7, true, now()) returning id, age_progression`,
    [patro, prenom]))[0];
  const ea = await enfant(pa, 'Anne'), eb = await enfant(pb, 'Bruno');
  // Toute fiche naît provisoire (052) et ne reçoit pas d'objectif : on les confirme.
  await su(`update vaillants set provisoire = false, confirme_le = now() where id in ($1, $2)`, [ea.id, eb.id]);
  const objectif = async (patro, age) => (await su(
    `select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=$2 order by ordre limit 1`, [patro, age]))[0]?.id;
  const oa = await objectif(pa, ea.age_progression), ob = await objectif(pb, eb.age_progression);
  if (!oa || !ob) throw new Error(`préparation : pas d'objectif pour l'âge ${ea.age_progression}`);

  const va = await comme(A, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [ea.id, oa]);
  note('mv valide un objectif', !va.erreur, va.erreur);
  note('patronage : valider_objectif refusé',
    refuse(await comme(B, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [eb.id, ob]), MV));
  note('aucune validation n’est née en patronage', (await su(`select count(*)::int n from validations where patro_id=$1`, [pb]))[0].n === 0);

  let gf; try { await su(`update vaillants set est_grand_frere = true where id=$1`, [eb.id]); gf = null; } catch (e) { gf = e.message; }
  note('patronage : pas de grand frère', !!gf && gf.includes(MV), gf || 'accepté');
  let autre; try { await su(`update vaillants set note = 'vu' where id=$1`, [eb.id]); autre = null; } catch (e) { autre = e.message; }
  note('patronage : le reste de la fiche se modifie', autre === null, autre);

  // Le forfait ne se lit ni ne s'écrit par un patro.
  note('un directeur ne change pas un forfait', refuse(await comme(A, `select changer_forfait($1, 'mv')`, [pb]), 'Réservé'));
  note('la table des forfaits est fermée', refuse(await comme(A, `select * from patros_forfaits`), 'permission denied'));
  note('on ne lit pas le forfait d’un autre patro', refuse(await comme(A, `select forfait_de($1)`, [pb]), 'permission denied'));
  note('un anonyme ne lit pas son forfait', !!(await (async () => {
    try { await enTantQue(db, null, `select mon_forfait()`, [], 'anon'); return null; } catch (e) { return e.message; } })()));

  // Un espace ouvert par code lit le forfait de son patro, et rien d'autre.
  const pub = async (patro) => { try { return (await enTantQue(db, null, `select forfait_public($1) f`, [patro], 'anon')).rows[0].f; } catch (e) { return 'erreur : ' + e.message; } };
  note('un espace par code lit le forfait de son patro', (await pub(pb)) === 'patronage' && (await pub(pa)) === 'mv', `${await pub(pb)} / ${await pub(pa)}`);

  // Le patro A passe en patronage : rien ne s'efface, tout se ferme.
  const bas = await comme(ADMIN, `select changer_forfait($1, 'patronage')`, [pa]);
  note('admin change un forfait', !bas.erreur, bas.erreur);
  note('après le passage en patronage, les foyers ne se lisent plus', (await comme(A, `select count(*)::int n from foyers`)).rows?.[0]?.n === 0);
  note('… ni les validations', (await comme(A, `select count(*)::int n from validations`)).rows?.[0]?.n === 0);
  note('… mais rien n’est effacé', (await su(`select (select count(*) from foyers where patro_id=$1)::int f, (select count(*) from validations where patro_id=$1)::int v`, [pa]))
    .every(r => r.f === 1 && r.v === 1));
  // Un AUTRE objectif : revalider le même n'écrit rien, donc ne prouverait rien.
  const oa2 = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=$2 and id <> $3 order by ordre limit 1`, [pa, ea.age_progression, oa]))[0]?.id;
  if (!oa2) throw new Error('préparation : un seul objectif pour cet âge');
  note('… et plus rien ne se valide', refuse(await comme(A, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [ea.id, oa2]), MV));
  note('… ni ne se modifie en direct', (await comme(A, `update foyers set nom = 'Autre' returning id`)).rows?.length === 0);

  // Le retour en mv retrouve tout.
  await comme(ADMIN, `select changer_forfait($1, 'mv')`, [pa]);
  note('le retour en mv retrouve les foyers', (await comme(A, `select count(*)::int n from foyers`)).rows?.[0]?.n === 1);
  note('… et les validations', (await comme(A, `select count(*)::int n from validations`)).rows?.[0]?.n === 1);

  // Effacer un enfant reste possible en patronage, validations comprises.
  await comme(ADMIN, `select changer_forfait($1, 'patronage')`, [pa]);
  let eff; try { await su(`delete from vaillants where id=$1`, [ea.id]); eff = null; } catch (e) { eff = e.message; }
  note('patronage : effacer un enfant emporte ses validations',
    eff === null && (await su(`select count(*)::int n from validations where patro_id=$1`, [pa]))[0].n === 0, eff);
  return R;
}

const MUTANTS = [
  ['sans le déclencheur des foyers', `drop trigger foyers_forfait_trg on foyers`, 'patronage : creer_foyers refusé'],
  ['sans le déclencheur des validations', `drop trigger validations_forfait_trg on validations`, 'patronage : valider_objectif refusé'],
  ['sans le déclencheur des enfants', `drop trigger vaillants_forfait_trg on vaillants`, 'patronage : pas de grand frère'],
  ['sans la politique des foyers', `drop policy forfait_mv on foyers`, 'après le passage en patronage, les foyers ne se lisent plus'],
  ['sans la politique des validations', `drop policy forfait_mv on validations`, '… ni les validations'],
  ['sans la politique des objectifs', `drop policy forfait_mv on objectifs`, 'patronage ne lit aucun objectif'],
  ['changer_forfait sans garde', `create or replace function changer_forfait(p_patro uuid, p_forfait forfait_patro) returns void language sql security definer set search_path = public as $f$ insert into patros_forfaits (patro_id, forfait) values (p_patro, p_forfait) on conflict (patro_id) do update set forfait = excluded.forfait $f$`, 'un directeur ne change pas un forfait'],
  ['table des forfaits ouverte', `grant select on patros_forfaits to authenticated; create policy tout on patros_forfaits for select to authenticated using (true)`, 'la table des forfaits est fermée'],
  ['forfait_de accordée', `grant execute on function forfait_de(uuid) to authenticated`, 'on ne lit pas le forfait d’un autre patro'],
  ['sans le déclencheur de fondation', `drop trigger patros_forfait_a_la_fondation_trg on patros`, 'un patro fondé sur invitation patronage est en patronage'],
];

let mauvais = 0;
{
  const { db, echecs } = await monterBase(MIG);
  if (echecs.length) { console.log('MIGRATIONS EN ÉCHEC', echecs); process.exit(1); }
  const R = await scenario(db);
  const ko = Object.entries(R).filter(([, v]) => v !== true);
  console.log(`Scénario : ${Object.keys(R).length - ko.length}/${Object.keys(R).length} affirmations tenues`);
  for (const [n, v] of ko) { console.log('  ÉCHEC', n, '→', v); mauvais++; }
}
for (const [nom, sql, cible] of MUTANTS) {
  const { db } = await monterBase(MIG);
  await db.exec(sql);
  let R; try { R = await scenario(db); } catch (e) { R = { [cible]: 'scénario interrompu : ' + e.message }; }
  const tue = R[cible] !== true;
  console.log(`Mutant « ${nom} » : ${tue ? 'tué' : 'SURVIT'}  (${cible})`);
  if (!tue) mauvais++;
}
process.exit(mauvais ? 1 : 0);
