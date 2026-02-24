'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Chess, Move, Square, PieceSymbol } from 'chess.js';
import dynamic from 'next/dynamic';
import { PlayerBar } from '@/components/GameInfo';
import MoveHistory from '@/components/MoveHistory';
import GameOverModal from '@/components/GameOverModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getBestMove } from '@/lib/engine';
import { soundManager } from '@/lib/sounds';
import { addLeaderboardEntry } from '@/lib/api';
import { RotateCcw, LogOut, Volume2, VolumeX, Settings } from 'lucide-react';

// Dynamically import ChessBoard to avoid SSR issues with react-chessboard
const ChessBoardComponent = dynamic(() => import('@/components/ChessBoard'), {
    ssr: false,
    loading: () => (
        <div className="board-placeholder">
            <span>Loading board...</span>
        </div>
    ),
});

function GameContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const playerName = searchParams.get('player') || 'Player';

    // Game state
    const [game, setGame] = useState(new Chess());
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
    const [isAIThinking, setIsAIThinking] = useState(false);
    const [capturedByPlayer, setCapturedByPlayer] = useState<PieceSymbol[]>([]);
    const [capturedByAI, setCapturedByAI] = useState<PieceSymbol[]>([]);
    const [gameResult, setGameResult] = useState<
        'checkmate-player' | 'checkmate-ai' | 'stalemate' | 'draw' | 'resign' | null
    >(null);
    const [showGameOver, setShowGameOver] = useState(false);
    const [showConfirmRestart, setShowConfirmRestart] = useState(false);
    const [showConfirmQuit, setShowConfirmQuit] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [boardWidth, setBoardWidth] = useState(560);

    const gameRef = useRef(game);
    gameRef.current = game;
    const isAIThinkingRef = useRef(false);

    // Initialize sound and calculate board size
    useEffect(() => {
        soundManager.init();
        soundManager.play('gameStart');

        const updateBoardSize = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            if (vw <= 768) {
                // Mobile: board fills width with padding
                setBoardWidth(Math.min(vw - 24, vh - 200));
            } else {
                // Desktop: board fills left area, max 720px
                const availableHeight = vh - 120; // header + player bars
                const availableWidth = Math.min(vw * 0.58, 720);
                setBoardWidth(Math.min(availableWidth, availableHeight));
            }
        };

        updateBoardSize();
        window.addEventListener('resize', updateBoardSize);
        return () => window.removeEventListener('resize', updateBoardSize);
    }, []);

    // AI makes the first move (White)
    useEffect(() => {
        if (game.moveNumber() === 1 && game.turn() === 'w' && !isAIThinkingRef.current) {
            makeAIMove();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkGameEnd = useCallback((currentGame: Chess) => {
        if (currentGame.isCheckmate()) {
            const result = currentGame.turn() === 'w' ? 'checkmate-player' : 'checkmate-ai';
            setGameResult(result);
            setShowGameOver(true);
            soundManager.play('checkmate');

            if (result === 'checkmate-player') {
                const playerMoves = Math.ceil(currentGame.moveNumber() / 2);
                addLeaderboardEntry({
                    player_name: playerName,
                    moves: playerMoves,
                    date_played: new Date().toISOString(),
                });
            }
            return true;
        }

        if (currentGame.isStalemate()) {
            setGameResult('stalemate');
            setShowGameOver(true);
            return true;
        }

        if (currentGame.isDraw()) {
            setGameResult('draw');
            setShowGameOver(true);
            return true;
        }

        if (currentGame.inCheck()) {
            soundManager.play('check');
        }

        return false;
    }, [playerName]);

    const makeAIMove = useCallback(async () => {
        if (isAIThinkingRef.current) return;
        isAIThinkingRef.current = true;
        setIsAIThinking(true);

        try {
            const result = await getBestMove(gameRef.current.fen(), 3);
            if (!result.bestMove) return;

            const newGame = new Chess(gameRef.current.fen());
            const move = newGame.move(result.bestMove);

            if (move) {
                if (move.captured) {
                    setCapturedByAI(prev => [...prev, move.captured as PieceSymbol]);
                    soundManager.play('capture');
                } else {
                    soundManager.play('move');
                }

                setGame(newGame);
                setMoveHistory(prev => [...prev, move.san]);
                setLastMove({ from: move.from, to: move.to });
                checkGameEnd(newGame);
            }
        } catch (e) {
            console.error('AI move error:', e);
        } finally {
            isAIThinkingRef.current = false;
            setIsAIThinking(false);
        }
    }, [checkGameEnd]);

    const handlePlayerMove = useCallback(
        (move: Move) => {
            if (move.captured) {
                setCapturedByPlayer(prev => [...prev, move.captured as PieceSymbol]);
                soundManager.play('capture');
            } else {
                soundManager.play('move');
            }

            const newGame = new Chess(game.fen());
            try {
                newGame.move({ from: move.from, to: move.to, promotion: move.promotion });
            } catch (e) {
                console.error('Move application error:', e);
                return;
            }

            setGame(newGame);
            setMoveHistory(prev => [...prev, move.san]);
            setLastMove({ from: move.from, to: move.to });

            if (!checkGameEnd(newGame)) {
                setTimeout(() => makeAIMove(), 100);
            }
        },
        [game, checkGameEnd, makeAIMove]
    );

    const resetGame = useCallback(() => {
        const newGame = new Chess();
        setGame(newGame);
        setMoveHistory([]);
        setLastMove(null);
        setCapturedByPlayer([]);
        setCapturedByAI([]);
        setGameResult(null);
        setShowGameOver(false);
        setShowConfirmRestart(false);
        isAIThinkingRef.current = false;
        setIsAIThinking(false);
        soundManager.play('gameStart');

        setTimeout(() => makeAIMove(), 500);
    }, [makeAIMove]);

    const toggleSound = () => {
        const enabled = soundManager.toggle();
        setSoundEnabled(enabled);
    };

    const playerMoveCount = Math.ceil(game.moveNumber() / 2);

    return (
        <div className="game-container">
            {/* Game Layout — Chess.com style */}
            <div className="game-main">
                {/* Board Column */}
                <div className="board-column" style={{ width: boardWidth }}>
                    {/* Opponent (AI) bar — top */}
                    <PlayerBar
                        name="Viyugam AI"
                        isAI={true}
                        isActive={game.turn() === 'w' && !game.isGameOver()}
                        isThinking={isAIThinking}
                        capturedPieces={capturedByAI}
                        capturedColor="black"
                        position="top"
                    />

                    {/* Chess Board */}
                    <ChessBoardComponent
                        game={game}
                        onMove={handlePlayerMove}
                        isPlayerTurn={game.turn() === 'b' && !isAIThinking && !game.isGameOver()}
                        boardOrientation="black"
                        lastMove={lastMove}
                        boardWidth={boardWidth}
                    />

                    {/* Player bar — bottom */}
                    <PlayerBar
                        name={playerName}
                        isAI={false}
                        isActive={game.turn() === 'b' && !game.isGameOver()}
                        capturedPieces={capturedByPlayer}
                        capturedColor="white"
                        position="bottom"
                    />
                </div>

                {/* Right Side Panel */}
                <div className="side-panel">
                    {/* Game title bar */}
                    <div className="panel-header">
                        <span className="panel-header-title">♟ Play vs AI</span>
                        <button
                            className="icon-btn"
                            onClick={toggleSound}
                            title={soundEnabled ? 'Mute' : 'Unmute'}
                        >
                            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </button>
                    </div>

                    {/* Move History */}
                    <MoveHistory moves={moveHistory} />

                    {/* Game Status */}
                    {game.inCheck() && !game.isGameOver() && (
                        <div className="game-status-alert check">⚠ Check!</div>
                    )}

                    {/* Action Buttons */}
                    <div className="panel-actions">
                        <button
                            className="action-btn"
                            onClick={() => {
                                if (!game.isGameOver() && game.moveNumber() > 1) {
                                    setShowConfirmRestart(true);
                                } else {
                                    resetGame();
                                }
                            }}
                            title="Restart"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            className="action-btn"
                            onClick={() => {
                                if (!game.isGameOver() && game.moveNumber() > 1) {
                                    setShowConfirmQuit(true);
                                } else {
                                    router.push('/');
                                }
                            }}
                            title="Quit"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <GameOverModal
                isOpen={showGameOver}
                result={gameResult}
                playerName={playerName}
                moveCount={playerMoveCount}
                onPlayAgain={resetGame}
                onNewPlayer={() => router.push('/')}
            />

            <ConfirmDialog
                isOpen={showConfirmRestart}
                title="Restart Game?"
                message="Your current game progress will be lost."
                confirmText="Restart"
                onConfirm={resetGame}
                onCancel={() => setShowConfirmRestart(false)}
            />

            <ConfirmDialog
                isOpen={showConfirmQuit}
                title="Quit Game?"
                message="Are you sure you want to leave? Your current game will not be saved."
                confirmText="Quit"
                variant="danger"
                onConfirm={() => router.push('/')}
                onCancel={() => setShowConfirmQuit(false)}
            />
        </div>
    );
}

export default function GamePage() {
    return (
        <Suspense
            fallback={
                <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Loading game...</p>
                </div>
            }
        >
            <GameContent />
        </Suspense>
    );
}
