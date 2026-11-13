// Banc : une base Postgres en mémoire qui rejoue les migrations d'un projet
// Supabase. Les morceaux propres à Supabase (comptes, stockage, tâches de
// nuit) sont remplacés par des doublures minimales.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DOUBLURES = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage; create schema cron; create schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}',
  created_at timestamptz default now(), last_sign_in_at timestamptz, banned_until timestamptz);
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid, status text, factor_type text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('banc.uid', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('banc.jwt', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create table storage.buckets (id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text,
  owner uuid, owner_id text, metadata jsonb, path_tokens text[], updated_at timestamptz default now(), created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
create function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'),1)] $$;
create table cron.job (jobid bigserial primary key, jobname text unique, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$
  insert into cron.job(jobname, schedule, command) values (n, s, c)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n returning true $$;
grant usage on schema public, auth, storage, cron to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
create publication supabase_realtime;
-- Comme chez Supabase : toute table ou fonction neuve du schéma public est
-- accordée d'office aux rôles de l'API. C'est ce qui rend les « revoke » des
-- migrations nécessaires, et donc vérifiables ici.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
insert into auth.users (id, email) values ('c6df8302-85d0-4ad0-8292-f0fb7d41d35c', 'fondateur@banc.test');
`;

export async function monterBase(dossierMigrations, { jusqua = null, verbeux = false } = {}) {
  const db = new PGlite({ extensions: { pgcrypto, unaccent } });
  await db.exec('create extension if not exists pgcrypto; create extension if not exists unaccent;');
  await db.exec(DOUBLURES);
  const fichiers = readdirSync(dossierMigrations).filter(f => f.endsWith('.sql')).sort();
  const echecs = []; const retraits = [];
  for (const f of fichiers) {
    if (jusqua && f > jusqua) break;
    let sql = readFileSync(join(dossierMigrations, f), 'utf8')
      .replace(/create extension if not exists pg_cron[^;]*;/gi, '');
    // Chaque migration est une transaction : un échec ne laisse rien à moitié.
    // Une fonction dont le type de retour change sans DROP (055) est rejouable
    // en production seulement parce que la base y a une histoire ; ici on la
    // retire, comme Postgres le suggère, et on rejoue. Chaque retrait est noté.
    for (let essai = 0; essai < 12; essai++) {
      try {
        await db.exec('begin;'); await db.exec(sql); await db.exec('commit;');
        if (verbeux) console.log('ok  ', f);
        break;
      } catch (e) {
        await db.exec('rollback;');
        const m = /DROP FUNCTION ([^\n]+?) first/i.exec(e.hint || '');
        if (m && essai < 11) { retraits.push({ f, fonction: m[1] }); await db.exec(`drop function ${m[1]} cascade;`); continue; }
        echecs.push({ f, message: e.message, hint: e.hint });
        if (verbeux) console.log('ECHEC', f, '→', e.message);
        break;
      }
    }
  }
  return { db, echecs, retraits, fichiers };
}

/**
 * Exécute `sql` comme le ferait une requête de l'API : rôle `authenticated` (ou `anon`), identifiant donné,
 * et `request.jwt.claims` posé comme le fait PostgREST. Une requête passée par `db.query` directement n'a
 * pas ces réglages : elle tient lieu de tâche de nuit.
 */
export async function enTantQue(db, uid, sql, params = [], role = 'authenticated') {
  const revendications = JSON.stringify({ role, ...(uid ? { sub: uid } : {}) });
  await db.exec(`set role ${role}; select set_config('banc.uid', '${uid ?? ''}', false);
                 select set_config('request.jwt.claims', '${revendications}', false);`);
  try { return await db.query(sql, params); }
  finally { await db.exec(`reset role; select set_config('banc.uid', '', false); select set_config('request.jwt.claims', '', false);`); }
}
