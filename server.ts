import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RoomData, Participant, Submission, GamePhase, GameSettings, RoundState } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// In-memory room store (real-time classroom state)
const rooms: Map<string, RoomData> = new Map();
// SSE listener connections: roomCode -> Set of Response objects
const sseClients: Map<string, Set<express.Response>> = new Map();

function broadcastRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const clients = sseClients.get(roomCode);
  if (clients && clients.size > 0) {
    const payload = `data: ${JSON.stringify(room)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (e) {
        clients.delete(res);
      }
    }
  }
}

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const DEFAULT_SETTINGS: GameSettings = {
  roundTimeSeconds: 15,
  revealMode: 'PROGRESSIVE',
  progressiveIntervalSec: 2,
  minKeywords: 3,
  maxKeywords: 6,
  maxPointsPerRound: 1000,
  speedBonusMultiplier: 1.5,
};

// --- API Endpoints ---

// Create Room
app.post('/api/rooms', (req, res) => {
  const { hostId, preferredCode, settings } = req.body;
  let roomCode = preferredCode ? String(preferredCode).toUpperCase().trim() : generateRoomCode();
  
  // ensure unique
  while (rooms.has(roomCode) && !preferredCode) {
    roomCode = generateRoomCode();
  }

  const room: RoomData = {
    roomCode,
    hostId: hostId || 'host_' + Math.random().toString(36).substring(2, 9),
    phase: 'LOBBY',
    settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    participants: {},
    submissions: {},
    playedSubmissionIds: [],
    createdAt: Date.now(),
    backendMode: 'local',
  };

  rooms.set(roomCode, room);
  res.json({ success: true, room });
});

// Get Room
app.get('/api/rooms/:roomCode', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }
  res.json({ success: true, room });
});

// SSE Real-time Events Stream
app.get('/api/rooms/:roomCode/events', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(roomCode)) {
    sseClients.set(roomCode, new Set());
  }
  sseClients.get(roomCode)!.add(res);

  // Send initial state immediately
  if (room) {
    res.write(`data: ${JSON.stringify(room)}\n\n`);
  }

  // Heartbeat interval to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(roomCode);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(roomCode);
      }
    }
  });
});

// Join Room as Participant
app.post('/api/rooms/:roomCode/join', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  const { id, name, avatar } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: '이름(닉네임)을 입력해주세요.' });
  }

  const participantId = id || 'p_' + Math.random().toString(36).substring(2, 9);
  const existing = room.participants[participantId];

  const participant: Participant = {
    id: participantId,
    name: name.trim(),
    avatar: avatar || '🦊',
    score: existing ? existing.score : 0,
    hasSubmitted: existing ? existing.hasSubmitted : false,
    isOnline: true,
    joinedAt: existing ? existing.joinedAt : Date.now(),
  };

  room.participants[participantId] = participant;
  broadcastRoom(roomCode);

  res.json({ success: true, participant, room });
});

// Submit Keywords & Story
app.post('/api/rooms/:roomCode/submit', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  const { participantId, keywords, storyHint, category } = req.body;
  const participant = room.participants[participantId];
  if (!participant) {
    return res.status(404).json({ success: false, message: '참가자 정보를 찾을 수 없습니다.' });
  }

  const cleanedKeywords = (keywords || [])
    .map((k: string) => String(k).trim())
    .filter((k: string) => k.length > 0);

  if (cleanedKeywords.length < 3 || cleanedKeywords.length > 6) {
    return res.status(400).json({
      success: false,
      message: '키워드는 3개 이상 6개 이하로 입력해야 합니다.',
    });
  }

  const submissionId = 'sub_' + participantId;
  const submission: Submission = {
    id: submissionId,
    participantId,
    authorName: participant.name,
    authorAvatar: participant.avatar,
    keywords: cleanedKeywords,
    storyHint: storyHint ? String(storyHint).trim() : '',
    category: category ? String(category).trim() : '경험담',
    createdAt: Date.now(),
  };

  room.submissions[submissionId] = submission;
  participant.hasSubmitted = true;

  broadcastRoom(roomCode);
  res.json({ success: true, submission, room });
});

// Update Game Phase
app.post('/api/rooms/:roomCode/phase', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  const { phase } = req.body as { phase: GamePhase };
  if (!phase) {
    return res.status(400).json({ success: false, message: '변경할 단계가 지정되지 않았습니다.' });
  }

  room.phase = phase;
  broadcastRoom(roomCode);
  res.json({ success: true, room });
});

// Start / Setup Next Round
app.post('/api/rooms/:roomCode/next-round', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  // Find unplayed submissions
  const submissionList = Object.values(room.submissions);
  const unplayed = submissionList.filter((s) => !room.playedSubmissionIds.includes(s.id));

  if (unplayed.length === 0) {
    room.phase = 'GAME_OVER';
    broadcastRoom(roomCode);
    return res.json({ success: true, finished: true, room });
  }

  // Pick one random submission from unplayed
  const nextSub = unplayed[Math.floor(Math.random() * unplayed.length)];
  room.playedSubmissionIds.push(nextSub.id);

  // Generate 4 candidate options (correct author + 3 other participants/distractors)
  const allParticipants = Object.values(room.participants);
  const authorParticipant = room.participants[nextSub.participantId] || {
    id: nextSub.participantId,
    name: nextSub.authorName,
    avatar: nextSub.authorAvatar,
  };

  const otherParticipants = allParticipants.filter((p) => p.id !== nextSub.participantId);
  // Shuffle others and take up to 3
  const shuffledOthers = [...otherParticipants].sort(() => 0.5 - Math.random()).slice(0, 3);
  
  // Combine & shuffle
  const options = [
    { id: authorParticipant.id, name: authorParticipant.name, avatar: authorParticipant.avatar },
    ...shuffledOthers.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })),
  ].sort(() => 0.5 - Math.random());

  const roundNumber = room.playedSubmissionIds.length;
  const totalRounds = submissionList.length;

  const roundState: RoundState = {
    roundNumber,
    totalRounds,
    currentSubmissionId: nextSub.id,
    currentSubmission: nextSub,
    revealedKeywordCount: room.settings.revealMode === 'ALL_AT_ONCE' ? nextSub.keywords.length : 1,
    timeRemaining: room.settings.roundTimeSeconds,
    totalTime: room.settings.roundTimeSeconds,
    isTimerActive: true,
    guesses: {},
    correctAuthorId: nextSub.participantId,
    correctAuthorName: nextSub.authorName,
    options,
  };

  room.currentRound = roundState;
  room.phase = 'ROUND_PLAY';

  broadcastRoom(roomCode);
  res.json({ success: true, room });
});

// Reveal progressive keyword
app.post('/api/rooms/:roomCode/reveal-step', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound || !room.currentRound.currentSubmission) {
    return res.status(404).json({ success: false, message: '진행 중인 라운드가 없습니다.' });
  }

  const max = room.currentRound.currentSubmission.keywords.length;
  if (room.currentRound.revealedKeywordCount < max) {
    room.currentRound.revealedKeywordCount += 1;
    broadcastRoom(roomCode);
  }

  res.json({ success: true, room });
});

// Submit a Guess
app.post('/api/rooms/:roomCode/guess', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound) {
    return res.status(404).json({ success: false, message: '진행 중인 라운드가 없습니다.' });
  }

  const { participantId, selectedAuthorId, timeTakenMs } = req.body;
  if (!participantId || !selectedAuthorId) {
    return res.status(400).json({ success: false, message: '필수 데이터가 누락되었습니다.' });
  }

  // Prevent multiple guesses in same round
  if (room.currentRound.guesses[participantId]) {
    return res.json({ success: false, message: '이미 이번 라운드에 응답하셨습니다.', room });
  }

  const isCorrect = selectedAuthorId === room.currentRound.correctAuthorId;
  let pointsEarned = 0;

  if (isCorrect) {
    // Speed-based scoring: max 1000, decaying with time taken
    const totalMs = (room.currentRound.totalTime || 15) * 1000;
    const elapsed = Math.min(Math.max(timeTakenMs || 1000, 500), totalMs);
    const speedRatio = Math.max(0, (totalMs - elapsed) / totalMs);
    pointsEarned = Math.round(500 + 500 * speedRatio);

    if (room.participants[participantId]) {
      room.participants[participantId].score += pointsEarned;
    }
  }

  room.currentRound.guesses[participantId] = {
    participantId,
    selectedAuthorId,
    timestamp: Date.now(),
    timeTakenMs: timeTakenMs || 0,
    isCorrect,
    pointsEarned,
  };

  broadcastRoom(roomCode);
  res.json({ success: true, isCorrect, pointsEarned, room });
});

// Update Settings
app.post('/api/rooms/:roomCode/settings', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  room.settings = { ...room.settings, ...req.body };
  broadcastRoom(roomCode);
  res.json({ success: true, room });
});

// Seed Demo Students & Experiences (for instant testing by teacher)
app.post('/api/rooms/:roomCode/demo-seed', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  const demoStudents = [
    {
      id: 'demo_1',
      name: '지우 (탐험대장)',
      avatar: '🦊',
      keywords: ['제주도', '스노클링', '돌고래', '핸드폰분실'],
      storyHint: '스노클링하다가 바다에서 돌고래 떼를 보고 신나서 핸드폰을 바다에 빠뜨렸던 눈물의 추억...',
    },
    {
      id: 'demo_2',
      name: '민서 (베이커)',
      avatar: '🐼',
      keywords: ['초코쿠키', '소금과설탕', '연기폭발', '부모님경악', '소방차'],
      storyHint: '처음 베이킹할 때 설탕 대신 소금을 들이붓고 태워서 주방이 난리 났던 날입니다!',
    },
    {
      id: 'demo_3',
      name: '도윤 (축구왕)',
      avatar: '🦁',
      keywords: ['승부차기', '마지막키커', '골대강타', '눈물바다', '치킨파티'],
      storyHint: '반 대항전 결승 마지막 승부차기에서 골대를 맞췄는데 친구들이 위로해주며 치킨 사줌!',
    },
    {
      id: 'demo_4',
      name: '하은 (음악천재)',
      avatar: '🦄',
      keywords: ['버스킹', '가사까먹음', '외계어', '박수갈채'],
      storyHint: '학교 축제 버스킹 무대에서 2절 가사를 까먹어서 랄랄라 외계어로 불렀는데 호응 대박 남!',
    },
    {
      id: 'demo_5',
      name: '서준 (캠핑러)',
      avatar: '⛺',
      keywords: ['텐트설치', '비바람', '침낭물바다', '라면3봉지'],
      storyHint: '여름 캠핑 갔다가 폭우로 텐트가 날아갈 뻔해서 차 안에서 라면 3봉지 끓여 먹은 생존기!',
    },
  ];

  demoStudents.forEach((student) => {
    room.participants[student.id] = {
      id: student.id,
      name: student.name,
      avatar: student.avatar,
      score: 0,
      hasSubmitted: true,
      isOnline: true,
      joinedAt: Date.now(),
    };

    const subId = 'sub_' + student.id;
    room.submissions[subId] = {
      id: subId,
      participantId: student.id,
      authorName: student.name,
      authorAvatar: student.avatar,
      keywords: student.keywords,
      storyHint: student.storyHint,
      category: '학생 일상 & 추억',
      createdAt: Date.now(),
    };
  });

  broadcastRoom(roomCode);
  res.json({ success: true, count: demoStudents.length, room });
});

// Reset Game
app.post('/api/rooms/:roomCode/reset', (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const room = rooms.get(roomCode);
  if (!room) {
    return res.status(404).json({ success: false, message: '방을 찾을 수 없습니다.' });
  }

  room.phase = 'LOBBY';
  room.playedSubmissionIds = [];
  room.currentRound = undefined;
  Object.values(room.participants).forEach((p) => {
    p.score = 0;
  });

  broadcastRoom(roomCode);
  res.json({ success: true, room });
});

// Vite middleware & Static server setup
async function start() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
