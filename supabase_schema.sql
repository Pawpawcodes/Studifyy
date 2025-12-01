create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamp default now()
);
create table if not exists uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text,
  created_at timestamp default now()
);
create table if not exists tts_cache (
  id uuid primary key default uuid_generate_v4(),
  text_input text not null,
  audio_path text,
  created_at timestamp default now()
);
create table if not exists document_chunks (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads(id) on delete cascade,
  chunk_text text not null,
  chunk_index int,
  created_at timestamp default now()
);
create table if not exists flashcards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamp default now()
);
create table if not exists quizzes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  question text not null,
  options text[],
  correct_index int,
  created_at timestamp default now()
);
alter table profiles enable row level security;
alter table uploads enable row level security;
alter table tts_cache enable row level security;
alter table document_chunks enable row level security;
alter table flashcards enable row level security;
alter table quizzes enable row level security;
create policy "insert_own_uploads"
on uploads for insert
with check (auth.uid() = user_id);

create policy "select_own_uploads"
on uploads for select
using (auth.uid() = user_id);
