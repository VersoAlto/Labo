// Banc du lot « forfaits » (migration 069). Un scénario, joué sur une base
// neuve, puis rejoué sur des bases où l'on a retiré une garde : chaque
// mutant doit faire échouer l'affirmation qui le surveille.
import { monterBase, enTantQue } from '../../../../reserve/banc/socle.mjs';

const MIG = process.argv[2];
const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

async function scenario(db, ADMIN) {
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
  note('une invitation par l’ancien chemin naît en patronage',
    (await su(`select forfait::text f from acces_autorises where email = 'a@banc.test'`))[0].f === 'patronage');
  const ra = await comme(ADMIN, `select regler_forfait_invitation('a@banc.test', 'mv')`);
  if (ra.erreur) throw new Error('préparation : ' + ra.erreur);
  note('admin règle le forfait d’une invitation',
    !(await comme(ADMIN, `select regler_forfait_invitation('b@banc.test', 'patronage')`)).erreur);
  note('un directeur ne règle pas une invitation',
    refuse(await comme(A, `select regler_forfait_invitation('b@banc.test', 'mv')`), 'Réservé'));

  const fa = await comme(A, `select bootstrap_patro('Patro A') id`);
  const fb = await comme(B, `select bootstrap_patro('Patro B') id`);
  if (fa.erreur || fb.erreur) throw new Error('fondation : ' + (fa.erreur || fb.erreur));
  const pa = fa.rows[0].id, pb = fb.rows[0].id;

  note('un patro fondé sur invitation mv est en mv', (await comme(A, `select mon_forfait() f`)).rows?.[0]?.f === 'mv');
  note('un patro fondé sur invitation patronage est en patronage',
    (await comme(B, `select mon_forfait() f`)).rows?.[0]?.f === 'patronage');

  // L'écran de la plateforme : inviter avec un forfait, lire les forfaits.
  await su(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000c', 'c@banc.test')`);
  const inv = await comme(ADMIN, `select inviter_patro('c@banc.test', 'note', 'patronage')`);
  const vue = await comme(ADMIN, `select plateforme_forfaits() j`);
  const j = vue.rows?.[0]?.j || {};
  note('la plateforme invite avec un forfait',
    !inv.erreur && (j.invitations || []).some(i => i.email === 'c@banc.test' && i.forfait === 'patronage'),
    inv.erreur || JSON.stringify(j.invitations));
  note('un directeur n’invite pas un patro',
    refuse(await comme(A, `select inviter_patro('d@banc.test', null, 'mv')`), 'Réservé'));
  note('la plateforme lit le forfait de chaque patro',
    (j.patros || []).length === 2
      && j.patros.find(p => p.id === pa)?.forfait === 'mv'
      && j.patros.find(p => p.id === pb)?.forfait === 'patronage', vue.erreur || JSON.stringify(j.patros));
  note('un directeur ne lit pas les forfaits de la plateforme',
    refuse(await comme(A, `select plateforme_forfaits()`), 'Réservé'));
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

  // De quoi éprouver le sommeil du jeu : Anne est dans le foyer, et a une seconde validation.
  const foyerA = (await su(`select id from foyers where patro_id=$1`, [pa]))[0].id;
  await su(`update vaillants set foyer_id = $1 where id = $2`, [foyerA, ea.id]);
  const oa3 = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=$2 and id <> $3 order by ordre desc limit 1`, [pa, ea.age_progression, oa]))[0]?.id;
  const va3 = await comme(A, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [ea.id, oa3]);
  if (!oa3 || va3.erreur) throw new Error('préparation : seconde validation → ' + (va3.erreur || 'pas d’objectif'));
  const oa4 = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=$2 and id <> $3 order by ordre desc offset 1 limit 1`, [pa, ea.age_progression, oa]))[0]?.id;
  const va4 = await comme(A, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [ea.id, oa4]);
  if (!oa4 || va4.erreur) throw new Error('préparation : troisième validation → ' + (va4.erreur || 'pas d’objectif'));
  await su(`update foyers set cf_id = $2 where id = $1`, [foyerA, ea.id]);
  const progression = async () => (await comme(A, `select count(*)::int n from progression_vaillants()`)).rows?.[0]?.n;
  note('mv lit sa progression', (await progression()) === 1, String(await progression()));
  // Les lectures du jeu répondent en mv : c'est ce que la bascule doit éteindre, et le retour rallumer.
  const classement = async () => (await comme(A, `select count(*)::int n from classement_foyers()`)).rows?.[0]?.n;
  note('mv lit son classement', (await classement()) === 1, String(await classement()));
  // Un geste de retrait passé par une fonction à droits élevés, comme le font devalider_interne et defaire_repartition.
  await db.exec(`create function banc_retire(p_table text, p_id uuid) returns void language plpgsql security definer set search_path = public as $f$ begin execute format('delete from %I where id = $1', p_table) using p_id; end $f$;
            grant execute on function banc_retire(text, uuid) to authenticated`);

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
    .every(r => r.f === 1 && r.v === 3));

  // Troisième couche : ce qui dort ne se défait pas.
  const uneValidation = (await su(`select id from validations where patro_id=$1 and objectif_id=$2`, [pa, oa]))[0].id;
  note('patronage : retirer une validation refusé', refuse(await comme(A, `select devalider_objectif($1)`, [uneValidation]), MV));
  note('patronage : retirer une validation par une fonction refusé', refuse(await comme(A, `select banc_retire('validations', $1)`, [uneValidation]), MV));
  note('patronage : supprimer un foyer par une fonction refusé', refuse(await comme(A, `select banc_retire('foyers', $1)`, [foyerA]), MV));
  note('patronage : sortir un enfant de son foyer refusé', refuse(await comme(A, `update vaillants set foyer_id = null where id = $1`, [ea.id]), MV));
  note('… et le jeu en sommeil est intact', (await su(`select (select count(*) from foyers where patro_id=$1)::int f, (select count(*) from validations where patro_id=$1)::int v, (select foyer_id from vaillants where id=$2) m`, [pa, ea.id]))
    .every(r => r.f === 1 && r.v === 3 && r.m === foyerA));

  // Quatrième couche : les lectures du jeu ne rendent rien.
  note('patronage ne lit plus son classement', (await classement()) === 0, String(await classement()));
  note('patronage ne lit plus sa progression', (await progression()) === 0, String(await progression()));

  // Le code d'un grand frère ne se pose ni ne se retire.
  note('patronage : poser un code de grand frère refusé', refuse(await comme(A, `select set_pin('grand_frere', $1, '123456')`, [ea.id]), MV));
  note('patronage : retirer un code de grand frère refusé', refuse(await comme(A, `select supprimer_pin('grand_frere', $1)`, [ea.id]), MV));

  // La corbeille d'abord, tant qu'Anne est chef : supprimer, puis rendre, validations et place comprises.
  const sup = await comme(A, `select mettre_a_la_corbeille(array[$1]::uuid[], gen_random_uuid())`, [ea.id]);
  const rendu = sup.erreur ? sup : await comme(A, `select restaurer_vaillants(array[$1]::uuid[])`, [ea.id]);
  note('patronage : rendre un enfant depuis la corbeille passe', !rendu.erreur
    && (await su(`select (select foyer_id from vaillants where id=$2) m, (select count(*) from validations where patro_id=$1)::int v, (select cf_id from foyers where id=$3) c`, [pa, ea.id, foyerA]))
      .every(r => r.m === foyerA && r.v === 3 && r.c === ea.id), rendu.erreur);

  // Les gestes utiles passent toujours : archiver, puis réintégrer dans le foyer d'avant.
  const arch = await comme(A, `select archiver_vaillant($1)`, [ea.id]);
  note('patronage : archiver un enfant passe', !arch.erreur
    && (await su(`select foyer_id, archive_foyer from vaillants where id=$1`, [ea.id])).every(r => r.foyer_id === null && r.archive_foyer === foyerA), arch.erreur);
  const reint = await comme(A, `select reintegrer_vaillant($1)`, [ea.id]);
  note('patronage : réintégrer un enfant passe, dans son foyer d’avant', !reint.erreur
    && (await su(`select foyer_id from vaillants where id=$1`, [ea.id]))[0].foyer_id === foyerA, reint.erreur);

  // L'archivage a libéré la place de chef : la reprendre est du jeu, donc refusé (064:250).
  const chef = await comme(A, `select defaire_repartition($1::jsonb)`, [JSON.stringify({ chefs: [{ foyer: foyerA, chef: ea.id }] })]);
  note('patronage : écrire un chef de foyer refusé',
    refuse(chef, MV) && (await su(`select cf_id from foyers where id=$1`, [foyerA]))[0].cf_id === null, chef.erreur || 'accepté');

  // La tâche de nuit (aucune requête de l'API) retire toujours : c'est la purge à l'échéance.
  let nuit; try { await su(`delete from validations where patro_id=$1 and objectif_id=$2`, [pa, oa3]); nuit = null; } catch (e) { nuit = e.message; }
  note('la tâche de nuit retire toujours une validation', nuit === null
    && (await su(`select count(*)::int n from validations where patro_id=$1`, [pa]))[0].n === 2, nuit);
  // Un AUTRE objectif : revalider le même n'écrit rien, donc ne prouverait rien.
  const oa2 = (await su(`select id from objectifs where patro_id=$1 and cible='vaillant' and actif and age_cible=$2 and id <> $3 order by ordre limit 1`, [pa, ea.age_progression, oa]))[0]?.id;
  if (!oa2) throw new Error('préparation : un seul objectif pour cet âge');
  note('… et plus rien ne se valide', refuse(await comme(A, `select valider_objectif($1, $2, gen_random_uuid(), now())`, [ea.id, oa2]), MV));
  note('… ni ne se modifie en direct', (await comme(A, `update foyers set nom = 'Autre' returning id`)).rows?.length === 0);

  // Le retour en mv retrouve tout.
  await comme(ADMIN, `select changer_forfait($1, 'mv')`, [pa]);
  note('le retour en mv retrouve les foyers', (await comme(A, `select count(*)::int n from foyers`)).rows?.[0]?.n === 1);
  note('… et les validations', (await comme(A, `select count(*)::int n from validations`)).rows?.[0]?.n === 2);
  note('un changement de forfait laisse une trace', (await su(`select count(*)::int n from action_log where patro_id=$1 and type_action='forfait_change'`, [pa]))[0].n === 2);
  note('… et le classement', (await classement()) === 1, String(await classement()));

  // Effacer un enfant reste possible en patronage, validations comprises.
  await comme(ADMIN, `select changer_forfait($1, 'patronage')`, [pa]);
  // La purge d'une fiche archivée passe même lancée par l'API : sinon, une seule fiche l'arrêterait pour tous.
  const arch2 = await comme(A, `select archiver_vaillant($1)`, [ea.id]);
  const purge = arch2.erreur ? arch2 : await comme(A, `select banc_retire('validations', $1)`, [(await su(`select id from validations where patro_id=$1 and objectif_id=$2`, [pa, oa4]))[0].id]);
  note('patronage : la purge d’un archivé passe même par l’API', !purge.erreur
    && (await su(`select count(*)::int n from validations where patro_id=$1`, [pa]))[0].n === 1, purge.erreur);
  // Réintégrée, Anne n'est plus archivée : son effacement éprouve la cascade, et elle seule.
  const reint2 = await comme(A, `select reintegrer_vaillant($1)`, [ea.id]);
  if (reint2.erreur) throw new Error('préparation : ' + reint2.erreur);
  const effa = await comme(A, `delete from vaillants where id=$1`, [ea.id]);
  const eff = effa.erreur || null;
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
  ['plateforme_forfaits sans garde', `create or replace function plateforme_forfaits() returns jsonb language sql stable security definer set search_path = public as $f$ select jsonb_build_object('patros', (select jsonb_agg(jsonb_build_object('id', id)) from patros)) $f$`, 'un directeur ne lit pas les forfaits de la plateforme'],
  ['sans le gel des validations', `drop trigger validations_fige_trg on validations`, 'patronage : retirer une validation refusé'],
  ['sans le gel des foyers', `drop trigger foyers_fige_trg on foyers`, 'patronage : supprimer un foyer par une fonction refusé'],
  ['gel aveugle à la cascade', `create or replace function validations_fige_au_forfait_patronage() returns trigger language plpgsql security definer set search_path = public as $f$ begin if appel_de_l_api() and forfait_de(old.patro_id) = 'patronage' and not exists (select 1 from vaillants v where v.id = old.vaillant_id and v.archive_le is not null) then raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'; end if; return old; end $f$`, 'patronage : effacer un enfant emporte ses validations'],
  ['gel aveugle à la tâche de nuit', `create or replace function appel_de_l_api() returns boolean language sql stable as $f$ select true $f$`, 'la tâche de nuit retire toujours une validation'],
  ['classement sans garde', `create or replace function jeu_ferme() returns boolean language sql stable security definer set search_path = public as $f$ select false $f$`, 'patronage ne lit plus son classement'],
  ['corbeille sans son passage', `drop trigger validations_forfait_trg on validations; create trigger validations_forfait_trg before insert on validations for each row execute function jeu_reserve_au_forfait_mv()`, 'patronage : rendre un enfant depuis la corbeille passe'],
  ['réintégration sans son passage', `create or replace function vaillants_jeu_reserve_au_forfait_mv() returns trigger language plpgsql security definer set search_path = public as $f$ begin if forfait_de(new.patro_id) = 'patronage' and new.foyer_id is not null and (tg_op = 'INSERT' or new.foyer_id is distinct from old.foyer_id) then raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'; end if; return new; end $f$`, 'patronage : réintégrer un enfant passe, dans son foyer d’avant'],
  ['foyers modifiables en sommeil', `drop trigger foyers_fige_maj_trg on foyers`, 'patronage : écrire un chef de foyer refusé'],
  ['gel aveugle aux archivés', `drop trigger validations_fige_trg on validations; create trigger validations_fige_trg before delete on validations for each row execute function jeu_fige_au_forfait_patronage()`, 'patronage : la purge d’un archivé passe même par l’API'],
  ['invitation qui naît en mv', `alter table acces_autorises alter column forfait set default 'mv'`, 'une invitation par l’ancien chemin naît en patronage'],
  ['sans le déclencheur de fondation', `drop trigger patros_forfait_a_la_fondation_trg on patros`, 'un patro fondé sur invitation patronage est en patronage'],
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
  console.log(`Mutant « ${nom} » : ${tue ? 'tué' : 'SURVIT'}  (${cible})`);
  if (!tue) mauvais++;
}
process.exit(mauvais ? 1 : 0);
