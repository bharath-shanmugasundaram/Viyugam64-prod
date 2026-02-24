'use client';

import React, { useRef, useEffect } from 'react';

interface MoveHistoryProps {
    moves: string[];
}

// Map SAN piece letters to unicode symbols for display
const PIECE_ICON: Record<string, string> = {
    K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘',
};

function formatMove(san: string, isWhite: boolean): React.ReactNode {
    // Check if the move starts with a piece letter (K, Q, R, B, N)
    const pieceMatch = san.match(/^([KQRBN])(.*)/);
    const icons = isWhite
        ? { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘' }
        : { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞' };

    if (pieceMatch) {
        const [, pieceLetter, rest] = pieceMatch;
        return (
            <span className="move-notation">
                <span className="move-piece-icon">{icons[pieceLetter as keyof typeof icons]}</span>
                <span>{rest}</span>
            </span>
        );
    }

    // Pawn move or castling — no piece icon
    return <span className="move-notation">{san}</span>;
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [moves]);

    // Group moves into pairs (white, black)
    const movePairs: { number: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
        movePairs.push({
            number: Math.floor(i / 2) + 1,
            white: moves[i],
            black: moves[i + 1],
        });
    }

    // Determine which move index is "current" (last played)
    const lastMoveIdx = moves.length - 1;

    return (
        <div className="move-history-panel">
            <div className="move-history-header">
                <span className="move-history-title">Moves</span>
            </div>
            <div className="move-history-list" ref={scrollRef}>
                {movePairs.length === 0 ? (
                    <p className="move-empty">Game starting...</p>
                ) : (
                    movePairs.map((pair, idx) => {
                        const whiteIdx = idx * 2;
                        const blackIdx = idx * 2 + 1;
                        return (
                            <div key={idx} className="move-history-row">
                                <span className="move-num">{pair.number}.</span>
                                <span className={`move-cell white ${whiteIdx === lastMoveIdx ? 'current' : ''}`}>
                                    {formatMove(pair.white, true)}
                                </span>
                                <span className={`move-cell black ${blackIdx === lastMoveIdx ? 'current' : ''}`}>
                                    {pair.black ? formatMove(pair.black, false) : ''}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
