'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLeaderboard, LeaderboardEntry } from '@/lib/api';
import LeaderboardTable from '@/components/LeaderboardTable';
import { Trophy, Swords, BookOpen, Brain, Cpu } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load leaderboard preview
    getLeaderboard(5).then(setLeaderboard).catch(() => { });
    // Restore last player name
    const saved = localStorage.getItem('chess-player-name');
    if (saved) setPlayerName(saved);
  }, []);

  const handleStart = () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError('Please enter your name to start');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setLoading(true);
    localStorage.setItem('chess-player-name', trimmed);
    router.push(`/game?player=${encodeURIComponent(trimmed)}&difficulty=${difficulty}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="landing-logo">♔</div>
        <h1 className="landing-title">Viyugam 64</h1>
        <p className="landing-subtitle">Challenge the AI. Prove your mastery.</p>
      </header>

      <main className="landing-main">
        {/* Start Card */}
        <div className="start-card">
          <div className="input-group">
            <label className="input-label" htmlFor="player-name">
              Player Name
            </label>
            <input
              id="player-name"
              type="text"
              className="input-field"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              maxLength={24}
              autoComplete="off"
              autoFocus
            />
            {error && <p className="input-error">{error}</p>}
          </div>

          {/* Difficulty Selector */}
          <div className="difficulty-selector">
            <label className="input-label">Difficulty</label>
            <div className="difficulty-options">
              <button
                className={`difficulty-btn ${difficulty === 'easy' ? 'selected' : ''}`}
                onClick={() => setDifficulty('easy')}
                type="button"
              >
                <Brain size={20} />
                <div className="difficulty-btn-text">
                  <span className="difficulty-btn-title">Easy</span>
                </div>
              </button>
              <button
                className={`difficulty-btn ${difficulty === 'hard' ? 'selected' : ''}`}
                onClick={() => setDifficulty('hard')}
                type="button"
              >
                <Cpu size={20} />
                <div className="difficulty-btn-text">
                  <span className="difficulty-btn-title">Hard</span>
                </div>
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary btn-large start-btn"
            onClick={handleStart}
            disabled={loading}
          >
            {loading ? (
              'Starting...'
            ) : (
              <>
                <Swords size={18} />
                Start Game
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="instructions">
          <h3>
            <BookOpen size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
            {' '}How to Play
          </h3>
          <ul>
            <li>You play as Black, the AI plays as White</li>
            <li>Drag and drop or click to move your pieces</li>
            <li>Legal moves are highlighted when you select a piece</li>
            <li>Defeat the AI in the fewest moves to top the leaderboard</li>
            <li>Your wins are automatically saved and ranked</li>
          </ul>
        </div>

        {/* Leaderboard Preview */}
        <div className="leaderboard-preview">
          <h3>
            <Trophy size={16} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--accent)' }} />
            {' '}Top Players
          </h3>
          <LeaderboardTable entries={leaderboard} compact />
          <a href="/leaderboard" className="view-leaderboard-link">
            View Full Leaderboard →
          </a>
        </div>
      </main>
    </div>
  );
}
