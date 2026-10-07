import React, { useState } from 'react';
import { Sparkles, Database, Volume2, VolumeX, QrCode, Home, Settings2, Users } from 'lucide-react';
import { sound } from '../lib/sound.ts';
import { isSupabaseConfigured } from '../lib/supabase.ts';

interface HeaderProps {
  roomCode?: string;
  onOpenSupabaseModal: () => void;
  onOpenQrModal?: () => void;
  onGoHome?: () => void;
  role?: 'teacher' | 'student' | null;
  participantCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  onOpenSupabaseModal,
  onOpenQrModal,
  onGoHome,
  role,
  participantCount,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [copied, setCopied] = useState(false);
  const isSbActive = isSupabaseConfigured();

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setSoundEnabled(sound.enabled);
    if (sound.enabled) {
      sound.pop();
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    sound.pop();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-base sm:text-lg tracking-tight text-white">
                <span>키워드 경험</span>
                <span className="text-amber-400">스피드게임</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                누구의 사연일까? 키워드 추리 퀴즈
              </p>
            </div>
          </button>

          {role && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              role === 'teacher'
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
            }`}>
              {role === 'teacher' ? '👨‍🏫 교사용 화면' : '🎒 학생 모드'}
            </span>
          )}
        </div>

        {/* Center / Room Code info if in room */}
        {roomCode && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              title="클릭하여 방 코드 복사"
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-amber-400/50 px-3 py-1.5 rounded-lg text-sm transition font-mono"
            >
              <span className="text-slate-400 text-xs">방 번호</span>
              <span className="font-bold text-amber-400 tracking-wider text-base">{roomCode}</span>
              <span className="text-[11px] text-slate-400 ml-1">{copied ? '✅ 복사됨' : '📋'}</span>
            </button>

            {onOpenQrModal && (
              <button
                onClick={onOpenQrModal}
                title="대형 QR 및 참여 링크"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
              >
                <QrCode className="w-4 h-4" />
              </button>
            )}

            {typeof participantCount === 'number' && (
              <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>{participantCount}명 참여 중</span>
              </div>
            )}
          </div>
        )}

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Supabase status badge button */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isSbActive
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
            }`}
            title="Supabase 백엔드 연동 설정 및 SQL 스키마"
          >
            <Database className={`w-3.5 h-3.5 ${isSbActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">
              {isSbActive ? 'Supabase 연동됨' : 'Supabase 설정'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isSbActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-amber-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Home button */}
          {roomCode && onGoHome && (
            <button
              onClick={onGoHome}
              title="홈으로 나가기"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-300 transition"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
