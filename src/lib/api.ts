import type { RoomData, Participant, Submission, GamePhase, GameSettings } from '../types/game.ts';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.ts';

// Room API and Realtime Manager
export class GameApi {
  // Create Room
  static async createRoom(preferredCode?: string, settings?: Partial<GameSettings>): Promise<RoomData> {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredCode, settings }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '방 생성에 실패했습니다.');

    // If Supabase is active, mirror create in Supabase
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        if (sb) {
          await sb.from('rooms').upsert({
            room_code: data.room.roomCode,
            host_id: data.room.hostId,
            phase: data.room.phase,
            settings: data.room.settings,
          });
        }
      } catch (err) {
        console.warn('Supabase mirror create error:', err);
      }
    }

    return data.room;
  }

  // Get Room
  static async getRoom(roomCode: string): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '방을 찾을 수 없습니다.');
    return data.room;
  }

  // Join Room
  static async joinRoom(roomCode: string, name: string, avatar: string, id?: string): Promise<{ participant: Participant; room: RoomData }> {
    const res = await fetch(`/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, avatar }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '방 입장에 실패했습니다.');

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        if (sb) {
          await sb.from('participants').upsert({
            id: data.participant.id,
            room_code: roomCode,
            name: data.participant.name,
            avatar: data.participant.avatar,
            score: data.participant.score,
            has_submitted: data.participant.hasSubmitted,
            is_online: true,
            joined_at: data.participant.joinedAt,
          });
        }
      } catch (err) {
        console.warn('Supabase mirror participant join:', err);
      }
    }

    return { participant: data.participant, room: data.room };
  }

  // Submit Keywords
  static async submitKeywords(
    roomCode: string,
    participantId: string,
    keywords: string[],
    storyHint?: string,
    category?: string
  ): Promise<{ submission: Submission; room: RoomData }> {
    const res = await fetch(`/api/rooms/${roomCode}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, keywords, storyHint, category }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '키워드 제출에 실패했습니다.');

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        if (sb) {
          await sb.from('submissions').upsert({
            id: data.submission.id,
            room_code: roomCode,
            participant_id: participantId,
            author_name: data.submission.authorName,
            author_avatar: data.submission.authorAvatar,
            keywords: data.submission.keywords,
            story_hint: data.submission.storyHint,
            category: data.submission.category,
            created_at: data.submission.createdAt,
          });
        }
      } catch (err) {
        console.warn('Supabase mirror submission:', err);
      }
    }

    return { submission: data.submission, room: data.room };
  }

  // Change Phase
  static async setPhase(roomCode: string, phase: GamePhase): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/phase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '단계 변경 실패');
    return data.room;
  }

  // Start Next Round
  static async nextRound(roomCode: string): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/next-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '다음 라운드 시작 실패');
    return data.room;
  }

  // Progressive keyword reveal step
  static async revealStep(roomCode: string): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/reveal-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.room;
  }

  // Submit Guess
  static async submitGuess(
    roomCode: string,
    participantId: string,
    selectedAuthorId: string,
    timeTakenMs: number
  ): Promise<{ isCorrect: boolean; pointsEarned: number; room: RoomData }> {
    const res = await fetch(`/api/rooms/${roomCode}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, selectedAuthorId, timeTakenMs }),
    });
    const data = await res.json();
    if (!data.success && data.message) {
      throw new Error(data.message);
    }
    return { isCorrect: data.isCorrect, pointsEarned: data.pointsEarned, room: data.room };
  }

  // Update Settings
  static async updateSettings(roomCode: string, settings: Partial<GameSettings>): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.room;
  }

  // Demo Seed
  static async demoSeed(roomCode: string): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/demo-seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.room;
  }

  // Reset
  static async resetRoom(roomCode: string): Promise<RoomData> {
    const res = await fetch(`/api/rooms/${roomCode}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.room;
  }

  // Subscribe to real-time events (hybrid SSE + optional Supabase Channel)
  static subscribe(roomCode: string, onUpdate: (room: RoomData) => void): () => void {
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);

    eventSource.onmessage = (event) => {
      try {
        const room = JSON.parse(event.data);
        if (room && room.roomCode) {
          onUpdate(room);
        }
      } catch (err) {
        // Heartbeat or parse error
      }
    };

    eventSource.onerror = () => {
      // EventSource will automatically retry connecting
    };

    // If Supabase is configured, also listen to Supabase Realtime channel for instant cross-server broadcast
    let supabaseChannel: any = null;
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabaseClient();
        if (sb) {
          supabaseChannel = sb.channel(`room_${roomCode}`)
            .on('broadcast', { event: 'room_update' }, (payload: any) => {
              if (payload.payload) {
                onUpdate(payload.payload);
              }
            })
            .subscribe();
        }
      } catch (err) {
        console.warn('Supabase realtime channel error:', err);
      }
    }

    return () => {
      eventSource.close();
      if (supabaseChannel && isSupabaseConfigured()) {
        try {
          const sb = getSupabaseClient();
          if (sb) {
            sb.removeChannel(supabaseChannel);
          }
        } catch (e) {
          // ignore
        }
      }
    };
  }
}
