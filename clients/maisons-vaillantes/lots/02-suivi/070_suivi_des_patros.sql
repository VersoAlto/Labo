-- ════════════════════════════════════════════════════════════════
-- 070 · Le suivi des patros, pour la plateforme
--
-- Contrat : Labo, clients/maisons-vaillantes/lots/02-suivi-des-patros.md
-- (décisions du § 6, corrigées au § 9 après l'audit du 19 novembre).
--
-- Une fonction de lecture, réservée aux administrateurs de la
-- plateforme : pour chaque patro, des chiffres et des dates, jamais un
-- nom de personne. Le signal se calcule ici, en jours entiers ; l'écran
-- l'affiche, il ne le refait pas.
--
-- Et un signe de vie : l'application note, une fois par jour, qu'un
-- membre de l'équipe d'un patro l'a ouverte. Sans dire qui. C'est la
-- seule façon de voir une équipe qui garde sa session ouverte :
-- `auth.users.last_sign_in_at` ne bouge qu'à une vraie connexion
-- (audit, SF1).
-- ════════════════════════════════════════════════════════════════

-- ─── Le signe de vie : un patro, un jour ─────────────────────────
create table if not exists patros_passages (
  patro_id uuid not null references patros(id) on delete cascade,
  jour     date not null,
  primary key (patro_id, jour)
);
alter table patros_passages enable row level security;
revoke all on patros_passages from public, anon, authenticated;

-- Appelée par l'application à l'ouverture d'une session de l'équipe.
-- Aucun argument : on ne note que son propre patro. Garde treize mois,
-- assez pour comparer une rentrée à la précédente.
create or replace function noter_passage()
returns void
language plpgsql security definer set search_path = public as $fn$
declare
  v_patro uuid := current_patro_id();
  v_jour  date := (now() at time zone 'Europe/Paris')::date;
begin
  if v_patro is null then return; end if;
  insert into patros_passages (patro_id, jour) values (v_patro, v_jour)
  on conflict do nothing;
  delete from patros_passages where patro_id = v_patro and jour < v_jour - 400;
end $fn$;
revoke all on function noter_passage() from public, anon;
grant execute on function noter_passage() to authenticated;

-- ─── Le suivi ────────────────────────────────────────────────────
-- `p_jour` : le jour de référence, aujourd'hui (heure de Paris) par
-- défaut. Toute date d'activité postérieure est ignorée : la lecture
-- est celle de l'état à ce jour-là (audit, E7), et une date écrite dans
-- le futur par un directeur ne compte pas (audit, SF2).
create or replace function plateforme_suivi(p_jour date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_jour  date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  -- Quatre semaines : les petites vacances d'un patro du samedi en
  -- contiennent trois (audit, SF3).
  v_seuil constant int := 28;
  v_annee int;
  v_ete   boolean;
  v_juin  date;
  r       jsonb;
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  -- Du 1er juillet au 30 septembre, un patro qui a vécu jusqu'en juin est
  -- en pause. Un patro silencieux depuis avant juin ne l'est pas : il est
  -- à relancer, même l'été (audit, SF4).
  v_annee := extract(year from v_jour)::int;
  v_ete   := v_jour between make_date(v_annee, 7, 1) and make_date(v_annee, 9, 30);
  v_juin  := make_date(v_annee, 6, 1);

  with base as (
    select p.id, p.nom, p.ville, p.created_at as fonde_le,
           forfait_de(p.id)::text as forfait,
           ((p.created_at at time zone 'Europe/Paris')::date) as fonde_jour,
           -- Les fiches provisoires comptent : une inscription en ligne
           -- arrive ainsi (052, 059), et l'écran du directeur les compte.
           (select count(*) from vaillants v
             where v.patro_id = p.id and v.archive_le is null)::int as enfants,
           (select count(*) from profils x where x.patro_id = p.id)::int as equipe,
           (select count(*) from profils x where x.patro_id = p.id
               and x.diplome_abus and x.honorabilite_tam)::int as habilites,
           -- Une famille ouverte compte une fois, qu'elle ait un compte, une
           -- invitation, un code, ou plusieurs (audit, E5).
           (select count(*) from parents x where x.patro_id = p.id
               and (x.auth_id is not null or x.invite_le is not null
                    or exists (select 1 from mv_pins m where m.patro_id = p.id
                                and m.sujet_type = 'parent' and m.sujet_id = x.id)))::int as familles,
           (select count(*) from seances s where s.patro_id = p.id)::int as seances_total,
           (select count(*) from seances s where s.patro_id = p.id
               and s.date between v_jour - 29 and v_jour)::int as seances_30j,
           (select max(s.date) from seances s where s.patro_id = p.id and s.date <= v_jour) as derniere_seance,
           (select max(d) from (select (x.saisi_le at time zone 'Europe/Paris')::date d
              from presences x where x.patro_id = p.id) t where d <= v_jour) as dernier_appel,
           -- La dernière ouverture : la dernière connexion, ou le dernier
           -- signe de vie, le plus récent des deux. Une date par patro.
           greatest(
             (select max(d) from (select (u.last_sign_in_at at time zone 'Europe/Paris')::date d
                from profils x join auth.users u on u.id = x.id where x.patro_id = p.id) t where d <= v_jour),
             (select max(g.jour) from patros_passages g where g.patro_id = p.id and g.jour <= v_jour)
           ) as derniere_ouverture,
           -- Les gestes du quotidien (audit, SF1). Chacun borné au jour.
           (select max(d) from (
              select (s.created_at at time zone 'Europe/Paris')::date d from seances s where s.patro_id = p.id
              union all select (f.imprimee_le at time zone 'Europe/Paris')::date from feuilles_appel f where f.patro_id = p.id
              union all select (i.repondu_le at time zone 'Europe/Paris')::date from inscriptions i where i.patro_id = p.id
              union all select (e.repondu_le at time zone 'Europe/Paris')::date from presences_equipe e where e.patro_id = p.id
              union all select (v.created_at at time zone 'Europe/Paris')::date from vaillants v where v.patro_id = p.id
              -- Une validation compte quel que soit le forfait d'aujourd'hui :
              -- elle n'a pu naître qu'en MV, et c'était de la vie (audit, SF6).
              union all select (x.valide_le at time zone 'Europe/Paris')::date from validations x where x.patro_id = p.id
            ) t where d <= v_jour) as dernier_geste,
           (select count(*) from validations x where x.patro_id = p.id
               and (x.valide_le at time zone 'Europe/Paris')::date between v_jour - 29 and v_jour)::int as validations_30j,
           (select count(*) from foyers f where f.patro_id = p.id)::int as nb_foyers,
           (select count(*) from foyers f where f.patro_id = p.id and f.gf_id is not null)::int as nb_foyers_gf,
           coalesce(btrim(p.asso_nom), '') <> '' and coalesce(btrim(p.asso_representant), '') <> ''
             and coalesce(btrim(p.asso_email), '') <> '' as identite,
           coalesce(btrim(p.message_parents), '') <> '' as mot,
           -- Faite quand TOUS les directeurs protègent leur compte (audit, E5).
           exists (select 1 from profils x where x.patro_id = p.id and x.role = 'directeur')
             and not exists (select 1 from profils x where x.patro_id = p.id and x.role = 'directeur'
                              and not exists (select 1 from auth.mfa_factors m
                                               where m.user_id = x.id and m.status = 'verified')) as mfa
      from patros p
  ), calcul as (
    select b.*,
           (b.forfait = 'mv') as jeu,
           greatest(b.dernier_geste, b.dernier_appel, b.derniere_ouverture) as derniere_activite
      from base b
  ), signal as (
    select c.*,
           case when c.derniere_activite is null then null
                else v_jour - c.derniere_activite end as jours_sans_activite,
           case
             -- Pas démarré, le premier mois. Au-delà, un patro qui n'a
             -- jamais démarré est à relancer (audit, SF5).
             when c.seances_total = 0 and c.enfants = 0 then
               case when v_jour - c.fonde_jour > v_seuil then 'a_relancer' else 'pas_demarre' end
             when c.derniere_activite is not null and v_jour - c.derniere_activite <= v_seuil then 'actif'
             when v_ete and c.derniere_activite >= v_juin then 'en_pause'
             else 'a_relancer'
           end as signal
      from calcul c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', s.id, 'nom', s.nom, 'ville', s.ville, 'fonde_le', s.fonde_le,
           'forfait', s.forfait, 'signal', s.signal,
           'jours_sans_activite', s.jours_sans_activite,
           'derniere_activite', s.derniere_activite,
           'enfants', s.enfants, 'equipe', s.equipe, 'familles', s.familles,
           'seances_30j', s.seances_30j,
           'derniere_seance', s.derniere_seance,
           'dernier_appel', s.dernier_appel,
           'derniere_ouverture', s.derniere_ouverture,
           -- Le jeu ne se lit qu'en MV : en Patronage, ces chiffres dorment.
           'foyers', case when s.jeu then s.nb_foyers end,
           'validations_30j', case when s.jeu then s.validations_30j end,
           -- Les étapes de l'écran du directeur, dans son ordre (une liste :
           -- un objet `jsonb` trie ses clés, audit E2). Foyers et grands
           -- frères n'existent qu'en MV.
           'mise_en_route', (
             select jsonb_build_object(
                      'faites', count(*) filter (where e.fait)::int,
                      'total', count(*)::int,
                      'etapes', jsonb_agg(jsonb_build_object('cle', e.cle, 'fait', e.fait) order by e.rang))
               from (values
                 (1, 'identite', s.identite, true),
                 (2, 'mfa', s.mfa, true),
                 (3, 'foyers', s.nb_foyers > 0, s.jeu),
                 (4, 'enfants', s.enfants > 0, true),
                 (5, 'equipe', s.equipe > 1, true),
                 (6, 'honorabilite', s.equipe > 1 and s.habilites >= s.equipe, true),
                 (7, 'grands_freres', s.nb_foyers_gf > 0, s.jeu),
                 (8, 'seance', s.seances_total > 0, true),
                 (9, 'mot', s.mot, true),
                 (10, 'familles', s.familles > 0, true)
               ) as e(rang, cle, fait, compte)
              where e.compte)
         )
         order by case s.signal when 'a_relancer' then 1 when 'pas_demarre' then 2
                                when 'actif' then 3 else 4 end,
                  s.jours_sans_activite desc nulls first, s.nom), '[]'::jsonb)
    into r
    from signal s;

  return jsonb_build_object('jour', v_jour, 'seuil_jours', v_seuil, 'pause_ete', v_ete, 'patros', r);
end $fn$;
revoke all on function plateforme_suivi(date) from public, anon;
grant execute on function plateforme_suivi(date) to authenticated;
