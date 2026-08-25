-- Migration 6: email a group's admin(s) when someone requests to join.
--
-- Uses pg_net (built into Supabase) to call SendGrid's API directly from a
-- database trigger - no separate Edge Function to deploy. The SendGrid API
-- key and verified sender email are read from database-level config rather
-- than hardcoded here, so this file has no secrets in it and is safe to
-- commit. See the one-off setup command that goes with this migration -
-- run that separately, directly in the SQL editor, and never commit it.

create extension if not exists pg_net;

create or replace function notify_admin_of_join_request()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  student_name text;
  group_name text;
  admin_email text;
  api_key text;
  sender_email text;
begin
  if new.status != 'pending' then
    return new;
  end if;

  api_key := current_setting('app.sendgrid_api_key', true);
  sender_email := current_setting('app.sender_email', true);
  if api_key is null or sender_email is null then
    return new; -- not configured yet; skip quietly rather than failing the insert
  end if;

  select full_name into student_name from profiles where id = new.student_id;
  select name into group_name from groups where id = new.group_id;

  for admin_email in
    select au.email
    from enrollments e
    join auth.users au on au.id = e.student_id
    where e.group_id = new.group_id and e.role = 'admin' and e.status = 'approved'
  loop
    perform net.http_post(
      url := 'https://api.sendgrid.com/v3/mail/send',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || api_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'personalizations', jsonb_build_array(jsonb_build_object('to', jsonb_build_array(jsonb_build_object('email', admin_email)))),
        'from', jsonb_build_object('email', sender_email, 'name', 'Study Tracker'),
        'subject', coalesce(student_name, 'Someone') || ' wants to join ' || coalesce(group_name, 'your class'),
        'content', jsonb_build_array(jsonb_build_object(
          'type', 'text/plain',
          'value', coalesce(student_name, 'Someone') || ' has requested to join "' || coalesce(group_name, 'your class') ||
                   '". Open Study Tracker -> Manage -> Roster to approve or reject.'
        ))
      )
    );
  end loop;

  return new;
end;
$$;

create trigger on_enrollment_pending
  after insert on enrollments
  for each row execute function notify_admin_of_join_request();
