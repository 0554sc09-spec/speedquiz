import React, { useState } from 'react';
import { X, Check, Copy, Database, Server, RefreshCw, ExternalLink, HelpCircle } from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
} from '../lib/supabase.ts';
import { sound } from '../lib/sound.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    sound.pop();
    const result = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTesting(false);
    setTestResult(result);
    if (result.success) {
      sound.correct();
    } else {
      sound.incorrect();
    }
  };

  const handleSave = () => {
    saveSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim() });
    setSaveSuccess(true);
    sound.correct();
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    sound.pop();
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setSqlCopied(true);
    sound.pop();
    setTimeout(() => setSqlCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                슈파베이스(Supabase) 연동 설정
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Realtime DB
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                수업 중 실시간 학생 키워드 취합 및 스피드 퀴즈 동기화에 사용됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-start gap-3">
            <Server className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-200">
                {url && anonKey ? '🟢 Supabase 클라우드 모드 활성화됨' : '⚡ 내장 실시간 서버(Instant Local) 작동 중'}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Supabase를 아직 생성하지 않았더라도 내장 실시간 서버로 즉시 플레이할 수 있습니다!
                완전한 독립 클라우드 DB를 원하시면 아래에 Supabase URL과 Key를 등록하세요.
              </p>
            </div>
          </div>

          {/* Form inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Supabase Project URL</span>
                <span className="text-[11px] text-slate-500 font-normal">예: https://abcdefghijklmn.supabase.co</span>
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.supabase.co"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Supabase Anon (Public) Key</span>
                <span className="text-[11px] text-slate-500 font-normal">Project Settings &gt; API &gt; Project API keys</span>
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Test connection & result */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing || !url || !anonKey}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 disabled:opacity-50 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              {testing ? '연결 확인 중...' : '연결 테스트'}
            </button>

            {testResult && (
              <span className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                testResult.success
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {testResult.message}
              </span>
            )}
          </div>

          {/* Quick Setup Guide & SQL schema */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-200">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>Supabase 테이블 자동 생성 SQL</span>
              </div>
              <button
                onClick={copySql}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-emerald-900/40 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-800/40 transition"
              >
                {sqlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {sqlCopied ? 'SQL 복사 완료!' : 'SQL 쿼리 복사'}
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Supabase 콘솔의 <strong>SQL Editor</strong>에서 새 쿼리를 열고 복사한 코드를 실행(RUN)하면,
              방(rooms), 학생 목록(participants), 키워드 제출(submissions) 테이블과 Realtime 채널이 자동 구축됩니다.
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-400 max-h-32 overflow-y-auto">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 transition"
          >
            설정 초기화
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              닫기
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : null}
              {saveSuccess ? '저장되었습니다!' : '설정 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
