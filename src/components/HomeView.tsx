import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  School,
  User,
  ArrowRight,
  Zap,
  HelpCircle,
  Hash,
  Smile,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { sound } from '../lib/sound.ts';

const AVATARS = ['🦊', '🐼', '🦁', '🦄', '🚀', '🌟', '🍕', '🎨', '🎸', '⚽', '🐱', '🐶'];

interface HomeViewProps {
  onCreateRoom: (preferredCode?: string) => Promise<void>;
  onJoinRoom: (roomCode: string, name: string, avatar: string) => Promise<void>;
  onLaunchDemo: () => Promise<void>;
  loading: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateRoom,
  onJoinRoom,
  onLaunchDemo,
  loading,
}) => {
  const [tab, setTab] = useState<'student' | 'teacher'>('student');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦊');
  const [customTeacherCode, setCustomTeacherCode] = useState('');

  // Check URL query param for code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setRoomCodeInput(code.toUpperCase());
        setTab('student');
      }
    }
  }, []);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) {
      alert('방 번호(6자리)를 입력해주세요.');
      return;
    }
    if (!studentName.trim()) {
      alert('이름 또는 닉네임을 입력해주세요.');
      return;
    }
    sound.pop();
    onJoinRoom(roomCodeInput.trim().toUpperCase(), studentName.trim(), selectedAvatar);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.pop();
    onCreateRoom(customTeacherCode.trim() || undefined);
  };

  const handleDemoClick = () => {
    sound.pop();
    onLaunchDemo();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-10">
      {/* Hero Title */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>교실 &amp; 동아리 실시간 스피드 퀴즈</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          키워드 3~6개로 나의 경험을 공유하고,
          <br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            누구의 이야기인지 맞춰라!
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          학생들이 각자의 스마트폰이나 태블릿으로 키워드를 제출하면,
          선생님의 대형 스크린에서 실시간으로 취합되어 짜릿한 스피드 추리게임이 시작됩니다.
        </p>
      </div>

      {/* Main Choice Card */}
      <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('student');
              sound.pop();
            }}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'student'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>🎒 학생으로 참여하기</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('teacher');
              sound.pop();
            }}
            className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              tab === 'teacher'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <School className="w-4 h-4" />
            <span>👨‍🏫 선생님 방 만들기</span>
          </button>
        </div>

        {/* Tab 1: Student Join Form */}
        {tab === 'student' && (
          <form onSubmit={handleJoinSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>방 번호 (6자리)</span>
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="예: 742819"
                maxLength={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-lg font-bold tracking-widest text-center focus:outline-none focus:border-amber-400 uppercase transition placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                <span>이름 또는 닉네임</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="예: 3반 김민수, 날쌘돌이"
                maxLength={15}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition placeholder:text-slate-600"
              />
            </div>

            {/* Avatar Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                나만의 캐릭터 아바타 선택
              </label>
              <div className="flex flex-wrap gap-2 justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(av);
                      sound.pop();
                    }}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-amber-500/30 border-2 border-amber-400 scale-110 shadow-sm'
                        : 'bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !roomCodeInput.trim() || !studentName.trim()}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? '입장 중...' : '게임 입장하기'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Tab 2: Teacher Create Room Form */}
        {tab === 'teacher' && (
          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2 text-xs text-indigo-200">
              <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                <School className="w-4 h-4" />
                <span>선생님용 대형 스크린 / 스마트보드 모드</span>
              </div>
              <p className="leading-relaxed text-indigo-200/80">
                방을 생성하면 학생들이 접속할 수 있는 대형 방 번호와 QR코드가 표시됩니다.
                학생들이 키워드를 적어 내는 과정을 실시간으로 보며 퀴즈를 진행할 수 있습니다.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                원하는 방 번호 (선택사항, 비워두면 6자리 자동 생성)
              </label>
              <input
                type="text"
                value={customTeacherCode}
                onChange={(e) => setCustomTeacherCode(e.target.value.toUpperCase())}
                placeholder="예: CLASS1 (최대 8자리)"
                maxLength={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm uppercase focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-base shadow-xl shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? '방 생성 중...' : '새로운 게임 방 개설하기'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>

      {/* Instant Demo Launch Button (For Teachers testing immediately) */}
      <div className="max-w-xl mx-auto text-center space-y-2">
        <button
          onClick={handleDemoClick}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-slate-200 hover:text-white text-xs sm:text-sm font-bold shadow-lg transition cursor-pointer"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>⚡ 지금 혼자 바로 플레이해보기 (가상 학생 5명 자동 세팅)</span>
        </button>
        <p className="text-[11px] text-slate-500">
          다른 스마트폰 없이도 즉시 스피드 퀴즈 전체 과정을 1초 만에 체험할 수 있습니다.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg font-bold">
            1
          </div>
          <h3 className="font-bold text-sm text-white">3~6개 키워드 작성</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            나를 나타내는 3~6개의 단어와 재미있는 사연 힌트를 입력합니다.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-lg font-bold">
            2
          </div>
          <h3 className="font-bold text-sm text-white">실시간 교사 화면 취합</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            학생들의 제출 현황과 익명 키워드 구름이 교사 화면에 실시간으로 집계됩니다.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-lg font-bold">
            3
          </div>
          <h3 className="font-bold text-sm text-white">짜릿한 스피드 추리 퀴즈</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            순차적으로 공개되는 키워드를 보고 누구인지 빠르게 맞추어 랭킹을 겨룹니다.
          </p>
        </div>
      </div>
    </div>
  );
};
