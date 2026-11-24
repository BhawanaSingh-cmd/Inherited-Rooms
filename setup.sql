-- =====================================================================
-- The Inherited Rooms · Room III (the archive) · Supabase setup
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- BEFORE running: replace  you@example.com  (line just below) with the
-- email address you will use to log in to the review page.
-- =====================================================================

-- 1. Who is allowed to review notes
create table if not exists public.archive_admins (email text primary key);
insert into public.archive_admins (email) values ('you@example.com')
  on conflict do nothing;
alter table public.archive_admins enable row level security;

create or replace function public.is_archive_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.archive_admins
                 where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- 2. The notes
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  color       text not null default 'yellow' check (color in ('pink','yellow','lilac','sage')),
  body        text not null check (char_length(body) between 3 and 240),
  answers     jsonb not null default '{}'::jsonb,
  lang        text not null default 'en' check (lang in ('en','hi')),
  flagged     boolean not null default false,
  approved    boolean not null default false
);
create index if not exists notes_created_idx on public.notes (created_at);
alter table public.notes enable row level security;

-- 3. The word filter (English, Hindi, Hinglish; also catches links)
create or replace function public.note_looks_bad(t text) returns boolean
language plpgsql immutable as $$
declare
  n text := lower(coalesce(t, ''));
  a text;
  b text;
  pat text := '(f+u+c+k|sh[i]+t|b[i]tch|slut|wh[o]re|bastard|cunt|\md[i]ck|pussy|\mrap(e|ist)|rand[i]|ch[aeiou]{0,2}t[iy]+a|madar ?chod|maa?darchod|b(e)?h(e)?n ?chod|bhen ?chod|\mmc\M|\mbc\M|ga{1,2}ndu|\mga{1,2}nd\M|\mlund\M|lau?da|lavda|bhosd[i]|bhosad|haram[i]|kut(t)?[i]ya|kamin[ai]|रंडी|चूतिया|चुतिया|मादरचोद|बहनचोद|भेनचोद|गांडू|गाँडू|लंड|लौड़ा|भोसड़ी|हरामी|कुतिया|कमीन|https?://|www\.|\.com\M)';
begin
  n := translate(n, '@013$', 'aoies');
  a := regexp_replace(n, '[*#.\-_]', '', 'g');
  b := translate(n, '*#', 'uu');
  return n ~* pat or a ~* pat or b ~* pat
      or regexp_replace(a, '[^a-zऀ-ॿ]', '', 'g') ~* pat;
end $$;

-- 4. Visitors post through this function only (it decides if a note is held)
create or replace function public.post_note(p_color text, p_body text, p_answers jsonb, p_lang text)
returns table (id uuid, created_at timestamptz, visible boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r public.notes;
  recent int;
begin
  -- simple flood guard: at most 30 notes a minute across the whole site
  select count(*) into recent from public.notes n where n.created_at > now() - interval '1 minute';
  if recent >= 30 then raise exception 'Too many notes right now. Please try again shortly.'; end if;
  insert into public.notes (color, body, answers, lang, flagged)
  values (
    case when p_color in ('pink','yellow','lilac','sage') then p_color else 'yellow' end,
    left(trim(p_body), 240),
    coalesce(p_answers, '{}'::jsonb),
    case when p_lang in ('en','hi') then p_lang else 'en' end,
    public.note_looks_bad(p_body)
  ) returning * into r;
  return query select r.id, r.created_at, not r.flagged;
end $$;

revoke all on function public.post_note(text, text, jsonb, text) from public;
grant execute on function public.post_note(text, text, jsonb, text) to anon, authenticated;

-- 5. Who can see what
drop policy if exists "wall shows clean or approved notes" on public.notes;
create policy "wall shows clean or approved notes" on public.notes
  for select to anon, authenticated
  using (flagged = false or approved = true or public.is_archive_admin());

drop policy if exists "admin can update notes" on public.notes;
create policy "admin can update notes" on public.notes
  for update to authenticated
  using (public.is_archive_admin()) with check (public.is_archive_admin());

drop policy if exists "admin can delete notes" on public.notes;
create policy "admin can delete notes" on public.notes
  for delete to authenticated
  using (public.is_archive_admin());

-- Visitors never get direct insert/update/delete rights; only post_note().
revoke insert, update, delete on public.notes from anon;
grant select on public.notes to anon, authenticated;
grant update, delete on public.notes to authenticated;
