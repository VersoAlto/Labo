-- ════════════════════════════════════════════════════════════════
-- 070 · Le suivi des patros, pour la plateforme
--
-- Contrat : Labo, clients/maisons-vaillantes/lots/02-suivi-des-patros.md.
--
-- Une seule fonction de lecture, réservée aux administrateurs de la
-- plateforme. Pour chaque patro : des chiffres et des dates, jamais un
-- nom de personne. Elle dit si le patro vit, et le signal se calcule
-- ici, en jours entiers : l'écran l'affiche, il ne le refait pas.
--
-- Aucune table créée, aucune fonction existante réécrite. Elle s'appuie
-- sur `forfait_de` (069) et `est_admin_plateforme` (037).
-- ════════════════════════════════════════════════════════════════

-- `p_jour` : le jour de référence, aujourd'hui (heure de Paris) par
-- défaut. Il sert au banc à éprouver la pause d'été ; la fonction est
-- réservée à la plateforme, il n'ouvre donc rien.
create or replace function plateforme_suivi(p_jour date default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_jour  date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  -- Trois semaines : deux semaines de petites vacances et une séance par
  -- semaine y tiennent (décision 3).
  v_seuil constant int := 21;
  v_ete   boolean;
  r       jsonb;
begin
  if not est_admin_plateforme() then
    raise exception 'Réservé à la plateforme.' using errcode = 'insufficient_privilege';
  end if;
  -- Du 14 juillet au 31 août, un silence n'est pas un abandon (décision 4).
  v_ete := v_jour between make_date(extract(year from v_jour)::int, 7, 14)
                      and make_date(extract(year from v_jour)::int, 8, 31);

  with base as (
    select p.id, p.nom, p.ville, p.created_at as fonde_le,
           forfait_de(p.id)::text as forfait,
           (select count(*) from vaillants v
             where v.patro_id = p.id and v.archive_le is null and not v.provisoire)::int as enfants,
           (select count(*) from profils x where x.patro_id = p.id)::int as equipe,
           (select count(*) from profils x where x.patro_id = p.id
               and x.diplome_abus and x.honorabilite_tam)::int as habilites,
           ((select count(*) from parents x where x.patro_id = p.id
               and (x.auth_id is not null or x.invite_le is not null))
            + (select count(*) from mv_pins m where m.patro_id = p.id and m.sujet_type = 'parent'))::int as familles,
           (select count(*) from seances s where s.patro_id = p.id)::int as seances_total,
           (select count(*) from seances s where s.patro_id = p.id
               and s.date between v_jour - 29 and v_jour)::int as seances_30j,
           (select max(s.date) from seances s where s.patro_id = p.id and s.date <= v_jour) as derniere_seance,
           (select max((s.created_at at time zone 'Europe/Paris')::date)
              from seances s where s.patro_id = p.id) as derniere_seance_creee,
           (select max((x.saisi_le at time zone 'Europe/Paris')::date)
              from presences x where x.patro_id = p.id) as dernier_appel,
           (select max((u.last_sign_in_at at time zone 'Europe/Paris')::date)
              from profils x join auth.users u on u.id = x.id where x.patro_id = p.id) as derniere_connexion,
           (select max((x.valide_le at time zone 'Europe/Paris')::date)
              from validations x where x.patro_id = p.id) as derniere_validation,
           (select count(*) from validations x where x.patro_id = p.id
               and (x.valide_le at time zone 'Europe/Paris')::date between v_jour - 29 and v_jour)::int as validations_30j,
           (select count(*) from foyers f where f.patro_id = p.id)::int as nb_foyers,
           (select count(*) from foyers f where f.patro_id = p.id and f.gf_id is not null)::int as nb_foyers_gf,
           coalesce(btrim(p.asso_nom), '') <> '' and coalesce(btrim(p.asso_representant), '') <> ''
             and coalesce(btrim(p.asso_email), '') <> '' as identite,
           coalesce(btrim(p.message_parents), '') <> '' as mot,
           exists (select 1 from profils x join auth.mfa_factors m on m.user_id = x.id
                    where x.patro_id = p.id and x.role = 'directeur' and m.status = 'verified') as mfa
      from patros p
  ), calcul as (
    select b.*,
           (b.forfait = 'mv') as jeu,
           -- La dernière activité (décision 1). Les validations ne comptent
           -- qu'en MV : en Patronage, le jeu dort.
           greatest(b.derniere_seance_creee, b.dernier_appel, b.derniere_connexion,
                    case when b.forfait = 'mv' then b.derniere_validation end) as derniere_activite
      from base b
  ), signal as (
    select c.*,
           case when c.derniere_activite is null then null
                else greatest(0, v_jour - c.derniere_activite) end as jours_sans_activite,
           case
             when c.seances_total = 0 and c.enfants = 0 then 'pas_demarre'
             when c.derniere_activite is null or v_jour - c.derniere_activite > v_seuil then
               case when v_ete then 'en_pause' else 'a_relancer' end
             else 'actif'
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
           'derniere_connexion', s.derniere_connexion,
           -- Le jeu ne se lit qu'en MV : en Patronage, ces chiffres dorment.
           'foyers', case when s.jeu then s.nb_foyers end,
           'validations_30j', case when s.jeu then s.validations_30j end,
           -- Les étapes de l'écran du directeur (mise-en-route.js), mêmes
           -- règles ; foyers et grands frères n'existent qu'en MV (décision 7).
           'mise_en_route', (
             select jsonb_build_object(
                      'faites', count(*) filter (where e.fait)::int,
                      'total', count(*)::int,
                      'etapes', jsonb_object_agg(e.cle, e.fait))
               from (values
                 ('identite', s.identite, true),
                 ('mfa', s.mfa, true),
                 ('foyers', s.nb_foyers > 0, s.jeu),
                 ('enfants', s.enfants > 0, true),
                 ('equipe', s.equipe > 1, true),
                 ('honorabilite', s.equipe > 1 and s.habilites >= s.equipe, true),
                 ('grands_freres', s.nb_foyers_gf > 0, s.jeu),
                 ('seance', s.seances_total > 0, true),
                 ('mot', s.mot, true),
                 ('familles', s.familles > 0, true)
               ) as e(cle, fait, compte)
              where e.compte)
         )
         -- Les patros à relancer d'abord (décision 10).
         order by case s.signal when 'a_relancer' then 1 when 'pas_demarre' then 2
                                when 'actif' then 3 else 4 end,
                  s.jours_sans_activite desc nulls first, s.nom), '[]'::jsonb)
    into r
    from signal s;

  return jsonb_build_object('jour', v_jour, 'seuil_jours', v_seuil, 'pause_ete', v_ete, 'patros', r);
end $fn$;
revoke all on function plateforme_suivi(date) from public, anon;
grant execute on function plateforme_suivi(date) to authenticated;
