-- Study Tracker — schema (v3: roles, approval, submissions)
-- Run this in the Supabase SQL editor after creating your project
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- Model:
--  - No school-email requirement anywhere — Supabase Auth accepts any email.
--  - A student can belong to any number of "groups" (a school class or an
--    outside course). Joining is code + admin approval, not code-only:
--    the code gets you to "pending", an admin has to approve you before
--    you can see anything in that group. That approval step is the real
--    identity check — the software doesn't try to verify who you are,
--    the teacher who already knows their students does.
--  - Two roles per group: 'student' and 'admin'. The person who creates a
--    group (a teacher setting up "TOEFL Prep") is automatically its admin.
--  - Homework has two independent layers: a private per-student checkbox
--    (nobody else ever sees it — unchanged from before) and a separate
--    formal file submission an admin can see and score.
--  - Whether students can post to Materials is a per-group setting —
--    a school class might allow peer-shared resources, a paid course
--    probably wants the instructor as the only source.

-- 1. Groups: any class or course a student can belong to.
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "10B", "TOEFL Prep"
  org_name text not null,             -- e.g. "Argishti High School", "Bright Minds Tutoring"
  type text not null check (type in ('school_class', 'course')),
  invite_code text not null unique,   -- shared by the admin so students can request to join
  allow_peer_materials boolean not null default false,
  created_by uuid,                    -- set after profiles exists (see fk added below)
  created_at timestamptz not null default now()
);

-- 2. One row per person, linked to a Supabase Auth user.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table groups add constraint groups_created_by_fkey
  foreign key (created_by) references profiles (id);

-- Auto-create a profiles row whenever someone signs up. full_name is
-- passed in via supabase.auth.signUp({ options: { data: { full_name } } })
-- and lands in auth.users.raw_user_meta_data — this trigger is what turns
-- that into an actual profiles row, so the client never has to do it
-- itself (and can't forget to, or race with it).
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Enrollments: the many-to-many link between students and groups, with
--    an approval gate. 'pending' rows exist but grant no read access to
--    the group's data until an admin flips them to 'approved'.
create table enrollments (
  student_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  total_sessions integer,          -- for 'course' groups sold in packages, e.g. "10 classes"
  joined_at timestamptz not null default now(),
  primary key (student_id, group_id)
);

-- 4. Subjects, scoped to a group.
create table subjects (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  name text not null,
  color text not null default '#1D7A6E'
);

-- 5. Weekly schedule: one row per group/day/period.
create table schedule_periods (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  day_of_week int not null check (day_of_week between 1 and 7), -- 1 = Monday
  period_num int not null,
  subject_id uuid not null references subjects (id),
  room text,
  starts_at time not null,
  ends_at time not null
);

-- 6. Announcements, scoped to a single group.
create table announcements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  author_name text not null,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

-- 7. Materials (files/links) shared with a group. Who may INSERT here
--    depends on the group's allow_peer_materials flag (see policy below).
create table materials (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  uploader_id uuid references profiles (id),
  title text not null,
  url text,
  created_at timestamptz not null default now()
);

-- 8. Homework: one row per assignment, scoped to a group + subject.
create table homework_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  subject_id uuid not null references subjects (id),
  text text not null,
  due_date date not null,
  created_at timestamptz not null default now()
);

-- 9. Private per-student completion state — "only you see what you checked".
--    Independent of homework_submissions below; this is just a personal
--    todo checkbox, never visible to an admin.
create table homework_status (
  homework_item_id uuid not null references homework_items (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (homework_item_id, student_id)
);

-- 10. Formal homework submissions — a file the student uploads that the
--     group's admin can see and score. One row per student per homework
--     item; resubmitting overwrites file_path/submitted_at and clears the
--     previous grade.
create table homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_item_id uuid not null references homework_items (id) on delete cascade,
  student_id uuid not null references profiles (id) on delete cascade,
  file_path text not null,            -- path inside the `homework-submissions` storage bucket
  submitted_at timestamptz not null default now(),
  score numeric,
  feedback text,
  graded_at timestamptz,
  graded_by uuid references profiles (id),
  unique (homework_item_id, student_id)
);

-- 11a. Attendance log for 'course' groups sold as a fixed package (e.g. "10
--      classes") rather than run on a weekly timetable. Entirely personal —
--      a student logs their own attended/missed sessions against their own
--      total_sessions count on `enrollments`; no admin involvement, same
--      privacy model as homework_status.
create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  session_date date not null default current_date,
  status text not null check (status in ('attended', 'missed')),
  note text,
  created_at timestamptz not null default now()
);

-- 11. Grades: one row per grade a student receives in a subject.
create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  subject_id uuid not null references subjects (id),
  value numeric not null check (value between 1 and 10), -- 10-point scale
  graded_at date not null default current_date
);

-- 12. Support questions from the Help page.
create table support_questions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  question text not null,
  status text not null default 'open' check (status in ('open', 'answered')),
  created_at timestamptz not null default now()
);

-- --- Helper functions (security definer so policies can check membership
-- without recursively re-triggering RLS on `enrollments` itself) ---

create or replace function is_group_member(gid uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from enrollments
    where group_id = gid and student_id = auth.uid() and status = 'approved'
  );
$$;

create or replace function is_group_admin(gid uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from enrollments
    where group_id = gid and student_id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$;

-- --- Creating a group ---
-- Whoever creates a class/course becomes its admin, approved immediately —
-- no separate insert policy on `groups` needed since this is the only path.
create or replace function create_group(p_name text, p_org_name text, p_type text)
returns groups
language plpgsql security definer set search_path = public
as $$
declare
  g groups;
begin
  insert into groups (name, org_name, type, invite_code, created_by)
  values (p_name, p_org_name, p_type, upper(substr(md5(random()::text), 1, 8)), auth.uid())
  returning * into g;

  insert into enrollments (student_id, group_id, role, status)
  values (auth.uid(), g.id, 'admin', 'approved');

  return g;
end;
$$;

-- --- Joining a group by invite code ---
-- Creates a *pending* enrollment — the student gets no access to the
-- group's data until an admin approves it (see the enrollments update
-- policy below). Looking the code up here (rather than letting a student
-- insert an enrollment row directly) also stops anyone from guessing at
-- a group_id and enrolling themselves without a valid code.
create or replace function join_group_with_code(code text)
returns groups
language plpgsql security definer set search_path = public
as $$
declare
  target groups;
begin
  select * into target from groups where invite_code = code;
  if not found then
    raise exception 'Invalid class code';
  end if;

  insert into enrollments (student_id, group_id, role, status)
  values (auth.uid(), target.id, 'student', 'pending')
  on conflict (student_id, group_id) do nothing;

  return target;
end;
$$;

-- --- Submitting homework ---
-- A raw UPDATE policy on homework_submissions would let a student touch
-- *any* column on their own row, including score/feedback — i.e. grade
-- their own homework. Routing both submit and resubmit through this
-- function means students never get table-level UPDATE/INSERT access at
-- all: every (re)submission goes through here, which always resets the
-- grading columns to null so a resubmission can't keep a stale score.
create or replace function submit_homework(p_homework_item_id uuid, p_file_path text)
returns homework_submissions
language plpgsql security definer set search_path = public
as $$
declare
  gid uuid;
  result homework_submissions;
begin
  select group_id into gid from homework_items where id = p_homework_item_id;
  if gid is null or not is_group_member(gid) then
    raise exception 'Not a member of this homework''s group';
  end if;

  insert into homework_submissions (homework_item_id, student_id, file_path)
  values (p_homework_item_id, auth.uid(), p_file_path)
  on conflict (homework_item_id, student_id) do update
    set file_path = excluded.file_path,
        submitted_at = now(),
        score = null,
        feedback = null,
        graded_at = null,
        graded_by = null
  returning * into result;

  return result;
end;
$$;

-- --- Grading a submission ---
-- Same reasoning in the other direction: this is the only way score/
-- feedback ever get set, so an admin can't be tricked into overwriting
-- a student's file_path via some other form field, and graded_by/
-- graded_at are always accurate.
create or replace function grade_homework_submission(p_submission_id uuid, p_score numeric, p_feedback text)
returns homework_submissions
language plpgsql security definer set search_path = public
as $$
declare
  gid uuid;
  result homework_submissions;
begin
  select hi.group_id into gid
  from homework_submissions hs
  join homework_items hi on hi.id = hs.homework_item_id
  where hs.id = p_submission_id;

  if gid is null or not is_group_admin(gid) then
    raise exception 'Not an admin of this submission''s group';
  end if;

  update homework_submissions
  set score = p_score, feedback = p_feedback, graded_at = now(), graded_by = auth.uid()
  where id = p_submission_id
  returning * into result;

  return result;
end;
$$;

-- --- Setting your own session package size ---
-- Routed through a function for the same reason as submit_homework: a raw
-- UPDATE policy on `enrollments` scoped to "your own row" would also let a
-- student edit their own role/status, which must stay admin-only.
create or replace function set_my_session_package(gid uuid, total int)
returns void
language sql security definer set search_path = public
as $$
  update enrollments set total_sessions = total
  where student_id = auth.uid() and group_id = gid;
$$;

-- --- Row Level Security ---

alter table groups enable row level security;
alter table profiles enable row level security;
alter table enrollments enable row level security;
alter table subjects enable row level security;
alter table schedule_periods enable row level security;
alter table announcements enable row level security;
alter table materials enable row level security;
alter table homework_items enable row level security;
alter table homework_status enable row level security;
alter table homework_submissions enable row level security;
alter table grades enable row level security;
alter table support_questions enable row level security;
alter table attendance_logs enable row level security;

-- Groups: name/org/type/code are needed to look a group up before joining,
-- so any signed-in user can read the list. (Nothing sensitive lives here.)
create policy "read groups" on groups for select using (auth.role() = 'authenticated');
create policy "admin can update own group" on groups for update using (is_group_admin(id));

-- Profiles: read and edit your own only.
create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Enrollments: you can always read your own (so you can see your own
-- pending/approved/rejected status); an admin can read and update every
-- enrollment in a group they administer — that's the roster + approval
-- flow. There is deliberately no insert policy: rows are only ever
-- created by create_group() / join_group_with_code() above.
create policy "read own enrollment" on enrollments for select using (auth.uid() = student_id);
create policy "admin reads group roster" on enrollments for select using (is_group_admin(group_id));
create policy "admin updates group roster" on enrollments for update using (is_group_admin(group_id));
create policy "admin removes from roster" on enrollments for delete using (is_group_admin(group_id));

-- Everything below requires *approved* membership to read.
create policy "read subjects in my groups" on subjects for select using (is_group_member(group_id));
create policy "read schedule in my groups" on schedule_periods for select using (is_group_member(group_id));
create policy "read announcements in my groups" on announcements for select using (is_group_member(group_id));
create policy "read materials in my groups" on materials for select using (is_group_member(group_id));
create policy "read homework in my groups" on homework_items for select using (is_group_member(group_id));

-- Subjects, schedule and homework items are the admin's content to manage.
create policy "admin manages subjects" on subjects for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "admin manages schedule" on schedule_periods for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "admin manages homework items" on homework_items for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

-- Materials: an admin can always post or remove anything; a regular member
-- can post (and remove their own) only if the group allows peer sharing.
create policy "post materials" on materials for insert with check (
  is_group_admin(group_id)
  or (is_group_member(group_id) and (select allow_peer_materials from groups where id = group_id))
);
create policy "admin deletes materials" on materials for delete using (is_group_admin(group_id));
create policy "uploader deletes own material" on materials for delete using (auth.uid() = uploader_id);

-- Homework status: private to the student — never visible to an admin.
create policy "read own homework status" on homework_status for select using (auth.uid() = student_id);
create policy "insert own homework status" on homework_status for insert with check (
  auth.uid() = student_id
  and is_group_member((select group_id from homework_items where id = homework_item_id))
);
create policy "update own homework status" on homework_status for update using (auth.uid() = student_id);

-- Homework submissions: read-only at the table level for everyone — a
-- student can read their own, an admin can read every submission in a
-- group they run. Writes only ever happen through submit_homework() and
-- grade_homework_submission() above, which run as the function owner, so
-- there are deliberately no insert/update policies here.
create policy "read own submissions" on homework_submissions for select using (auth.uid() = student_id);
create policy "read submissions as admin" on homework_submissions for select using (
  is_group_admin((select group_id from homework_items where id = homework_item_id))
);

-- Grades: a student reads their own; an admin reads and writes grades for
-- groups they run.
create policy "read own grades" on grades for select using (auth.uid() = student_id);
create policy "manage grades as admin" on grades for all using (is_group_admin(group_id));

-- Support questions: a student can create and read their own.
create policy "read own support questions" on support_questions for select using (auth.uid() = student_id);
create policy "insert own support questions" on support_questions for insert with check (auth.uid() = student_id);

-- Attendance log: entirely the student's own, never visible to an admin.
create policy "manage own attendance" on attendance_logs for all using (auth.uid() = student_id) with check (
  auth.uid() = student_id and is_group_member(group_id)
);

-- --- Storage: homework submission files ---
-- Create a private bucket named `homework-submissions` from the Supabase
-- dashboard (Storage -> New bucket -> uncheck "Public"), then run this.
-- Files are expected at the path `{group_id}/{homework_item_id}/{student_id}/{filename}`
-- so these policies can check group membership straight from the path.

create policy "upload own submission file"
on storage.objects for insert
with check (
  bucket_id = 'homework-submissions'
  and (storage.foldername(name))[3] = auth.uid()::text
  and is_group_member((storage.foldername(name))[1]::uuid)
);

create policy "read own submission file"
on storage.objects for select
using (
  bucket_id = 'homework-submissions'
  and (storage.foldername(name))[3] = auth.uid()::text
);

create policy "admin reads group submission files"
on storage.objects for select
using (
  bucket_id = 'homework-submissions'
  and is_group_admin((storage.foldername(name))[1]::uuid)
);
