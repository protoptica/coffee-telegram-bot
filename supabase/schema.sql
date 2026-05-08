drop table if exists pending_ratings;
drop table if exists coffee_entries;

create table if not exists coffee_entries (
  entry_id text primary key,
  id text,
  user_id bigint not null,
  chat_id bigint not null,
  telegram_photo_file_id text,
  local_photo_path text,
  created_at timestamptz not null,
  coffee_name text,
  roaster_name text,
  origin_country text,
  process text,
  variety text,
  descriptors jsonb default '[]'::jsonb,
  raw_text text,
  rating integer,
  processing_message_id bigint,
  rating_message_id bigint
);

create index if not exists coffee_entries_user_created_idx
  on coffee_entries (user_id, created_at desc);

create table if not exists pending_ratings (
  rating_session_id text primary key,
  user_id bigint not null,
  created_at timestamptz not null,
  payload jsonb not null
);

create index if not exists pending_ratings_user_created_idx
  on pending_ratings (user_id, created_at desc);
