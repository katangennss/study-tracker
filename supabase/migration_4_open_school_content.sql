-- Migration 4: school classes have no teacher, so their content is fully
-- peer-run. Schedule and subjects are, in practice, only ever used by
-- school_class groups (course-type groups track sessions/grades
-- differently), so both open up to every approved member outright.
-- Materials stays admin-gated for paid courses, but opens automatically
-- for school classes specifically.

drop policy if exists "admin manages schedule" on schedule_periods;
create policy "members manage schedule" on schedule_periods for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "admin manages subjects" on subjects;
create policy "members manage subjects" on subjects for all using (is_group_member(group_id)) with check (is_group_member(group_id));

drop policy if exists "post materials" on materials;
create policy "post materials" on materials for insert with check (
  is_group_admin(group_id)
  or (select type from groups where id = group_id) = 'school_class'
  or (is_group_member(group_id) and (select allow_peer_materials from groups where id = group_id))
);
