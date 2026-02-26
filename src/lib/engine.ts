/**
 * Chess Engine — Hybrid AI
 * ========================
 * Primary: CNN model via backend API (/api/ai-move)
 * Fallback: Browser-side minimax with alpha-beta pruning
 */

import { Chess } from 'chess.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// --- CNN Model via Backend API ---

interface AIMoveResponse {
    move: string | null;
    source: 'cnn' | 'fallback';
}

async function getCNNMove(fen: string): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/api/ai-move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fen }),
        });

        if (!res.ok) return null;

        const data: AIMoveResponse = await res.json();
        if (data.move && data.source === 'cnn') {
            return data.move;
        }
        return null;
    } catch {
        // Backend unreachable — fall back to minimax
        return null;
    }
}

// --- Minimax Fallback Engine ---

const PIECE_VALUES: Record<string, number> = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const PAWN_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_TABLE = [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
];

const PST: Record<string, number[][]> = {
    p: PAWN_TABLE,
    n: KNIGHT_TABLE,
    b: BISHOP_TABLE,
    r: ROOK_TABLE,
    q: QUEEN_TABLE,
    k: KING_TABLE,
};

function evaluateBoard(game: Chess): number {
    let score = 0;
    const board = game.board();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (!piece) continue;

            const value = PIECE_VALUES[piece.type] || 0;
            const table = PST[piece.type];
            const positional = table
                ? piece.color === 'w'
                    ? table[row][col]
                    : table[7 - row][col]
                : 0;

            if (piece.color === 'w') {
                score += value + positional;
            } else {
                score -= value + positional;
            }
        }
    }

    return score;
}

function minimax(
    game: Chess,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
): number {
    if (depth === 0 || game.isGameOver()) {
        return evaluateBoard(game);
    }

    const moves = game.moves();

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = minimax(game, depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evaluation = minimax(game, depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function getMinimaxMove(fen: string, depth: number): { bestMove: string | null; evaluation: number } {
    const game = new Chess(fen);
    const moves = game.moves();

    if (moves.length === 0) return { bestMove: null, evaluation: 0 };

    let bestMove = moves[0];
    let bestEval = -Infinity;

    for (const move of moves) {
        game.move(move);
        const evaluation = minimax(game, depth - 1, -Infinity, Infinity, false);
        game.undo();

        if (evaluation > bestEval) {
            bestEval = evaluation;
            bestMove = move;
        }
    }

    return { bestMove, evaluation: bestEval };
}

// --- Public API ---

export type Difficulty = 'easy' | 'hard';

export async function getBestMove(
    fen: string,
    difficulty: Difficulty = 'easy'
): Promise<{ bestMove: string | null; evaluation: number; source: string }> {
    if (difficulty === 'easy') {
        // Easy: Use CNN model (user's trained model)
        const cnnMove = await getCNNMove(fen);
        if (cnnMove) {
            return { bestMove: cnnMove, evaluation: 0, source: 'cnn' };
        }
        // If CNN fails, use shallow minimax as fallback
        const result = getMinimaxMove(fen, 2);
        return { ...result, source: 'minimax-fallback' };
    } else {
        // Hard: Use strong engine (depth 3)
        const result = getMinimaxMove(fen, 3);
        return { ...result, source: 'minimax' };
    }
}
