import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Award,
  Flame,
  HelpCircle,
  Eye,
  Check,
  UserCheck,
} from 'lucide-react';
import type { RoomData, Participant, Submission } from '../types/game.ts';
import { KeywordInput } from './KeywordInput.tsx';
import { GameApi } from '../lib/api.ts';
import { sound } from '../lib/sound.ts';

interface StudentViewProps {
  room: RoomData;
  participant: Participant;
  onRefreshRoom: (room: RoomData) => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ room, participant, onRefreshRoom }) => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [storyHint, setStoryHint] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Guessing state
  const [selectedGuessId, setSelectedGuessId] = useState<string | null>(null);
  const [hasGuessedThisRound, setHasGuessedThisRound] = useState(false);
  const roundStartTimeRef = useRef<number>(Date.now());

  // Check if current participant already submitted in room
  const existingSubmission = Object.values(room.submissions).find(
    (s) => s.participantId === participant.id
  );

  useEffect(() => {
    if (existingSubmission && keywords.length === 0 && !isEditing) {
      setKeywords(existingSubmission.keywords);
      setStoryHint(existingSubmission.storyHint || '');
    }
  }, [existingSubmission, isEditing]);

  // Reset guess selection when round changes
  useEffect(() => {
    if (room.currentRound) {
      roundStartTimeRef.current = Date.now();
      const existingGuess = room.currentRound.guesses[participant.id];
      if (existingGuess) {
        setSelectedGuessId(existingGuess.selectedAuthorId);
        setHasGuessedThisRound(true);
      } else {
        setSelectedGuessId(null);
        setHasGuessedThisRound(false);
      }
    }
  }, [room.currentRound?.roundNumber, room.phase]);

  // Confetti on reveal if correct
  useEffect(() => {
    if (room.phase === 'ROUND_REVEAL' && room.currentRound) {
      const myGuess = room.currentRound.guesses[participant.id];
      if (myGuess?.isCorrect || room.currentRound.correctAuthorId === participant.id) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        sound.correct();
      }
    }
  }, [room.phase]);

  const handleSubmitKeywords = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.length < 3 || keywords.length > 6) {
      alert('키워드는 3개 이상 6개 이하로 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      sound.pop();
      const res = await GameApi.submitKeywords(
        room.roomCode,
        participant.id,
        keywords,
        storyHint,
        '학생 경험담'
      );
      onRefreshRoom(res.room);
      setIsEditing(false);
      sound.correct();
    } catch (err: any) {
      alert(err.message || '제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakeGuess = async (candidateId: string) => {
    if (hasGuessedThisRound || !room.currentRound) return;
    const timeTaken = Date.now() - roundStartTimeRef.current;
    setSelectedGuessId(candidateId);
    setHasGuessedThisRound(true);
    sound.pop();

    try {
      const res = await GameApi.submitGuess(
        room.roomCode,
        participant.id,
        candidateId,
        timeTaken
      );
      onRefreshRoom(res.room);
    } catch (err: any) {
      console.warn('Guess submission error:', err);
    }
  };

  const isMySubmissionThisRound =
    room.currentRound?.correctAuthorId === participant.id;

  // Render by Phase
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Student Profile Card Bar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
            {participant.avatar}
          </div>
          <div>
            <div className="font-bold text-white text-base flex items-center gap-2">
              <span>{participant.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-normal">
                학생
              </span>
            </div>
            <div className="text-xs text-slate-400">
              방 번호: <span className="font-mono text-amber-400 font-bold">{room.roomCode}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 font-medium">현재 점수</div>
          <div className="font-black text-xl text-amber-400 flex items-center justify-end gap-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>{participant.score.toLocaleString()}점</span>
          </div>
        </div>
      </div>

      {/* PHASE 1 & 2: LOBBY & SUBMISSION PHASE */}
      {(room.phase === 'LOBBY' || room.phase === 'SUBMISSION') && (
        <>
          {participant.hasSubmitted && !isEditing ? (
            /* Already submitted waiting screen */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto text-3xl animate-bounce">
                ✅
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  키워드 제출이 완료되었습니다!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  선생님이 대형 스크린에서 스피드게임을 시작할 때까지 잠시만 대기해주세요.
                </p>
              </div>

              {/* Submitted keywords preview */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-2.5">
                <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>내가 제출한 키워드</span>
                  <span className="text-amber-400">{keywords.length}개</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
                {storyHint && (
                  <div className="text-xs text-slate-400 pt-2 border-t border-slate-800/80 italic">
                    &quot;{storyHint}&quot;
                  </div>
                )}
              </div>

              {/* Status info & edit button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                >
                  키워드 수정하기
                </button>
              </div>
            </div>
          ) : (
            /* Keyword input form */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>3~6개 키워드로 경험 적기</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  나의 경험을 맞춰봐!
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  친구들이 힌트를 보고 나를 알아맞힐 수 있도록, 흥미로운 키워드를 3~6개 입력해주세요.
                </p>
              </div>

              <form onSubmit={handleSubmitKeywords} className="space-y-6">
                <KeywordInput
                  keywords={keywords}
                  onChangeKeywords={setKeywords}
                  storyHint={storyHint}
                  onChangeStoryHint={setStoryHint}
                  minKeywords={room.settings.minKeywords || 3}
                  maxKeywords={room.settings.maxKeywords || 6}
                />

                <button
                  type="submit"
                  disabled={submitting || keywords.length < 3 || keywords.length > 6}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-black text-base shadow-xl shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span>
                    {submitting ? '제출 중...' : '키워드 제출하고 준비 완료하기'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* PHASE 3: ROUND_PLAY (스피드 퀴즈 진행 중) */}
      {room.phase === 'ROUND_PLAY' && room.currentRound && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Round Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Round {room.currentRound.roundNumber} / {room.currentRound.totalRounds}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                누구의 경험일까요?
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Clock className="w-4 h-4 animate-spin" />
              <span>선생님 화면의 타이머를 주목하세요!</span>
            </div>
          </div>

          {/* Keywords Display for this round */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>공개된 경험 키워드</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {room.currentRound.currentSubmission?.keywords
                .slice(0, room.currentRound.revealedKeywordCount)
                .map((kw, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/20 border border-amber-500/40 text-center font-bold text-amber-200 text-sm sm:text-base shadow-sm animate-scaleIn"
                  >
                    <span className="text-amber-400/80 text-xs block mb-0.5">#{idx + 1}</span>
                    <span>{kw}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* If THIS IS MY SUBMISSION */}
          {isMySubmissionThisRound ? (
            <div className="p-6 rounded-2xl bg-indigo-950/50 border border-indigo-700/50 text-center space-y-3">
              <div className="text-4xl">🤫</div>
              <h3 className="text-lg font-black text-indigo-200">
                쉿! 이건 바로 내 경험이에요!
              </h3>
              <p className="text-xs sm:text-sm text-indigo-300/80 leading-relaxed max-w-md mx-auto">
                친구들이 과연 나를 맞출 수 있을까요? 표정을 숨기고 지켜보세요!
                <br />
                (주인공 보너스 1,000점이 자동으로 지급됩니다 🎉)
              </p>
            </div>
          ) : (
            /* Guesser Multiple Choice Buttons */
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>누구의 이야기일까요? 정답을 고르세요:</span>
                {hasGuessedThisRound && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>응답 완료!</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {room.currentRound.options.map((option) => {
                  const isSelected = selectedGuessId === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleMakeGuess(option.id)}
                      disabled={hasGuessedThisRound}
                      className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg shadow-amber-500/10 scale-[1.02]'
                          : hasGuessedThisRound
                          ? 'bg-slate-950/60 border-slate-800 text-slate-500 opacity-60'
                          : 'bg-slate-950 hover:bg-slate-800/80 border-slate-700 hover:border-amber-400/60 text-slate-200 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0 border border-slate-700">
                        {option.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base truncate">{option.name}</div>
                        <div className="text-xs text-slate-400">
                          {isSelected ? '선택한 답변' : '친구 선택'}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {hasGuessedThisRound && (
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-400 font-medium">
                    답변을 제출했습니다. 선생님 화면에서 정답 공개를 기다려주세요!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PHASE 4: ROUND_REVEAL (정답 공개) */}
      {room.phase === 'ROUND_REVEAL' && room.currentRound && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              정답 공개!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-2">
              <span>주인공은 바로</span>
              <span className="text-amber-400">
                {room.currentRound.correctAuthorName}
              </span>
              <span>!</span>
            </h2>
          </div>

          {/* Feedback for current participant */}
          {isMySubmissionThisRound ? (
            <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200">
              <div className="text-2xl mb-1">👑</div>
              <div className="font-bold text-base">당신이 바로 이 이야기의 주인공!</div>
              <div className="text-xs text-amber-300/80 mt-1">
                주인공 보너스 +1,000점을 받았습니다! 친구들에게 뒷이야기를 들려주세요.
              </div>
            </div>
          ) : (
            <div>
              {selectedGuessId === room.currentRound.correctAuthorId ? (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200">
                  <CheckCircle className="w-8 h-8 mx-auto mb-1 text-emerald-400" />
                  <div className="font-bold text-lg">정답입니다! 🎉</div>
                  <div className="text-xs text-emerald-300/90 mt-1">
                    빠른 추리로 점수를 획득했습니다!
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300">
                  <XCircle className="w-8 h-8 mx-auto mb-1 text-rose-400" />
                  <div className="font-bold text-base">아쉬워요! 이번엔 빗나갔네요.</div>
                  <div className="text-xs text-slate-400 mt-1">
                    다음 문제에서 스피드 역전을 노려보세요!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backstory card */}
          {room.currentRound.currentSubmission?.storyHint && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-1.5">
              <div className="text-xs font-bold text-slate-400">
                {room.currentRound.correctAuthorName} 학생의 한 줄 이야기:
              </div>
              <p className="text-sm text-slate-200 leading-relaxed italic">
                &quot;{room.currentRound.currentSubmission.storyHint}&quot;
              </p>
            </div>
          )}

          <div className="text-xs text-slate-400">
            선생님이 다음 문제 또는 순위표로 이동할 때까지 잠시 대기하세요.
          </div>
        </div>
      )}

      {/* PHASE 5: ROUND_LEADERBOARD & GAME_OVER */}
      {(room.phase === 'ROUND_LEADERBOARD' || room.phase === 'GAME_OVER') && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-black text-white">
              {room.phase === 'GAME_OVER' ? '최종 게임 종료!' : '중간 순위 현황'}
            </h2>
            <p className="text-xs text-slate-400">
              우리 반 최고의 키워드 탐정은 누구일까요?
            </p>
          </div>

          {/* Top 5 list */}
          <div className="space-y-2">
            {Object.values(room.participants)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map((p, rank) => {
                const isMe = p.id === participant.id;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                      isMe
                        ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-base w-6 text-center text-amber-400">
                        {rank + 1}
                      </span>
                      <span className="text-xl">{p.avatar}</span>
                      <span className="text-sm">{p.name}</span>
                      {isMe && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold">
                          나
                        </span>
                      )}
                    </div>
                    <div className="font-mono font-bold text-amber-400">
                      {p.score.toLocaleString()}점
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
