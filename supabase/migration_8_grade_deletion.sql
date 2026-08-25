-- Migration 8: let deleting a subject cascade to its grades.
--
-- Grades are private per-student (admins can't read other students'
-- grades), so an admin deleting a subject can never actually know
-- whether grades exist for it elsewhere - any "only delete if no grades"
-- check from the app is fundamentally blind to other students' rows.
-- Rather than block the delete outright, make it cascade: deleting a
-- subject deletes any grades recorded against it too. The app now asks
-- for confirmation before this happens.

alter table grades drop constraint if exists grades_subject_id_fkey;
alter table grades add constraint grades_subject_id_fkey
  foreign key (subject_id) references subjects (id) on delete cascade;
