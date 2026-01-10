"use client";

import HomeSimplePage from "./_components/HomeSimplePage";

export default function Page() {
  return <HomeSimplePage />;
}



/*
SQL (if needed):

create table if not exists simple_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb,
  completed boolean default false,
  updated_at timestamptz default now()
);

create table if not exists simple_flow_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  updated_at timestamptz default now()
);
*/
