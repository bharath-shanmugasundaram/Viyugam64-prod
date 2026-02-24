'use client';

import { X } from 'lucide-react';

interface GameOverModalProps {
    isOpen: boolean;
    result: 'checkmate-player' | 'checkmate-ai' | 'stalemate' | 'draw' | 'resign' | null;
    playerName: string;
    moveCount: number;
    onPlayAgain: () => void;
    onNewPlayer: () => void;
}

export default function GameOverModal({
    isOpen,
    result,
    playerName,
    moveCount,
    onPlayAgain,
    onNewPlayer,
}: GameOverModalProps) {
    if (!isOpen || !result) return null;

    const getTitle = () => {
        switch (result) {
            case 'checkmate-player': return '🎉 Congratulations!';
            case 'checkmate-ai': return 'Game Over';
            case 'stalemate': return 'Stalemate!';
            case 'draw': return 'Draw!';
            case 'resign': return 'Game Over';
            default: return 'Game Over';
        }
    };

    const getMessage = () => {
        switch (result) {
            case 'checkmate-player':
                return `${playerName}, you defeated the AI in ${moveCount} moves!`;
            case 'checkmate-ai':
                return `The AI wins by checkmate. Better luck next time!`;
            case 'stalemate':
                return 'The game ended in a stalemate. Neither side wins.';
            case 'draw':
                return 'The game ended in a draw.';
            case 'resign':
                return 'You resigned the game.';
            default:
                return '';
        }
    };

    const isWin = result === 'checkmate-player';

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2 className={`modal-title ${isWin ? 'win' : ''}`}>{getTitle()}</h2>
                </div>

                <p className="modal-message">{getMessage()}</p>

                {isWin && (
                    <div className="modal-stats">
                        <div className="stat">
                            <span className="stat-label">Moves</span>
                            <span className="stat-value">{moveCount}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Result</span>
                            <span className="stat-value">Victory ♟</span>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={onPlayAgain}>
                        Play Again
                    </button>
                    <button className="btn btn-secondary" onClick={onNewPlayer}>
                        New Player
                    </button>
                </div>
            </div>
        </div>
    );
}
