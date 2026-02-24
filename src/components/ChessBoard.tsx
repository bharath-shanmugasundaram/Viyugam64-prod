'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess, Square, Move } from 'chess.js';

// Inline types matching react-chessboard v5 API
interface PieceData { pieceType: string }
interface DraggingPieceData extends PieceData { isSparePiece: boolean; position: string }
type SquareClickArgs = { piece: PieceData | null; square: string };
type PieceDropArgs = { piece: DraggingPieceData; sourceSquare: string; targetSquare: string | null };
type CanDragArgs = { isSparePiece: boolean; piece: PieceData; square: string | null };

interface ChessBoardComponentProps {
    game: Chess;
    onMove: (move: Move) => void;
    isPlayerTurn: boolean;
    boardOrientation: 'white' | 'black';
    lastMove: { from: Square; to: Square } | null;
    boardWidth: number;
}

export default function ChessBoardComponent({
    game,
    onMove,
    isPlayerTurn,
    boardOrientation,
    lastMove,
    boardWidth,
}: ChessBoardComponentProps) {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Square[]>([]);

    // Get legal moves for a square
    const getLegalMoves = useCallback(
        (square: Square): Square[] => {
            try {
                const moves = game.moves({ square, verbose: true });
                return moves.map((m) => m.to);
            } catch {
                return [];
            }
        },
        [game]
    );

    // Handle square click for click-to-move
    const onSquareClick = useCallback(
        ({ square }: SquareClickArgs) => {
            const sq = square as Square;
            if (!isPlayerTurn) return;

            // If a piece is already selected and this is a valid target
            if (selectedSquare && legalMoves.includes(sq)) {
                try {
                    // Validate move on a temporary copy — never mutate the game prop
                    const tempGame = new Chess(game.fen());
                    const move = tempGame.move({
                        from: selectedSquare,
                        to: sq,
                        promotion: 'q',
                    });
                    if (move) {
                        onMove(move);
                        setSelectedSquare(null);
                        setLegalMoves([]);
                        return;
                    }
                } catch {
                    // Invalid move
                }
            }

            // Select a new piece
            const piece = game.get(sq);
            if (piece && piece.color === 'b') {
                setSelectedSquare(sq);
                setLegalMoves(getLegalMoves(sq));
            } else {
                setSelectedSquare(null);
                setLegalMoves([]);
            }
        },
        [isPlayerTurn, selectedSquare, legalMoves, game, onMove, getLegalMoves]
    );

    // Handle drag-and-drop
    const onPieceDrop = useCallback(
        ({ piece, sourceSquare, targetSquare }: PieceDropArgs): boolean => {
            if (!isPlayerTurn || !targetSquare) return false;

            // Only allow black pieces to be moved by player (lowercase = black in FEN)
            const pieceType = piece.pieceType || '';
            if (pieceType === pieceType.toUpperCase()) return false;

            try {
                // Validate move on a temporary copy — never mutate the game prop
                const tempGame = new Chess(game.fen());
                const move = tempGame.move({
                    from: sourceSquare as Square,
                    to: targetSquare as Square,
                    promotion: 'q',
                });

                if (move) {
                    onMove(move);
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return true;
                }
            } catch {
                // Invalid move
            }
            return false;
        },
        [isPlayerTurn, game, onMove]
    );

    // Prevent dragging when not player's turn or for white pieces
    const canDragPiece = useCallback(
        ({ piece }: CanDragArgs): boolean => {
            if (!isPlayerTurn) return false;
            const pieceType = piece.pieceType || '';
            return pieceType === pieceType.toLowerCase();
        },
        [isPlayerTurn]
    );

    // Custom square styles
    const customSquareStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {};

        // Last move highlight
        if (lastMove) {
            styles[lastMove.from] = {
                backgroundColor: 'rgba(255, 255, 0, 0.25)',
            };
            styles[lastMove.to] = {
                backgroundColor: 'rgba(255, 255, 0, 0.35)',
            };
        }

        // Selected square
        if (selectedSquare) {
            styles[selectedSquare] = {
                backgroundColor: 'rgba(255, 255, 0, 0.5)',
            };
        }

        // Legal move dots
        for (const sq of legalMoves) {
            const pieceOnSquare = game.get(sq as Square);
            if (pieceOnSquare) {
                styles[sq] = {
                    background: 'radial-gradient(circle, transparent 55%, rgba(0,0,0,0.25) 55%)',
                    borderRadius: '50%',
                };
            } else {
                styles[sq] = {
                    background: 'radial-gradient(circle, rgba(0,0,0,0.2) 22%, transparent 22%)',
                };
            }
        }

        // Check indicator
        if (game.inCheck()) {
            const turn = game.turn();
            const board = game.board();
            for (const row of board) {
                for (const p of row) {
                    if (p && p.type === 'k' && p.color === turn) {
                        styles[p.square] = {
                            ...styles[p.square],
                            background: 'radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0.2) 60%, transparent 70%)',
                        };
                    }
                }
            }
        }

        return styles;
    }, [lastMove, selectedSquare, legalMoves, game]);

    // Neo piece set (Chess.com style)
    const neoPieces = useMemo(() => {
        const pieceMap: Record<string, string> = {
            wP: 'wp', wN: 'wn', wB: 'wb', wR: 'wr', wQ: 'wq', wK: 'wk',
            bP: 'bp', bN: 'bn', bB: 'bb', bR: 'br', bQ: 'bq', bK: 'bk',
        };

        const pieces: Record<string, (props?: { square?: string }) => React.JSX.Element> = {};

        for (const [key, filename] of Object.entries(pieceMap)) {
            pieces[key] = (props) => (
                <img
                    src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${filename}.png`}
                    alt={key}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                    }}
                />
            );
        }

        return pieces;
    }, []);

    return (
        <div className="chess-board-container" style={{ width: boardWidth, height: boardWidth }}>
            <Chessboard
                options={{
                    id: 'PlayVsAI',
                    position: game.fen(),
                    onPieceDrop,
                    onSquareClick,
                    canDragPiece,
                    boardOrientation,
                    squareStyles: customSquareStyles,
                    pieces: neoPieces,
                    boardStyle: {
                        borderRadius: '6px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    },
                    darkSquareStyle: { backgroundColor: '#779952' },
                    lightSquareStyle: { backgroundColor: '#edeed1' },
                    animationDurationInMs: 200,
                }}
            />
        </div>
    );
}
