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

-- Les validations ont leur garde à elles : rendre un enfant depuis la
-- corbeille (063) lui rend ses validations d'avant, et ce geste-là ne
-- doit jamais être refusé. On le reconnaît à ce que la fiche est encore
-- dans la corbeille au moment où ses lignes reviennent (063:593 ne la
-- retire qu'à la fin).
create or replace function validations_jeu_reserve_au_forfait_mv()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if forfait_de(new.patro_id) = 'patronage'
     and not exists (select 1 from vaillants_corbeille c
                      where c.vaillant_id = new.vaillant_id and c.patro_id = new.patro_id) then
    raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $fn$;
revoke all on function validations_jeu_reserve_au_forfait_mv() from public, anon, authenticated;

drop trigger if exists validations_forfait_trg on validations;
create trigger validations_forfait_trg
  before insert on validations
  for each row execute function validations_jeu_reserve_au_forfait_mv();

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

-- Vrai pour une requête venue de l'API (PostgREST pose
-- `request.jwt.claims` sur chacune), faux pour la tâche de nuit.
create or replace function appel_de_l_api()
returns boolean
language sql stable set search_path = public as $fn$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '') <> ''
$fn$;
revoke all on function appel_de_l_api() from public, anon, authenticated;


-- Un enfant n'entre pas dans un foyer et ne devient pas grand frère ;
-- il n'en sort pas non plus, pour que le jeu en sommeil revienne tel
-- quel. Tout le reste de la fiche se modifie comme avant.
--
-- Trois gestes utiles passent toujours :
--   · archiver : l'enfant quitte son foyer, qui est gardé en mémoire
--     dans `archive_foyer` (055:205) ;
--   · réintégrer : il retrouve ce foyer-là, et aucun autre (055:240) ;
--   · rendre depuis la corbeille : la fiche revient entière (063:423).
create or replace function vaillants_jeu_reserve_au_forfait_mv()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare v_refus constant text := 'Ce geste appartient au forfait Maisons Vaillantes.';
begin
  if forfait_de(new.patro_id) <> 'patronage' then return new; end if;
  if exists (select 1 from vaillants_corbeille c
              where c.vaillant_id = new.id and c.patro_id = new.patro_id) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.foyer_id is not null or coalesce(new.est_grand_frere, false) then
      raise exception '%', v_refus using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  -- Entrer.
  if new.foyer_id is not null and new.foyer_id is distinct from old.foyer_id
     and not (old.archive_le is not null and new.foyer_id is not distinct from old.archive_foyer) then
    raise exception '%', v_refus using errcode = 'insufficient_privilege';
  end if;
  if coalesce(new.est_grand_frere, false) and not coalesce(old.est_grand_frere, false) then
    raise exception '%', v_refus using errcode = 'insufficient_privilege';
  end if;

  -- Sortir : figé pour un geste venu de l'API, sauf l'archivage. La
  -- cascade (un foyer effacé avec son patro) passe : second niveau.
  if pg_trigger_depth() = 1 and appel_de_l_api()
     and not (new.archive_le is not null and old.archive_le is null)
     and ((old.foyer_id is not null and new.foyer_id is null)
       or (coalesce(old.est_grand_frere, false) and not coalesce(new.est_grand_frere, false))) then
    raise exception '%', v_refus using errcode = 'insufficient_privilege';
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

-- ─── Le verrou, troisième couche : ce qui dort ne se défait pas ──
-- Un patro qui passe de « mv » à « patronage » garde tout son jeu en
-- sommeil : foyers, responsables, validations. La promesse faite à
-- l'écran de la plateforme est que « tout revient tel quel ». Les deux
-- premières couches empêchent d'ajouter ; celle-ci empêche de retirer.
--
-- Deux retraits doivent pourtant toujours passer :
--   · la cascade : effacer un enfant, une famille, un éducateur ou le
--     patro emporte ses lignes de jeu (droit à l'effacement) ;
--   · la tâche de nuit : `purger_automatique` réduit les fiches
--     archivées à l'échéance.
-- La cascade se reconnaît à la profondeur du déclencheur (la clé
-- étrangère agit par un déclencheur : on est alors au second niveau).
-- La tâche de nuit se reconnaît à ce qu'elle ne vient pas de l'API :
-- PostgREST pose `request.jwt.claims` sur chaque requête, pg_cron jamais.
create or replace function jeu_fige_au_forfait_patronage()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if pg_trigger_depth() = 1 and appel_de_l_api()
     and forfait_de(old.patro_id) = 'patronage' then
    raise exception 'Ce geste appartient au forfait Maisons Vaillantes.'
      using errcode = 'insufficient_privilege';
  end if;
  return old;
end $fn$;
revoke all on function jeu_fige_au_forfait_patronage() from public, anon, authenticated;

drop trigger if exists validations_fige_trg on validations;
create trigger validations_fige_trg
  before delete on validations
  for each row execute function jeu_fige_au_forfait_patronage();

drop trigger if exists foyers_fige_trg on foyers;
create trigger foyers_fige_trg
  before delete on foyers
  for each row execute function jeu_fige_au_forfait_patronage();

drop trigger if exists foyers_responsables_fige_trg on foyers_responsables;
create trigger foyers_responsables_fige_trg
  before delete on foyers_responsables
  for each row execute function jeu_fige_au_forfait_patronage();

drop trigger if exists droits_valider_tous_fige_trg on droits_valider_tous;
create trigger droits_valider_tous_fige_trg
  before delete on droits_valider_tous
  for each row execute function jeu_fige_au_forfait_patronage();

-- ─── Le verrou, quatrième couche : les lectures du jeu ───────────
-- Cinq fonctions rendent le jeu à l'écran en passant au-dessus des
-- politiques (elles sont DEFINER) : le classement, les objectifs d'un
-- enfant vus par sa famille (par compte, par code), l'espace du grand
-- frère et sa feuille de validation. Chacune est reprise de sa dernière
-- définition dans le dépôt, au caractère près, avec une seule ligne de
-- garde. En forfait « patronage » elles ne rendent rien, sans erreur :
-- un écran qui les appellerait encore reste vide plutôt que cassé.
--
-- Ne sont PAS masquées, et c'est voulu : `exporter_patro` et
-- `parent_mes_donnees`. Ce sont les exports du droit d'accès ; une
-- famille et un directeur ont droit à tout ce qui est tenu sur eux, jeu
-- en sommeil compris.

-- classement_foyers : reprise de 050_progression_et_validation.sql:493, une garde ajoutée.
create or replace function classement_foyers(
  p_axe text default null, p_maison text default null, p_depuis date default null)
returns table(foyer_id uuid, foyer_nom text, maison maison_enum,
              membres bigint, acquis bigint, possibles bigint, part numeric)
language sql stable security definer set search_path = public as $fn$
  with membres as (
    select v.id, v.foyer_id, v.age_progression
      from vaillants v
     where v.patro_id = current_patro_id()
       and v.foyer_id is not null
       and (p_maison is null or v.maison::text = p_maison)
  ),
  possibles as (
    select m.foyer_id, count(o.id) as n
      from membres m
      join objectifs o
        on o.patro_id = current_patro_id()
       and o.cible = 'vaillant' and o.actif
       and o.age_cible = m.age_progression
       and (p_axe is null or o.axe = p_axe)
     group by m.foyer_id
  ),
  acquis as (
    select m.foyer_id, count(*) as n
      from membres m
      join validations val on val.vaillant_id = m.id
      join objectifs o on o.id = val.objectif_id
                      and o.actif and o.age_cible = m.age_progression
     where (p_axe is null or o.axe = p_axe)
       and (p_depuis is null or val.valide_le >= p_depuis)
     group by m.foyer_id
  )
  select f.id, f.nom, f.maison,
         (select count(*) from membres m where m.foyer_id = f.id),
         coalesce(a.n, 0),
         coalesce(p.n, 0),
         case when coalesce(p.n, 0) = 0 then 0
              else round(100.0 * coalesce(a.n, 0) / p.n, 1) end
    from foyers f
    left join possibles p on p.foyer_id = f.id
    left join acquis    a on a.foyer_id = f.id
   where f.patro_id = current_patro_id()
     and not jeu_ferme()                     -- 069 : rien en forfait « patronage »
     and (p_maison is null or f.maison::text = p_maison)
   order by 7 desc, 5 desc, f.nom
$fn$;

-- parent_objectifs_enfant : reprise de 022_comptes_parents.sql:107, une garde ajoutée.
create or replace function parent_objectifs_enfant(p_vaillant uuid)
returns table(objectif_id uuid, axe text, libelle text,
              valide boolean, valide_le timestamptz)
language plpgsql stable security definer set search_path = public as $fn$
declare v_parent uuid := parent_de_session(); v_patro uuid; v_age int;
begin
  -- Le rattachement est revérifié ici : un parent authentifié qui devine
  -- l'identifiant d'un autre enfant ne doit rien obtenir.
  select patro_id, age_progression into v_patro, v_age
    from vaillants where id = p_vaillant and parent_id = v_parent;
  if v_patro is null then
    raise exception 'Cet enfant n''est pas rattaché à votre compte.'
      using errcode = 'insufficient_privilege';
  end if;
  if forfait_de(v_patro) = 'patronage' then return; end if;   -- 069

  return query
    select o.id, o.axe, o.libelle, (val.id is not null), val.valide_le
    from objectifs o
    left join validations val
      on val.objectif_id = o.id and val.vaillant_id = p_vaillant
    where o.patro_id = v_patro and o.cible = 'vaillant' and o.age_cible = v_age
    order by o.ordre;
end $fn$;

-- get_objectifs_enfant_parent : reprise de 047_pin_compteur_et_patro.sql:309, une garde ajoutée.
create or replace function get_objectifs_enfant_parent(p_vaillant uuid, p_parent uuid, p_pin text)
returns table(
  objectif_id uuid, axe text, libelle text, valide boolean, valide_le timestamptz
) language plpgsql security definer set search_path = public, extensions as $fn$
declare v_patro uuid; v_age int;
begin
  -- La variante qui COMPTE (constat a), et aucun raise après un échec.
  if not verifier_pin_compte('parent', p_parent, p_pin) then
    return;
  end if;
  select patro_id, age_progression into v_patro, v_age
    from vaillants
   where id = p_vaillant and parent_id = p_parent
     and patro_id = pin_patro_du_sujet('parent', p_parent);
  if v_patro is null then
    raise exception 'Cet enfant n''est pas rattaché à ce parent.' using errcode = 'no_data_found';
  end if;
  if forfait_de(v_patro) = 'patronage' then return; end if;   -- 069

  return query
    select o.id, o.axe, o.libelle,
           (val.id is not null), val.valide_le
    from objectifs o
    left join validations val on val.objectif_id = o.id and val.vaillant_id = p_vaillant
    where o.patro_id = v_patro and o.cible = 'vaillant' and o.age_cible = v_age
    order by o.ordre;
end $fn$;

-- get_espace_grand_frere : reprise de 047_pin_compteur_et_patro.sql:261, une garde ajoutée.
create or replace function get_espace_grand_frere(p_vaillant uuid, p_pin text)
returns table(
  foyer_id uuid, foyer_nom text, foyer_maison maison_enum,
  membre_id uuid, membre_prenom text, membre_nom text,
  membre_age int, membre_palier palier_vaillant, membre_points int,
  membre_bapteme boolean, membre_communion boolean, membre_confirmation boolean,
  membre_rdv boolean, est_chef_foyer boolean, membre_nb_validations bigint
) language plpgsql security definer set search_path = public, extensions as $fn$
declare v_patro uuid;
begin
  if not verifier_pin_compte('grand_frere', p_vaillant, p_pin) then
    return;
  end if;
  v_patro := pin_patro_du_sujet('grand_frere', p_vaillant);
  if forfait_de(v_patro) = 'patronage' then return; end if;   -- 069
  return query
    select f.id, f.nom, f.maison,
           v.id, v.prenom, v.nom,
           v.age_progression, v.palier, v.total_points,
           v.sacrement_bapteme, v.sacrement_communion, v.sacrement_confirmation,
           v.rdv, (v.id = f.cf_id),
           (select count(*) from validations val where val.vaillant_id = v.id)
    from foyers f
    join vaillants v on v.foyer_id = f.id and v.patro_id = v_patro
    where f.gf_id = p_vaillant and f.gf_type = 'vaillant' and f.patro_id = v_patro;
end $fn$;

-- espace_validation_grand_frere : reprise de 052_fiche_provisoire.sql:332, une garde ajoutée.
create or replace function espace_validation_grand_frere(p_gf uuid, p_pin text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $fn$
declare v_patro uuid; v_seance uuid;
begin
  if not verifier_pin_compte('grand_frere', p_gf, p_pin) then
    return null;
  end if;
  v_patro := pin_patro_du_sujet('grand_frere', p_gf);
  if forfait_de(v_patro) = 'patronage' then                   -- 069
    return jsonb_build_object('seance', null, 'foyers', '[]'::jsonb);
  end if;

  -- Un grand frère dont la fiche est encore provisoire ne valide personne (§7).
  if exists (select 1 from vaillants where id = p_gf and provisoire) then
    return jsonb_build_object('seance', null, 'foyers', '[]'::jsonb, 'gf_provisoire', true);
  end if;

  select id into v_seance from seances
   where patro_id = v_patro and date <= current_date
   order by date desc limit 1;

  return jsonb_build_object(
    'seance', v_seance,
    'foyers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nom', f.nom, 'maison', f.maison,
        'membres', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', e.id, 'prenom', e.prenom, 'nom', e.nom, 'age', e.age_progression,
            'maison', e.maison, 'palier', e.palier, 'provisoire', e.provisoire, 'badges', e.badges_acquis,
            'total', c.total, 'acquis', c.acquis,
            'bronze', case when c.total > 0 then (4 * c.total + 9) / 10 end,
            'argent', case when c.total > 0 then (7 * c.total + 9) / 10 end,
            'present', (select p.present from presences p where p.seance_id = v_seance and p.vaillant_id = e.id),
            'objectifs', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', o.id, 'axe', o.axe, 'libelle', o.libelle, 'points', o.points,
                'valide', val.id is not null,
                'par_moi', val.valide_par_gf = p_gf,
                'valide_le', val.valide_le) order by o.ordre)
                from objectifs o
                left join validations val on val.objectif_id = o.id and val.vaillant_id = e.id
               where o.patro_id = v_patro and o.cible = 'vaillant' and o.actif
                 and o.age_cible = e.age_progression), '[]'::jsonb))
            order by e.prenom)
            from vaillants e
            cross join lateral compte_progression(e.id, e.age_progression) c
           where e.foyer_id = f.id and e.patro_id = v_patro and e.id <> p_gf), '[]'::jsonb))
        order by f.nom)
        from foyers f
       where f.patro_id = v_patro and f.gf_type = 'vaillant' and f.gf_id = p_gf), '[]'::jsonb));
end $fn$;


-- ─── La plateforme : inviter avec un forfait, lire les forfaits ──
-- Une invitation et son forfait naissent dans le même geste : en deux
-- appels, un second appel raté laisserait l'invitation au défaut « mv »,
-- c'est-à-dire plus que ce qui a été convenu. `autoriser_acces` (037:112)
-- n'est pas réécrite ; elle vérifie elle-même le droit de l'appelant.
create or replace function inviter_patro(p_email text, p_note text, p_forfait forfait_patro)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  perform autoriser_acces(p_email, p_note);
  update acces_autorises set forfait = p_forfait
   where email = lower(trim(p_email)) and utilise_le is null;
end $fn$;
revoke all on function inviter_patro(text, text, forfait_patro) from public, anon;
grant execute on function inviter_patro(text, text, forfait_patro) to authenticated;

-- Ce que l'écran de la plateforme lit : le forfait de chaque invitation
-- ouverte, et la liste des patros avec le leur. Un nom, une ville, une
-- date : rien d'une personne du patro, aucun enfant.
create or replace function plateforme_forfaits()
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object('email', a.email, 'forfait', a.forfait))
        from acces_autorises a where a.utilise_le is null), '[]'::jsonb),
    'patros', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nom', p.nom, 'ville', p.ville,
               'fonde_le', p.created_at, 'forfait', forfait_de(p.id))
             order by p.created_at desc)
        from patros p), '[]'::jsonb));
end $fn$;
revoke all on function plateforme_forfaits() from public, anon;
grant execute on function plateforme_forfaits() to authenticated;
