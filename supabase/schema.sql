create table if not exists coffee_entries (
  entryId text primary key,
  id text,
  userId bigint not null,
  chatId bigint not null,
  telegramPhotoFileId text,
  localPhotoPath text,
  createdAt timestamptz not null,
  coffeeName text,
  roasterName text,
  originCountry text,
  process text,
  variety text,
  descriptors jsonb default '[]'::jsonb,
  rawText text,
  rating integer,
  processingMessageId bigint,
  ratingMessageId bigint
);

create index if not exists coffee_entries_user_created_idx
  on coffee_entries (userId, createdAt desc);

create table if not exists pending_ratings (
  ratingSessionId text primary key,
  userId bigint not null,
  createdAt timestamptz not null,
  payload jsonb not null
);

create index if not exists pending_ratings_user_created_idx
  on pending_ratings (userId, createdAt desc);
