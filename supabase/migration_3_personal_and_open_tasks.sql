-- Migration 3: grades become fully personal (no admin write), homework
-- completion becomes admin-visible, task creation opens up to every member,
-- file submission becomes optional per task, materials support uploaded
-- files, and classes get rename/delete + promote-to-admin.

-- --- Grades: personal tracking only, no admin write path ---
alter table grades drop constraint if exists grades_value_check;
alter table grades alter column subject_id drop not null;
alter table grades add column label text;

drop policy if exists "manage grades as admin" on grades;
create policy "manage own grades" on grades for all using (auth.uid() = student_id) with check (
  auth.uid() = student_id and is_group_member(group_id)
);

-- --- Homework: anyone in the group can add a task; file submission is a
--     per-task opt-in; the creator or admin can edit/remove it ---
alter table homework_items add column created_by uuid references profiles (id);
alter table homework_items add column allow_file_submission boolean not null default false;
alter table homework_items add column link_url text;
alter table homework_items alter column subject_id drop not null;

drop policy if exists "admin manages homework items" on homework_items;
create policy "members create tasks" on homework_items for insert with check (
  is_group_member(group_id) and created_by = auth.uid()
);
create policy "creator or admin updates task" on homework_items for update using (
  auth.uid() = created_by or is_group_admin(group_id)
);
create policy "creator or admin deletes task" on homework_items for delete using (
  auth.uid() = created_by or is_group_admin(group_id)
);

-- Completion checkmarks are still each student's own row, but the group's
-- admin can now see them too (previously fully private).
create policy "admin reads homework status" on homework_status for select using (
  is_group_admin((select group_id from homework_items where id = homework_item_id))
);

-- --- Materials: support an uploaded file/photo, not just a link ---
alter table materials add column file_path text;

-- --- Classes: admins can rename (already covered by the existing "admin
--     can update own group" policy) and now delete ---
create policy "admin deletes own group" on groups for delete using (is_group_admin(id));

-- --- Storage: a "materials" bucket, mirroring the homework-submissions
--     setup. Create the bucket from the dashboard first (Storage -> New
--     bucket -> name it "materials", leave Public off), then run this.
-- Files are expected at the path `{group_id}/{filename}`.

create policy "upload materials file"
on storage.objects for insert
with check (
  bucket_id = 'materials'
  and (
    is_group_admin((storage.foldername(name))[1]::uuid)
    or (
      is_group_member((storage.foldername(name))[1]::uuid)
      and (select allow_peer_materials from groups where id = (storage.foldername(name))[1]::uuid)
    )
  )
);

create policy "read materials file"
on storage.objects for select
using (
  bucket_id = 'materials'
  and is_group_member((storage.foldername(name))[1]::uuid)
);

create policy "delete materials file"
on storage.objects for delete
using (
  bucket_id = 'materials'
  and (is_group_admin((storage.foldername(name))[1]::uuid) or owner = auth.uid())
);
