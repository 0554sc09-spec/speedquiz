import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEY = 'keyword_game_supabase_config';

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey) {
    return { url: envUrl.trim(), anonKey: envKey.trim() };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch (e) {
    // ignore
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  currentClient = null; // force re-instantiation
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY);
  currentClient = null;
}

let currentClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!currentClient) {
    try {
      currentClient = createClient(config.url, config.anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return currentClient;
}

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const targetUrl = url || getSupabaseConfig().url;
    const targetKey = anonKey || getSupabaseConfig().anonKey;

    if (!targetUrl || !targetKey) {
      return { success: false, message: 'URL과 Anon Key가 입력되지 않았습니다.' };
    }

    const testClient = createClient(targetUrl, targetKey);
    // Ping with a lightweight request
    const { data, error } = await testClient.from('rooms').select('room_code').limit(1);

    if (error) {
      // If table doesn't exist yet, but client connected, error code 42P01 means table missing (still connected!)
      if (error.code === '42P01' || error.message.includes('relation "rooms" does not exist')) {
        return {
          success: true,
          message: 'Supabase 서버 연결 성공! (단, rooms 테이블 생성이 필요합니다. 아래 SQL을 실행해주세요)',
        };
      }
      return { success: false, message: `Supabase 오류: ${error.message}` };
    }

    return { success: true, message: 'Supabase 데이터베이스 및 Realtime 연결 정상!' };
  } catch (err: any) {
    return { success: false, message: `연결 실패: ${err.message || '네트워크 오류'}` };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- 🎮 키워드 경험 스피드게임 (Supabase 테이블 스키마)
-- Supabase 대시보드 -> SQL Editor -> New Query 에 붙여넣고 RUN을 눌러주세요.

-- 1. 게임 방 테이블
create table if not exists public.rooms (
  room_code text primary key,
  host_id text not null,
  phase text not null default 'LOBBY',
  settings jsonb not null default '{}'::jsonb,
  current_round jsonb,
  played_submission_ids text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 참가자 테이블
create table if not exists public.participants (
  id text not null,
  room_code text not null references public.rooms(room_code) on delete cascade,
  name text not null,
  avatar text not null,
  score integer default 0,
  has_submitted boolean default false,
  is_online boolean default true,
  joined_at bigint not null,
  primary key (room_code, id)
);

-- 3. 키워드 제출 테이블 (3~6개 키워드)
create table if not exists public.submissions (
  id text not null,
  room_code text not null references public.rooms(room_code) on delete cascade,
  participant_id text not null,
  author_name text not null,
  author_avatar text not null,
  keywords text[] not null,
  story_hint text,
  category text,
  created_at bigint not null,
  primary key (room_code, id)
);

-- 4. RLS(행 단위 보안) 비활성화 또는 공개 허용 (수업용 익명 플레이 지원)
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.submissions enable row level security;

create policy "Allow public access to rooms" on public.rooms for all using (true) with check (true);
create policy "Allow public access to participants" on public.participants for all using (true) with check (true);
create policy "Allow public access to submissions" on public.submissions for all using (true) with check (true);

-- 5. Realtime 복제 활성화
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.submissions;
`;
