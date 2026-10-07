export interface Participant {
  id: string;
  name: string;
  avatar: string;
  score: number;
  hasSubmitted: boolean;
  isOnline: boolean;
  joinedAt: number;
}

export interface Submission {
  id: string;
  participantId: string;
  authorName: string;
  authorAvatar: string;
  keywords: string[]; // 3 to 6 keywords
  storyHint?: string; // Optional backstory or hint
  category?: string;
  createdAt: number;
}

export type GamePhase =
  | 'LOBBY' // Waiting for students to join
  | 'SUBMISSION' // Students are writing 3~6 keywords
  | 'ROUND_PREVIEW' // Teacher introduces round
  | 'ROUND_PLAY' // Timer running, keywords shown, students guessing
  | 'ROUND_REVEAL' // Author revealed, story shown, points awarded
  | 'ROUND_LEADERBOARD' // Standings after round
  | 'GAME_OVER'; // Final podium

export interface Guess {
  participantId: string;
  selectedAuthorId: string;
  timestamp: number;
  timeTakenMs: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface RoundState {
  roundNumber: number;
  totalRounds: number;
  currentSubmissionId: string;
  currentSubmission?: Submission;
  revealedKeywordCount: number; // For progressive reveal (e.g. 1 by 1)
  timeRemaining: number;
  totalTime: number;
  isTimerActive: boolean;
  guesses: Record<string, Guess>; // participantId -> Guess
  correctAuthorId: string;
  correctAuthorName: string;
  options: { id: string; name: string; avatar: string }[]; // 4 candidates
}

export interface GameSettings {
  roundTimeSeconds: number; // 10, 15, 20, 30
  revealMode: 'ALL_AT_ONCE' | 'PROGRESSIVE'; // show all keywords or 1 every few seconds
  progressiveIntervalSec: number; // e.g. 3s
  minKeywords: number; // 3
  maxKeywords: number; // 6
  maxPointsPerRound: number; // 1000
  speedBonusMultiplier: number;
}

export interface RoomData {
  roomCode: string;
  hostId: string;
  phase: GamePhase;
  settings: GameSettings;
  participants: Record<string, Participant>;
  submissions: Record<string, Submission>;
  currentRound?: RoundState;
  playedSubmissionIds: string[];
  createdAt: number;
  backendMode: 'supabase' | 'local';
}
