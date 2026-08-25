-- Migration 5: sessions only count attendance (no "missed" tracking),
-- auto-reset the count when a package is fully used, and a personal
-- payment-reminder flag to show it.

alter table enrollments add column sessions_reset_at timestamptz not null default now();
alter table profiles add column payment_reminders_enabled boolean not null default true;

create table payment_reminders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles (id) on delete cascade,
  group_id uuid not null references groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  acknowledged boolean not null default false
);

alter table payment_reminders enable row level security;

create policy "manage own payment reminders" on payment_reminders for all using (auth.uid() = student_id) with check (
  auth.uid() = student_id and is_group_member(group_id)
);
