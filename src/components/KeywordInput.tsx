import React, { useState, KeyboardEvent } from 'react';
import { Tag, Plus, X, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';
import { sound } from '../lib/sound.ts';

interface KeywordInputProps {
  keywords: string[];
  onChangeKeywords: (keywords: string[]) => void;
  storyHint: string;
  onChangeStoryHint: (hint: string) => void;
  minKeywords?: number;
  maxKeywords?: number;
}

const INSPIRATION_SETS = [
  ['#제주도', '#스노클링', '#돌고래', '#핸드폰분실'],
  ['#축구결승전', '#승부차기', '#골대강타', '#눈물의치킨'],
  ['#첫베이킹', '#소금왕창', '#연기폭발', '#부모님경악'],
  ['#롤러코스터', '#안경날아감', '#눈감고탐', '#인생사진'],
  ['#캠핑', '#비바람', '#텐트날아감', '#라면3봉지'],
];

export const KeywordInput: React.FC<KeywordInputProps> = ({
  keywords,
  onChangeKeywords,
  storyHint,
  onChangeStoryHint,
  minKeywords = 3,
  maxKeywords = 6,
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const addKeyword = (text?: string) => {
    const raw = (text !== undefined ? text : currentInput).trim();
    if (!raw) return;

    const cleaned = raw.replace(/^#+/, '').trim();
    if (!cleaned) return;

    if (keywords.length >= maxKeywords) {
      setErrorMsg(`키워드는 최대 ${maxKeywords}개까지만 입력할 수 있습니다.`);
      sound.incorrect();
      return;
    }

    if (keywords.includes(cleaned)) {
      setErrorMsg('이미 입력한 키워드입니다.');
      sound.incorrect();
      return;
    }

    onChangeKeywords([...keywords, cleaned]);
    setCurrentInput('');
    setErrorMsg('');
    sound.pop();
  };

  const removeKeyword = (index: number) => {
    const next = [...keywords];
    next.splice(index, 1);
    onChangeKeywords(next);
    setErrorMsg('');
    sound.pop();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const applyInspiration = (set: string[]) => {
    const cleaned = set.map((s) => s.replace('#', ''));
    onChangeKeywords(cleaned);
    setErrorMsg('');
    sound.pop();
  };

  const isValidCount = keywords.length >= minKeywords && keywords.length <= maxKeywords;

  return (
    <div className="space-y-5">
      {/* Header and Requirement Badge */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-400" />
          <span>나의 경험을 나타내는 키워드 ({minKeywords}~{maxKeywords}개)</span>
        </label>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition ${
            isValidCount
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
              : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
          }`}
        >
          {isValidCount ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>
            {keywords.length} / {maxKeywords}개{' '}
            {isValidCount ? '(제출 가능)' : `(${minKeywords - keywords.length > 0 ? `${minKeywords - keywords.length}개 더 필요` : ''})`}
          </span>
        </span>
      </div>

      {/* Input Field with Add Button */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold select-none">
              #
            </span>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => {
                setCurrentInput(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              onKeyDown={handleKeyDown}
              disabled={keywords.length >= maxKeywords}
              placeholder={
                keywords.length >= maxKeywords
                  ? `최대 ${maxKeywords}개까지 입력되었습니다.`
                  : '키워드 입력 후 Enter 또는 추가 버튼 (예: 제주도)'
              }
              maxLength={20}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition placeholder:text-slate-500 disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={() => addKeyword()}
            disabled={!currentInput.trim() || keywords.length >= maxKeywords}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>추가</span>
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}
      </div>

      {/* Active Keyword Chips */}
      <div className="min-h-[64px] p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap gap-2 items-center">
        {keywords.length === 0 ? (
          <span className="text-xs text-slate-500 italic pl-1">
            아직 추가된 키워드가 없습니다. 위 입력창에서 키워드를 3~6개 넣어주세요!
          </span>
        ) : (
          keywords.map((kw, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-200 text-sm font-semibold animate-scaleIn shadow-sm"
            >
              <span className="text-amber-400 font-bold text-xs">#{idx + 1}</span>
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => removeKeyword(idx)}
                className="p-0.5 rounded-md hover:bg-amber-500/30 text-amber-300 hover:text-white transition cursor-pointer"
                title="키워드 삭제"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Inspiration Quick Suggestions */}
      {keywords.length === 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>아이디어가 떠오르지 않는다면? 예시를 눌러보세요:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INSPIRATION_SETS.slice(0, 3).map((set, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => applyInspiration(set)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-amber-400/50 transition cursor-pointer"
              >
                {set.slice(0, 3).join(' ')}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional One-Line Story / Hint */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
        <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>나만의 한 줄 뒷이야기 (선택)</span>
          <span className="text-[11px] text-slate-500 font-normal">정답 공개 후 친구들에게 보여집니다</span>
        </label>
        <textarea
          value={storyHint}
          onChange={(e) => onChangeStoryHint(e.target.value)}
          placeholder="그때 무슨 일이 있었는지 살짝 적어보세요! (예: 스노클링하다가 돌고래 보고 흥분해서 폰을 빠뜨렸던 날...)"
          rows={2}
          maxLength={150}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-amber-400 transition placeholder:text-slate-500 resize-none"
        />
      </div>
    </div>
  );
};
