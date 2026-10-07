import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Smartphone } from 'lucide-react';
import { sound } from '../lib/sound.ts';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?code=${roomCode}`
    : `https://example.com?code=${roomCode}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    sound.pop();
    setTimeout(() => setCopied(false), 2000);
  };

  // Google Charts QR code API image for zero-dependency high resolution display
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    joinUrl
  )}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-3 border border-amber-500/20">
          <Smartphone className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          스마트폰 카메라로 스캔하여 참여
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          QR코드를 스캔하거나 아래 방 번호를 입력하세요!
        </p>

        {/* Big QR Image Container */}
        <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mb-6 mx-auto border-4 border-amber-400/20">
          <img
            src={qrImgUrl}
            alt={`Room ${roomCode} QR`}
            className="w-56 h-56 object-contain rounded-lg"
          />
        </div>

        {/* Giant Room Code Display */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-slate-400 mb-1">방 접속 번호 (6자리)</div>
          <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 tracking-widest">
            {roomCode}
          </div>
        </div>

        {/* Copy Join Link Button */}
        <button
          onClick={copyUrl}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-sm font-semibold text-white transition cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
          <span>{copied ? '참여 링크 복사 완료!' : '참여 링크(URL) 복사하기'}</span>
        </button>
      </div>
    </div>
  );
};
