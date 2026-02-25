'use client';

import { Bot, User } from 'lucide-react';
import { PieceSymbol, Color } from 'chess.js';

interface GameInfoProps {
    playerName: string;
    currentTurn: Color;
    isAIThinking: boolean;
    capturedByPlayer: PieceSymbol[];
    capturedByAI: PieceSymbol[];
    isGameOver: boolean;
    isCheck: boolean;
}

// Map piece symbols to unicode characters
const PIECE_UNICODE_WHITE: Record<string, string> = {
    p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔',
};
const PIECE_UNICODE_BLACK: Record<string, string> = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
};

// Piece values for material advantage calculation
const PIECE_VALUE: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

function CapturedPieces({ pieces, color }: { pieces: PieceSymbol[]; color: 'white' | 'black' }) {
    if (pieces.length === 0) return null;
    const unicodeMap = color === 'white' ? PIECE_UNICODE_WHITE : PIECE_UNICODE_BLACK;

    // Sort pieces by value (queens first, then rooks, etc.)
    const sorted = [...pieces].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);

    // Calculate material advantage
    const advantage = sorted.reduce((acc, p) => acc + PIECE_VALUE[p], 0);

    return (
        <div className="captured-row">
            <span className="captured-pieces-inline">
                {sorted.map((p, i) => (
                    <span key={i} className="captured-piece-icon">{unicodeMap[p]}</span>
                ))}
            </span>
            {advantage > 0 && <span className="material-advantage">+{advantage}</span>}
        </div>
    );
}

/** Format seconds to M:SS or 0:SS */
function formatTime(seconds: number): string {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Player bar — displayed above or below the board */
export function PlayerBar({
    name,
    isAI,
    isActive,
    isThinking,
    capturedPieces,
    capturedColor,
    position,
    timeLeft,
}: {
    name: string;
    isAI: boolean;
    isActive: boolean;
    isThinking?: boolean;
    capturedPieces: PieceSymbol[];
    capturedColor: 'white' | 'black';
    position: 'top' | 'bottom';
    timeLeft?: number; // seconds remaining
}) {
    const isLowTime = timeLeft !== undefined && timeLeft <= 30;
    const isCriticalTime = timeLeft !== undefined && timeLeft <= 10;

    return (
        <div className={`player-bar ${position} ${isActive ? 'active' : ''}`}>
            <div className="player-bar-left">
                <div className={`player-avatar ${isAI ? 'ai' : 'human'}`}>
                    {isAI ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className="player-bar-info">
                    <span className="player-bar-name">{name}</span>
                    {isThinking && (
                        <span className="thinking-inline">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </span>
                    )}
                </div>
                <CapturedPieces pieces={capturedPieces} color={capturedColor} />
            </div>
            {timeLeft !== undefined && (
                <div className={`chess-clock ${isActive ? 'clock-active' : 'clock-inactive'} ${isLowTime ? 'clock-low' : ''} ${isCriticalTime ? 'clock-critical' : ''}`}>
                    {formatTime(timeLeft)}
                </div>
            )}
        </div>
    );
}

/** Check alert strip */
export function CheckAlert({ isCheck, isGameOver }: { isCheck: boolean; isGameOver: boolean }) {
    if (!isCheck || isGameOver) return null;
    return <div className="check-alert-strip">⚠ Check!</div>;
}

export default function GameInfo({
    playerName,
    currentTurn,
    isAIThinking,
    capturedByPlayer,
    capturedByAI,
    isGameOver,
    isCheck,
}: GameInfoProps) {
    return (
        <>
            {isCheck && !isGameOver && (
                <div className="check-alert">⚠ Check!</div>
            )}
        </>
    );
}

// Re-export props type for use in game page
export type { GameInfoProps };
