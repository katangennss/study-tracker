-- Migration 7: three fixes.
--
-- 1. Admins couldn't see roster/submission names at all - `profiles` only
--    ever allowed reading your own row, so every embedded profiles(full_name)
--    join for someone else silently came back null ("Unknown" in the UI).
-- 2. Schedule/subjects go back to admin-only editing - open editing led to
--    accidental/duplicate entries from regular members.

create policy "admin reads member profiles" on profiles for select using (
  exists (
    select 1 from enrollments e1
    join enrollments e2 on e1.group_id = e2.group_id
    where e1.student_id = auth.uid()
      and e1.role = 'admin'
      and e1.status = 'approved'
      and e2.student_id = profiles.id
  )
);

drop policy if exists "members manage schedule" on schedule_periods;
create policy "admin manages schedule" on schedule_periods for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));

drop policy if exists "members manage subjects" on subjects;
create policy "admin manages subjects" on subjects for all using (is_group_admin(group_id)) with check (is_group_admin(group_id));
