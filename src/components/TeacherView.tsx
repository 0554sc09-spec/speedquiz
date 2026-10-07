import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Users,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  Trophy,
  Award,
  ChevronRight,
  PlusCircle,
  Eye,
  CheckCircle2,
  Sliders,
  Share2,
  Volume2,
  Mic,
  Copy,
  Check,
  Flame,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import type { RoomData, GameSettings, Submission } from '../types/game.ts';
import { GameApi } from '../lib/api.ts';
import { sound } from '../lib/sound.ts';

interface TeacherViewProps {
  room: RoomData;
  onRefreshRoom: (room: RoomData) => void;
  onOpenQrModal: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  room,
  onRefreshRoom,
  onOpenQrModal,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [albumCopied, setAlbumCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<GameSettings>(room.settings);
  const [seeding, setSeeding] = useState(false);

  // Timer reference for Round Play
  const [timeLeft, setTimeLeft] = useState<number>(room.settings.roundTimeSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressiveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const participantsList = Object.values(room.participants);
  const submissionsList = Object.values(room.submissions);
  const submittedCount = submissionsList.length;
  const totalStudents = participantsList.length;

  // Confetti on game over and reveal
  useEffect(() => {
    if (room.phase === 'ROUND_REVEAL') {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
      sound.fanfare();
    } else if (room.phase === 'GAME_OVER') {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 },
      });
      sound.fanfare();
    }
  }, [room.phase]);

  // Round play countdown timer management
  useEffect(() => {
    if (room.phase === 'ROUND_PLAY' && room.currentRound) {
      setTimeLeft(room.settings.roundTimeSeconds);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeUp();
            return 0;
          }
          if (prev <= 4) {
            sound.urgentTick();
          } else {
            sound.tick();
          }
          return prev - 1;
        });
      }, 1000);

      // Progressive keyword reveal timer
      if (room.settings.revealMode === 'PROGRESSIVE') {
        if (progressiveTimerRef.current) clearInterval(progressiveTimerRef.current);
        const intervalSec = room.settings.progressiveIntervalSec || 2;
        progressiveTimerRef.current = setInterval(() => {
          GameApi.revealStep(room.roomCode)
            .then((updated) => onRefreshRoom(updated))
            .catch(() => {});
        }, intervalSec * 1000);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressiveTimerRef.current) clearInterval(progressiveTimerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressiveTimerRef.current) clearInterval(progressiveTimerRef.current);
    };
  }, [room.phase, room.currentRound?.roundNumber]);

  const handleTimeUp = async () => {
    sound.incorrect();
    try {
      const updated = await GameApi.setPhase(room.roomCode, 'ROUND_REVEAL');
      onRefreshRoom(updated);
    } catch (e) {
      console.warn(e);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopiedCode(true);
    sound.pop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStartGame = async () => {
    if (submissionsList.length === 0) {
      alert('최소 1명 이상의 학생이 키워드를 제출해야 게임을 시작할 수 있습니다.');
      return;
    }
    sound.pop();
    try {
      const updated = await GameApi.nextRound(room.roomCode);
      onRefreshRoom(updated);
    } catch (err: any) {
      alert(err.message || '게임 시작 실패');
    }
  };

  const handleNextRound = async () => {
    sound.pop();
    try {
      const updated = await GameApi.nextRound(room.roomCode);
      onRefreshRoom(updated);
    } catch (err: any) {
      alert(err.message || '다음 라운드 진행 실패');
    }
  };

  const handleRevealNow = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressiveTimerRef.current) clearInterval(progressiveTimerRef.current);
    sound.pop();
    try {
      const updated = await GameApi.setPhase(room.roomCode, 'ROUND_REVEAL');
      onRefreshRoom(updated);
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleAdd10Sec = () => {
    setTimeLeft((prev) => prev + 10);
    sound.pop();
  };

  const handleAddDemoStudents = async () => {
    setSeeding(true);
    sound.pop();
    try {
      const updated = await GameApi.demoSeed(room.roomCode);
      onRefreshRoom(updated);
      sound.correct();
    } catch (err: any) {
      alert(err.message || '데모 생성 실패');
    } finally {
      setSeeding(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const updated = await GameApi.updateSettings(room.roomCode, settingsForm);
      onRefreshRoom(updated);
      setShowSettings(false);
      sound.correct();
    } catch (err: any) {
      alert(err.message || '설정 저장 실패');
    }
  };

  const handleResetGame = async () => {
    if (!confirm('게임을 처음 대기 상태로 초기화하시겠습니까? (제출된 키워드는 유지됩니다)')) return;
    try {
      const updated = await GameApi.resetRoom(room.roomCode);
      onRefreshRoom(updated);
      sound.pop();
    } catch (err: any) {
      alert(err.message || '초기화 실패');
    }
  };

  const copyAlbumText = () => {
    const text = submissionsList
      .map(
        (s, i) =>
          `[${i + 1}] ${s.authorName} (${s.authorAvatar}): #${s.keywords.join(' #')}\n- 사연: ${
            s.storyHint || '(없음)'
          }`
      )
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setAlbumCopied(true);
    sound.pop();
    setTimeout(() => setAlbumCopied(false), 2000);
  };

  // Anonymized keyword pool for teaser wall
  const allSubmittedKeywords = submissionsList.flatMap((s) => s.keywords);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* 1. LOBBY & SUBMISSION PHASE (교실 스마트보드/스크린 대기화면) */}
      {(room.phase === 'LOBBY' || room.phase === 'SUBMISSION') && (
        <div className="space-y-6">
          {/* Hero Room Board */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="text-center md:text-left space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>실시간 학생 키워드 취합 중</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  학생들이 키워드를 작성 중입니다!
                </h1>
                <p className="text-sm text-slate-300 max-w-xl">
                  스크린의 방 번호나 QR코드로 접속하여, 각자 자신을 표현하는{' '}
                  <strong className="text-amber-400">3~6개의 키워드</strong>를 제출하도록 안내해주세요.
                </p>
              </div>

              {/* Big Room Code Box */}
              <div className="bg-slate-950/90 border border-slate-700/80 rounded-2xl p-5 text-center min-w-[260px] shadow-xl">
                <div className="text-xs font-semibold text-slate-400 mb-1">학생 접속 방 번호</div>
                <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 tracking-widest my-1">
                  {room.roomCode}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    onClick={copyCode}
                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
                  >
                    {copiedCode ? '✅ 복사됨' : '📋 코드 복사'}
                  </button>
                  <button
                    onClick={onOpenQrModal}
                    className="text-xs py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
                  >
                    대형 QR 보기
                  </button>
                </div>
              </div>
            </div>

            {/* Submission Progress Bar */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>제출 현황: {submittedCount} / {totalStudents > 0 ? totalStudents : submittedCount}명 완료</span>
                </span>
                <span className="text-amber-400 font-mono">
                  {totalStudents > 0
                    ? `${Math.round((submittedCount / totalStudents) * 100)}%`
                    : submittedCount > 0 ? '100%' : '0%'}
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      totalStudents > 0
                        ? Math.min(100, Math.round((submittedCount / totalStudents) * 100))
                        : submittedCount > 0 ? 100 : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Row: Start Game & Quick Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddDemoStudents}
                disabled={seeding}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                title="혼자서도 테스트해볼 수 있도록 가상 학생 5명의 키워드를 추가합니다"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>가상 학생 5명 자동 추가 (빠른 체험)</span>
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>게임 시간/방식 설정</span>
              </button>
            </div>

            <button
              onClick={handleStartGame}
              disabled={submittedCount === 0}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {submittedCount === 0
                  ? '학생 제출 대기 중...'
                  : `스피드 퀴즈 시작! (${submittedCount}개 경험 준비됨)`}
              </span>
            </button>
          </div>

          {/* Settings Drawer (Collapsible) */}
          {showSettings && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-scaleIn">
              <div className="font-bold text-sm text-white flex items-center justify-between">
                <span>퀴즈 라운드 세부 설정</span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  닫기
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    라운드당 제한 시간
                  </label>
                  <select
                    value={settingsForm.roundTimeSeconds}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        roundTimeSeconds: Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value={10}>10초 (초고속 스피드)</option>
                    <option value={15}>15초 (권장 표준)</option>
                    <option value={20}>20초 (여유 있는 추리)</option>
                    <option value={30}>30초 (충분한 시간)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    키워드 공개 방식
                  </label>
                  <select
                    value={settingsForm.revealMode}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        revealMode: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    <option value="PROGRESSIVE">2초마다 1개씩 순차 공개 (박진감 UP!)</option>
                    <option value="ALL_AT_ONCE">한 번에 전체 공개</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
              >
                설정 저장 적용
              </button>
            </div>
          )}

          {/* Anonymized Keyword Wall Teaser */}
          {allSubmittedKeywords.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>실시간 모인 키워드 월 (익명 미리보기)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  총 {allSubmittedKeywords.length}개 키워드 수집됨
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {allSubmittedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-amber-300/90 text-xs font-medium animate-fadeIn"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student Roster Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>접속한 학생 목록 ({participantsList.length}명)</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                실시간 동기화 중
              </span>
            </div>

            {participantsList.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                <p className="text-slate-400 text-sm">
                  아직 접속한 학생이 없습니다. 방 번호를 안내하거나 위 데모 추가 버튼을 눌러보세요!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {participantsList.map((p) => {
                  const sub = Object.values(room.submissions).find(
                    (s) => s.participantId === p.id
                  );
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        sub
                          ? 'bg-emerald-950/30 border-emerald-700/50'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{p.avatar}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-white truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {sub ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> {sub.keywords.length}개 완료
                              </span>
                            ) : (
                              <span className="text-slate-500">작성 중...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ROUND_PLAY PHASE (스피드 퀴즈 진행 - 대형 스크린 메인 화면) */}
      {room.phase === 'ROUND_PLAY' && room.currentRound && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
            {/* Header: Round indicator & Countdown Timer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  라운드 {room.currentRound.roundNumber} / {room.currentRound.totalRounds}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  누구의 이야기일까요? 맞혀보세요!
                </h2>
              </div>

              {/* Giant Countdown Ring / Badge */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-mono font-black text-2xl sm:text-3xl border shadow-lg ${
                    timeLeft <= 5
                      ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                      : 'bg-slate-950 text-amber-400 border-slate-700'
                  }`}
                >
                  <Clock className={`w-6 h-6 ${timeLeft <= 5 ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
                  <span>{timeLeft}초</span>
                </div>
              </div>
            </div>

            {/* KEYWORDS EXHIBITION (3~6 Keywords Large Cards) */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>힌트 키워드 ({room.currentRound.revealedKeywordCount} / {room.currentRound.currentSubmission?.keywords.length}개 공개됨)</span>
                {room.settings.revealMode === 'PROGRESSIVE' && (
                  <span className="text-amber-400 text-xs">✨ 순차 공개 중</span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {room.currentRound.currentSubmission?.keywords
                  .slice(0, room.currentRound.revealedKeywordCount)
                  .map((kw, i) => (
                    <div
                      key={i}
                      className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-rose-500/15 border-2 border-amber-400/50 text-center shadow-lg animate-scaleIn transform hover:scale-[1.02] transition"
                    >
                      <div className="text-xs font-bold text-amber-400/80 mb-1">
                        KEYWORD #{i + 1}
                      </div>
                      <div className="text-lg sm:text-2xl font-black text-white tracking-wide">
                        {kw}
                      </div>
                    </div>
                  ))}

                {/* Placeholders for upcoming progressive keywords */}
                {room.currentRound.currentSubmission &&
                  Array.from({
                    length:
                      room.currentRound.currentSubmission.keywords.length -
                      room.currentRound.revealedKeywordCount,
                  }).map((_, idx) => (
                    <div
                      key={'hidden_' + idx}
                      className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center flex flex-col items-center justify-center text-slate-600 border-dashed"
                    >
                      <div className="text-xs font-mono">잠시 후 공개...</div>
                      <div className="text-xl font-bold mt-1">???</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Live Guesses Status Bar */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-300">
                  학생 실시간 응답 현황 (
                  {Object.keys(room.currentRound.guesses).length} / {participantsList.length}명 투표 완료)
                </span>
                <span className="text-amber-400 font-mono">
                  {participantsList.length > 0
                    ? `${Math.round(
                        (Object.keys(room.currentRound.guesses).length /
                          participantsList.length) *
                          100
                      )}%`
                    : '0%'}
                </span>
              </div>

              {/* Mini avatar bulbs */}
              <div className="flex flex-wrap gap-2 pt-1">
                {participantsList.map((p) => {
                  const hasGuessed = Boolean(room.currentRound?.guesses[p.id]);
                  return (
                    <div
                      key={p.id}
                      className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
                        hasGuessed
                          ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-semibold scale-105'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                      title={hasGuessed ? `${p.name}: 응답 완료` : `${p.name}: 고민 중`}
                    >
                      <span>{p.avatar}</span>
                      <span className="truncate max-w-[80px]">{p.name}</span>
                      {hasGuessed && <span>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teacher Fast Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleAdd10Sec}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
              >
                +10초 연장
              </button>

              <button
                onClick={handleRevealNow}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                정답 즉시 공개하기 🛎️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROUND_REVEAL PHASE (정답 공개 & 사연 토크) */}
      {room.phase === 'ROUND_REVEAL' && room.currentRound && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 text-center animate-scaleIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>정답 공개!</span>
          </div>

          {/* Author Spotlight */}
          <div className="space-y-4 max-w-xl mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 border-4 border-amber-300 flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-orange-500/30">
              {room.currentRound.currentSubmission?.authorAvatar}
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-400">
                이 경험의 진짜 주인공은...
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white mt-1">
                {room.currentRound.correctAuthorName}
              </h1>
            </div>

            {/* Keywords Recap */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {room.currentRound.currentSubmission?.keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm"
                >
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* Backstory Card with Mic Icon for Class Discussion */}
          {room.currentRound.currentSubmission?.storyHint && (
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-left max-w-2xl mx-auto space-y-2 shadow-inner">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Mic className="w-4 h-4" />
                <span>{room.currentRound.correctAuthorName} 학생의 이야기:</span>
              </div>
              <p className="text-base text-slate-200 leading-relaxed font-medium">
                &quot;{room.currentRound.currentSubmission.storyHint}&quot;
              </p>
              <p className="text-[11px] text-slate-500 italic pt-1">
                💡 선생님: 주인공 학생에게 마이크를 넘겨 경험담을 직접 들어보세요!
              </p>
            </div>
          )}

          {/* Fast Guessers Hall of Fame */}
          <div className="max-w-md mx-auto bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
            <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span>빠른 정답 탐정들 ⚡</span>
              <span className="text-emerald-400 text-[11px]">
                {Object.values(room.currentRound.guesses).filter((g) => g.isCorrect).length}명 정답
              </span>
            </div>
            <div className="space-y-1.5">
              {Object.values(room.currentRound.guesses)
                .filter((g) => g.isCorrect)
                .sort((a, b) => a.timeTakenMs - b.timeTakenMs)
                .slice(0, 3)
                .map((g, rank) => {
                  const guesser = room.participants[g.participantId];
                  return (
                    <div
                      key={g.participantId}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900 border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">#{rank + 1}</span>
                        <span>{guesser?.avatar}</span>
                        <span className="text-slate-200 font-semibold">{guesser?.name}</span>
                      </div>
                      <div className="text-slate-400 font-mono">
                        {(g.timeTakenMs / 1000).toFixed(1)}초 (+{g.pointsEarned}점)
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => GameApi.setPhase(room.roomCode, 'ROUND_LEADERBOARD').then(onRefreshRoom)}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 transition cursor-pointer"
            >
              중간 순위표 보기 🏆
            </button>

            <button
              onClick={handleNextRound}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-sm sm:text-base shadow-xl transition cursor-pointer flex items-center gap-2"
            >
              <span>다음 문제로 이동</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. ROUND_LEADERBOARD PHASE (중간 순위표) */}
      {room.phase === 'ROUND_LEADERBOARD' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400" />
              <div>
                <h2 className="text-2xl font-black text-white">실시간 순위표</h2>
                <p className="text-xs text-slate-400">현재까지 획득한 누적 점수 순위</p>
              </div>
            </div>

            <button
              onClick={handleNextRound}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition cursor-pointer flex items-center gap-1.5"
            >
              <span>다음 문제 시작</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5">
            {participantsList
              .sort((a, b) => b.score - a.score)
              .map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                    idx === 0
                      ? 'bg-amber-500/20 border-amber-400/80 text-white'
                      : idx === 1
                      ? 'bg-slate-800/80 border-slate-600 text-slate-100'
                      : idx === 2
                      ? 'bg-orange-950/30 border-orange-700/60 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono font-black text-lg w-7 text-center text-amber-400">
                      {idx + 1}
                    </span>
                    <span className="text-2xl">{p.avatar}</span>
                    <span className="font-bold text-base">{p.name}</span>
                  </div>
                  <div className="font-mono font-black text-xl text-amber-400">
                    {p.score.toLocaleString()}점
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. GAME_OVER PHASE (최종 시상식 & 우리 반 키워드 앨범) */}
      {room.phase === 'GAME_OVER' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Podium Celebration Box */}
          <div className="bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 border border-indigo-800/50 rounded-3xl p-6 sm:p-12 text-center shadow-2xl space-y-6">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
            <h1 className="text-3xl sm:text-5xl font-black text-white">
              최종 시상식! 우리 반 최고의 키워드 탐정은?
            </h1>
            <p className="text-slate-300 text-sm max-w-lg mx-auto">
              친구들의 경험을 가장 빠르고 정확하게 알아맞힌 학생들을 축하합니다!
            </p>

            {/* Podium Visual (Top 3) */}
            <div className="flex items-end justify-center gap-3 sm:gap-6 pt-6 max-w-2xl mx-auto">
              {/* 2nd place */}
              {participantsList.sort((a, b) => b.score - a.score)[1] && (
                <div className="flex-1 text-center space-y-2">
                  <div className="text-3xl sm:text-4xl">
                    {participantsList.sort((a, b) => b.score - a.score)[1].avatar}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                    {participantsList.sort((a, b) => b.score - a.score)[1].name}
                  </div>
                  <div className="bg-slate-700/80 border border-slate-600 rounded-t-2xl p-4 h-28 flex flex-col justify-center">
                    <div className="text-2xl font-black text-slate-300">2등 🥈</div>
                    <div className="text-xs font-mono text-slate-300 mt-1">
                      {participantsList.sort((a, b) => b.score - a.score)[1].score.toLocaleString()}점
                    </div>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {participantsList.sort((a, b) => b.score - a.score)[0] && (
                <div className="flex-1 text-center space-y-2">
                  <div className="text-4xl sm:text-5xl animate-pulse">
                    {participantsList.sort((a, b) => b.score - a.score)[0].avatar}
                  </div>
                  <div className="font-black text-sm sm:text-base text-amber-300 truncate">
                    {participantsList.sort((a, b) => b.score - a.score)[0].name}
                  </div>
                  <div className="bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-2xl p-4 h-36 flex flex-col justify-center text-slate-950 shadow-2xl">
                    <div className="text-3xl font-black">1등 🏆</div>
                    <div className="text-xs font-mono font-black mt-1">
                      {participantsList.sort((a, b) => b.score - a.score)[0].score.toLocaleString()}점
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {participantsList.sort((a, b) => b.score - a.score)[2] && (
                <div className="flex-1 text-center space-y-2">
                  <div className="text-3xl sm:text-4xl">
                    {participantsList.sort((a, b) => b.score - a.score)[2].avatar}
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-200 truncate">
                    {participantsList.sort((a, b) => b.score - a.score)[2].name}
                  </div>
                  <div className="bg-amber-900/60 border border-amber-800 rounded-t-2xl p-4 h-20 flex flex-col justify-center">
                    <div className="text-xl font-black text-amber-400">3등 🥉</div>
                    <div className="text-xs font-mono text-amber-300 mt-1">
                      {participantsList.sort((a, b) => b.score - a.score)[2].score.toLocaleString()}점
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6">
              <button
                onClick={handleResetGame}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs sm:text-sm font-bold text-slate-200 transition cursor-pointer flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>처음 대기실로 돌아가 다시 플레이</span>
              </button>
            </div>
          </div>

          {/* Classroom Memory Album: All Students' Keyword Stories */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  우리 반 경험 모음 앨범 ({submissionsList.length}편)
                </h3>
              </div>
              <button
                onClick={copyAlbumText}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
              >
                {albumCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{albumCopied ? '전체 복사됨!' : '전체 사연 텍스트 복사'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submissionsList.map((sub, i) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{sub.authorAvatar}</span>
                    <span className="font-bold text-sm text-white">{sub.authorName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sub.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                  {sub.storyHint && (
                    <p className="text-xs text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed italic">
                      &quot;{sub.storyHint}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
