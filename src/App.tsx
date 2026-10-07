import React, { useState, useEffect, useRef } from 'react';
import type { RoomData, Participant } from './types/game.ts';
import { GameApi } from './lib/api.ts';
import { Header } from './components/Header.tsx';
import { HomeView } from './components/HomeView.tsx';
import { TeacherView } from './components/TeacherView.tsx';
import { StudentView } from './components/StudentView.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { QRModal } from './components/QRModal.tsx';
import { sound } from './lib/sound.ts';

export default function App() {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Real-time unsubscription ref
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to real-time events whenever room code is active
  useEffect(() => {
    if (!room?.roomCode) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    const unsub = GameApi.subscribe(room.roomCode, (updatedRoom) => {
      setRoom(updatedRoom);
      // Keep participant reference in sync
      if (participant && updatedRoom.participants[participant.id]) {
        setParticipant(updatedRoom.participants[participant.id]);
      }
    });

    unsubscribeRef.current = unsub;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [room?.roomCode, participant?.id]);

  // Create room as Teacher
  const handleCreateRoom = async (preferredCode?: string) => {
    setLoading(true);
    try {
      const newRoom = await GameApi.createRoom(preferredCode);
      setRoom(newRoom);
      setRole('teacher');
      setParticipant(null);
      sound.pop();
    } catch (err: any) {
      alert(err.message || '방 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Join room as Student
  const handleJoinRoom = async (roomCode: string, name: string, avatar: string) => {
    setLoading(true);
    try {
      const res = await GameApi.joinRoom(roomCode, name, avatar);
      setRoom(res.room);
      setParticipant(res.participant);
      setRole('student');
      sound.pop();
    } catch (err: any) {
      alert(err.message || '방 입장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo Launch
  const handleLaunchDemo = async () => {
    setLoading(true);
    try {
      const newRoom = await GameApi.createRoom();
      const seededRoom = await GameApi.demoSeed(newRoom.roomCode);
      setRoom(seededRoom);
      setRole('teacher');
      setParticipant(null);
      sound.correct();
    } catch (err: any) {
      alert(err.message || '데모 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    if (confirm('현재 게임 방에서 나가시겠습니까?')) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setRoom(null);
      setRole(null);
      setParticipant(null);
      sound.pop();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Header */}
      <Header
        roomCode={room?.roomCode}
        role={role}
        participantCount={room ? Object.keys(room.participants).length : undefined}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onGoHome={room ? handleGoHome : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!room ? (
          <HomeView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onLaunchDemo={handleLaunchDemo}
            loading={loading}
          />
        ) : role === 'teacher' ? (
          <TeacherView
            room={room}
            onRefreshRoom={setRoom}
            onOpenQrModal={() => setIsQrModalOpen(true)}
          />
        ) : participant ? (
          <StudentView
            room={room}
            participant={participant}
            onRefreshRoom={setRoom}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <p>
          교실 키워드 경험 공유 &amp; 스피드게임 &bull; 슈파베이스(Supabase) Realtime DB &amp; 실시간 멀티플레이어 지원
        </p>
      </footer>

      {/* Modals */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {room && (
        <QRModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          roomCode={room.roomCode}
        />
      )}
    </div>
  );
}
