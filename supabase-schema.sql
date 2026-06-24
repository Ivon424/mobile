-- =========================================
-- HabitFlow: Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- =========================================

-- 1. Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- 2. PROFILES table (stores user display names)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- 3. HABITS table
create table if not exists public.habits (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text default '⭐',
  color text default '#6C63FF',
  frequency text default 'daily' check (frequency in ('daily', 'weekdays', 'weekends', 'custom')),
  target_days integer[] default '{0,1,2,3,4,5,6}',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- 4. HABIT_LOGS table (one record per completion)
create table if not exists public.habit_logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc', now()) not null,
  notes text default '',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- =========================================
-- Row Level Security (RLS) Policies
-- Ensures users can only see their own data
-- =========================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- HABITS policies
create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- HABIT_LOGS policies
create policy "Users can view own logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.habit_logs for delete
  using (auth.uid() = user_id);

-- =========================================
-- Indexes for performance
-- =========================================
create index if not exists habits_user_id_idx on public.habits(user_id);
create index if not exists habit_logs_habit_id_idx on public.habit_logs(habit_id);
create index if not exists habit_logs_user_id_idx on public.habit_logs(user_id);
create index if not exists habit_logs_completed_at_idx on public.habit_logs(completed_at);

-- =========================================
-- Auto-create profile on signup trigger
-- =========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
