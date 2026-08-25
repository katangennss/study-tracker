-- Migration 2: session/attendance tracking for course-type groups, plus the
-- admin write policies needed for the roster and homework-review pages.
-- Run this once in the SQL Editor, after the original schema.sql.

alter table enrollments add column total_sessions integer;

create table attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  session_date date not null default current_date,
  status text not null check (status in ('attended', 'missed')),
  note text,
  created_at timestamptz not null default now()
);

alter table attendance_logs enable row level security;

create or replace function set_my_session_package(gid uuid, total int)
returns void
language sql security definer set search_path = public
as $$
  update enrollments set total_sessions = total
  where student_id = auth.uid() and group_id = gid;
$$;

create policy "admin removes from roster" on enrollments for delete using (is_group_admin(group_id));

create policy "admin manages subjects" on subjects for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "admin manages schedule" on schedule_periods for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "admin manages homework items" on homework_items for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

create policy "admin deletes materials" on materials for delete using (is_group_admin(group_id));
create policy "uploader deletes own material" on materials for delete using (auth.uid() = uploader_id);

create policy "manage own attendance" on attendance_logs for all using (auth.uid() = student_id) with check (
  auth.uid() = student_id and is_group_member(group_id)
);
