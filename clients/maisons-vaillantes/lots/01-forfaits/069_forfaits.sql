-- ════════════════════════════════════════════════════════════════
-- MAISONS VAILLANTES — Migration 069 : les deux forfaits
--
-- Un patro est en forfait « Patronage » (l'outil pour s'organiser) ou
-- en forfait « Maisons Vaillantes » (le même, plus la pédagogie : les
-- foyers, les objectifs, les validations, le classement).
--
-- Trois principes :
--   · Le forfait ne vit PAS dans `patros` : le directeur peut écrire
--     toutes les colonnes de cette table (002:37-38), et une colonne
--     qui décide d'un accès ne s'écrit jamais par le client. Il vit
--     dans `patros_forfaits`, fermée, que seule la plateforme écrit.
--   · Un patro sans ligne est en « mv » : rien ne change pour les
--     patros fondés avant cette migration, sans qu'on touche à leurs
--     données.
--   · Le verrou est dans la base. L'écran cache le jeu par confort ;
--     ce sont les gardes ci-dessous qui le ferment.
--
-- Ce que la migration ne fait pas (contrat du lot, § 3 et § 9 « limites ») :
--   · elle ne réécrit aucune fonction existante. Les gardes sont des
--     déclencheurs et des politiques restrictives, posés à côté ;
--   · elle ne masque pas les LECTURES par fonction à droits vérifiés
--     (progression_vaillants, classement_foyers, les espaces par
--     code). Un patro « patronage » n'a aucune donnée de jeu à y lire,
--     sauf s'il revient du forfait « mv » : ce cas reste à fermer ;
--   · elle laisse retirer ce qui existe (une validation, un foyer).
--     Geler aussi les retraits bloquerait les purges et l'effacement
--     d'un enfant, qui passent par les mêmes tables.
-- ════════════════════════════════════════════════════════════════

do $$ begin
  create type forfait_patro as enum ('patronage', 'mv');
exception when duplicate_object then null; end $$;

-- ─── La table : fermée, sans aucune politique ────────────────────
create table if not exists patros_forfaits (
  patro_id   uuid primary key references patros(id) on delete cascade,
  forfait    forfait_patro not null,
  change_le  timestamptz not null default now(),
  change_par uuid references auth.users(id) on delete set null
);
alter table patros_forfaits enable row level security;
revoke all on patros_forfaits from public, anon, authenticated;

-- ─── Lire le forfait ─────────────────────────────────────────────
-- Interne : reçoit un identifiant de patro, donc n'est accordée à
-- aucun rôle de l'API (leçon 036). Seuls les déclencheurs et les
-- fonctions à droits vérifiés de ce fichier l'appellent.
create or replace function forfait_de(p_patro uuid)
returns forfait_patro
language sql stable security definer set search_path = public as $fn$
  select coalesce((select forfait from patros_forfaits where patro_id = p_patro), 'mv'::forfait_patro)
$fn$;
revoke all on function forfait_de(uuid) from public, anon, authenticated;

-- Le patro de l'appelant : celui de son profil, ou celui de sa famille
-- pour un compte parent. Aucun argument : on ne peut interroger que le
-- sien.
create or replace function mon_forfait()
returns text
language sql stable security definer set search_path = public as $fn$
  select forfait_de(coalesce(
    (select patro_id from profils where id = auth.uid()),
    (select patro_id from parents where auth_id = auth.uid())
  ))::text
$fn$;
revoke all on function mon_forfait() from public, anon;
grant execute on function mon_forfait() to authenticated;

-- Vrai seulement si l'appelant appartient à un patro « patronage ».
-- Un compte sans patro (console, compte neuf) rend faux : les
-- politiques restrictives ci-dessous restent alors neutres, et ce sont
-- les politiques existantes qui décident, comme avant.
create or replace function jeu_ferme()
returns boolean
language sql stable security definer set search_path = public as $fn$
  select mon_forfait() = 'patronage'
$fn$;
revoke all on function jeu_ferme() from public, anon;
grant execute on function jeu_ferme() to authenticated;

-- ─── Changer le forfait : la plateforme seule ────────────────────
create or replace function changer_forfait(p_patro uuid, p_forfait forfait_patro)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from patros where id = p_patro) then
    raise exception 'Ce patro n''existe pas.';
  end if;
  insert into patros_forfaits (patro_id, forfait, change_par)
    values (p_patro, p_forfait, auth.uid())
  on conflict (patro_id) do update
    set forfait = excluded.forfait, change_le = now(), change_par = excluded.change_par;
end $fn$;
revoke all on function changer_forfait(uuid, forfait_patro) from public, anon;
grant execute on function changer_forfait(uuid, forfait_patro) to authenticated;

-- ─── Le forfait d'une invitation ─────────────────────────────────
-- `acces_autorises` ne s'écrit que par la plateforme (037:52-59) : la
-- colonne peut y vivre. `autoriser_acces` n'est pas réécrite ; on règle
-- le forfait d'une invitation ouverte par une fonction à part.
alter table acces_autorises
  add column if not exists forfait forfait_patro not null default 'mv';

create or replace function regler_forfait_invitation(p_email text, p_forfait forfait_patro)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  update acces_autorises set forfait = p_forfait
   where email = lower(trim(p_email)) and utilise_le is null;
  if not found then
    raise exception 'Aucune invitation ouverte pour cette adresse.';
  end if;
end $fn$;
revoke all on function regler_forfait_invitation(text, forfait_patro) from public, anon;
grant execute on function regler_forfait_invitation(text, forfait_patro) to authenticated;

-- À la fondation, le patro prend le forfait de l'invitation de celui
-- qui le fonde. `bootstrap_patro` (038:55) n'est pas réécrite : elle
-- insère le patro, ce déclencheur fait le reste. Les objectifs du
-- modèle sont copiés ensuite par `bootstrap_patro` ; ils restent en
-- sommeil, prêts pour un passage au forfait « mv ».
create or replace function patros_forfait_a_la_fondation()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_forfait forfait_patro;
begin
  select a.forfait into v_forfait
    from acces_autorises a
    join auth.users u on lower(trim(u.email)) = a.email
   where u.id = auth.uid() and a.utilise_le is null;
  if v_forfait = 'patronage' then
    insert into patros_forfaits (patro_id, forfait, change_par)
      values (new.id, 'patronage', auth.uid())
    on conflict (patro_id) do nothing;
  end if;
  return new;
end $fn$;
revoke all on function patros_forfait_a_la_fondation() from public, anon, authenticated;

drop trigger if exists patros_forfait_a_la_fondation_trg on patros;
create trigger patros_forfait_a_la_fondation_trg
  after insert on patros
  for each row execute function patros_forfait_a_la_fondation();

-- ─── Le verrou, première couche : aucun fait de jeu ne naît ──────
-- Un déclencheur vaut pour TOUS les chemins : l'écriture directe, et
-- les fonctions à droits vérifiés (creer_foyers, repartir_enfants,
-- valider_objectif, valider_objectif_gf, valider_objectif_educateur,
-- nommer_responsable, accorder_valider_tous…), sans en réécrire une.
-- Il ne teste pas `current_user` : il peut être DEFINER (leçon 046).
create or replace function jeu_reserve_au_forfait_mv()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if forfait_de(new.patro_id) = 'patronage' then
    raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $fn$;
revoke all on function jeu_reserve_au_forfait_mv() from public, anon, authenticated;

drop trigger if exists validations_forfait_trg on validations;
create trigger validations_forfait_trg
  before insert on validations
  for each row execute function jeu_reserve_au_forfait_mv();

drop trigger if exists foyers_forfait_trg on foyers;
create trigger foyers_forfait_trg
  before insert on foyers
  for each row execute function jeu_reserve_au_forfait_mv();

drop trigger if exists foyers_responsables_forfait_trg on foyers_responsables;
create trigger foyers_responsables_forfait_trg
  before insert on foyers_responsables
  for each row execute function jeu_reserve_au_forfait_mv();

drop trigger if exists droits_valider_tous_forfait_trg on droits_valider_tous;
create trigger droits_valider_tous_forfait_trg
  before insert on droits_valider_tous
  for each row execute function jeu_reserve_au_forfait_mv();

-- Un enfant n'entre pas dans un foyer et ne devient pas grand frère.
-- Seuls ces deux changements sont refusés : tout le reste de la fiche
-- (identité, famille, archive, corbeille) se modifie comme avant.
create or replace function vaillants_jeu_reserve_au_forfait_mv()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if forfait_de(new.patro_id) <> 'patronage' then return new; end if;
  if new.foyer_id is not null
     and (tg_op = 'INSERT' or new.foyer_id is distinct from old.foyer_id) then
    raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'
      using errcode = 'insufficient_privilege';
  end if;
  if coalesce(new.est_grand_frere, false)
     and (tg_op = 'INSERT' or not coalesce(old.est_grand_frere, false)) then
    raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $fn$;
revoke all on function vaillants_jeu_reserve_au_forfait_mv() from public, anon, authenticated;

drop trigger if exists vaillants_forfait_trg on vaillants;
create trigger vaillants_forfait_trg
  before insert or update of foyer_id, est_grand_frere on vaillants
  for each row execute function vaillants_jeu_reserve_au_forfait_mv();

-- ─── Le verrou, seconde couche : l'accès direct aux tables ───────
-- Des politiques RESTRICTIVES : elles s'ajoutent en « ET » aux
-- politiques existantes, qu'on ne touche donc pas. Pour un patro
-- « patronage », plus aucune ligne de jeu ne se lit ni ne s'écrit par
-- l'API, y compris celles qu'un ancien forfait « mv » aurait laissées.
drop policy if exists forfait_mv on foyers;
create policy forfait_mv on foyers as restrictive
  for all to authenticated using (not jeu_ferme()) with check (not jeu_ferme());

drop policy if exists forfait_mv on validations;
create policy forfait_mv on validations as restrictive
  for all to authenticated using (not jeu_ferme()) with check (not jeu_ferme());

drop policy if exists forfait_mv on objectifs;
create policy forfait_mv on objectifs as restrictive
  for all to authenticated using (not jeu_ferme()) with check (not jeu_ferme());

drop policy if exists forfait_mv on foyers_responsables;
create policy forfait_mv on foyers_responsables as restrictive
  for all to authenticated using (not jeu_ferme()) with check (not jeu_ferme());

drop policy if exists forfait_mv on droits_valider_tous;
create policy forfait_mv on droits_valider_tous as restrictive
  for all to authenticated using (not jeu_ferme()) with check (not jeu_ferme());

-- ─── Le forfait, pour un espace ouvert par code ──────────────────
-- Une famille ou un grand frère entré par son code n'a pas de compte :
-- `mon_forfait` ne lui répond pas. Le forfait d'un patro n'est pas un
-- secret (la page publique du patro, `patro_public`, en dit déjà le nom
-- et la ville) : on le rend pour un identifiant de patro, sans rien
-- d'autre. C'est du confort d'écran ; le verrou reste dans les gardes.
create or replace function forfait_public(p_patro uuid)
returns text
language sql stable security definer set search_path = public as $fn$
  select forfait_de(p_patro)::text
$fn$;
revoke all on function forfait_public(uuid) from public;
grant execute on function forfait_public(uuid) to anon, authenticated;
