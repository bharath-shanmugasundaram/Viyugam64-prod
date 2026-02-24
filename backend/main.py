"""
Viyugam 64 — FastAPI Backend
==============================
- Leaderboard API (SQLite)
- CNN Chess AI endpoint (PyTorch ChessImproved model)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
import numpy as np
from datetime import datetime
from contextlib import contextmanager

# --- Database Setup ---

DB_PATH = os.path.join(os.path.dirname(__file__), "leaderboard.db")


@contextmanager
def get_db():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Initialize the leaderboard database table."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT NOT NULL,
                moves INTEGER NOT NULL,
                date_played TEXT NOT NULL
            )
        """)
        conn.commit()


# --- Chess CNN Model Setup ---

import torch as t
import torch.nn as nn
import chess

# Paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHESS_AUTOMATOR_DIR = os.path.join(BASE_DIR, "..", "ChessAutomator")
MOVE_MODEL_PATH = os.path.join(CHESS_AUTOMATOR_DIR, "Exeutable", "model_files", "move_model_state.pth")
LABEL_PATH = os.path.join(CHESS_AUTOMATOR_DIR, "board_evaluation", "label.npy")

DEVICE = 'mps' if getattr(t.backends, "mps", None) and t.backends.mps.is_available() else (
    'cuda' if t.cuda.is_available() else 'cpu'
)


class ChessImproved(nn.Module):
    """CNN model that takes a 14-channel board tensor and outputs 1792 move logits."""
    def __init__(self):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(14, 64, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(64),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.BatchNorm2d(128),
            nn.Conv2d(128, 64, 3), nn.ReLU(), nn.BatchNorm2d(64),
            nn.AdaptiveAvgPool2d(1)
        )
        self.fc = nn.Sequential(
            nn.Linear(64, 1024),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(1024, 1792)
        )

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)


def fen_to_tensor(fen: str) -> np.ndarray:
    """Convert FEN string to a 13x8x8 tensor (12 piece channels + 1 empty channel)."""
    arr = np.zeros((13, 8, 8), dtype=np.float32)
    piece_to_index = {
        'P': 0, 'N': 1, 'B': 2, 'R': 3, 'Q': 4, 'K': 5,
        'p': 6, 'n': 7, 'b': 8, 'r': 9, 'q': 10, 'k': 11
    }
    board_part = fen.split()[0]
    ranks = board_part.split('/')
    for row, rank in enumerate(ranks):
        col = 0
        for ch in rank:
            if ch.isdigit():
                for _ in range(int(ch)):
                    arr[12, row, col] = 1  # empty square
                    col += 1
            else:
                arr[piece_to_index[ch], row, col] = 1
                col += 1
    return arr


def filter_legal_moves(logits_tensor, fen: str, ans_sender: dict):
    """Filter model logits to only include legal moves, return filtered logits or False."""
    try:
        board_state = chess.Board(fen)
    except Exception:
        return False

    legal_set = set(m.uci() for m in board_state.legal_moves)
    logits = logits_tensor.clone().detach().cpu().squeeze()

    for idx, move_str in ans_sender.items():
        if move_str not in legal_set:
            logits[idx] = float('-inf')

    if (logits == float('-inf')).all():
        return False

    return logits


# Global model state (loaded at startup)
move_model = None
ans_sender = {}
model_loaded = False


def load_chess_model():
    """Load the ChessImproved CNN model and labels at startup."""
    global move_model, ans_sender, model_loaded

    if not os.path.exists(MOVE_MODEL_PATH):
        print(f"⚠ Move model not found at {MOVE_MODEL_PATH}")
        return

    if not os.path.exists(LABEL_PATH):
        print(f"⚠ Labels not found at {LABEL_PATH}")
        return

    try:
        # Load labels
        label_arr = np.load(LABEL_PATH, allow_pickle=True)
        for cnt, move_str in enumerate(label_arr):
            ans_sender[cnt] = str(move_str)

        # Load model
        move_model = ChessImproved().to(DEVICE)
        move_model.load_state_dict(t.load(MOVE_MODEL_PATH, map_location=DEVICE, weights_only=True))
        move_model.eval()

        model_loaded = True
        print(f"Chess CNN model loaded on {DEVICE} ({len(ans_sender)} labels)")
    except Exception as e:
        print(f"Failed to load chess model: {e}")
        model_loaded = False


def predict_best_move(fen: str) -> str | None:
    """Given a FEN, predict the best legal move using the CNN model."""
    if not model_loaded or move_model is None:
        return None

    try:
        # FEN → 13x8x8 tensor
        board_tensor = fen_to_tensor(fen)

        # Add color channel (1 = white to move)
        color_flag = 1 if ' w ' in fen else 0
        extra = np.full((1, 8, 8), color_flag, dtype=np.float32)
        combined = np.concatenate([board_tensor, extra], axis=0)  # 14x8x8

        # Run model
        combined_t = t.from_numpy(combined).unsqueeze(0).to(DEVICE).float()
        with t.no_grad():
            logits = move_model(combined_t)

        # Filter to legal moves
        filtered = filter_legal_moves(logits, fen, ans_sender)
        if filtered is False:
            return None

        idx = int(t.argmax(filtered).item())
        return ans_sender[idx]

    except Exception as e:
        print(f"Prediction error: {e}")
        return None


# --- Pydantic Models ---

class LeaderboardEntry(BaseModel):
    player_name: str
    moves: int
    date_played: str


class LeaderboardResponse(BaseModel):
    id: int
    player_name: str
    moves: int
    date_played: str


class AIMoveRequest(BaseModel):
    fen: str


class AIMoveResponse(BaseModel):
    move: str | None
    source: str  # "cnn" or "fallback"


# --- FastAPI App ---

app = FastAPI(title="Viyugam 64 API", version="2.0.0")

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    load_chess_model()


# --- AI Move Endpoint ---

@app.post("/api/ai-move", response_model=AIMoveResponse)
def get_ai_move(req: AIMoveRequest):
    """Predict the best move for the given FEN using the CNN model."""
    if not req.fen or not req.fen.strip():
        raise HTTPException(status_code=400, detail="FEN string is required")

    fen = req.fen.strip()
    print(f"FEN: {fen}")
    move = predict_best_move(fen)

    if move:
        print(f"CNN Move: {move}")
        return {"move": move, "source": "cnn"}
    else:
        print("No CNN move — frontend will use minimax fallback")
        return {"move": None, "source": "fallback"}


# --- Leaderboard Endpoints ---

@app.get("/api/leaderboard", response_model=list[LeaderboardResponse])
def get_leaderboard():
    """Get all leaderboard entries, sorted by fewest moves."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, player_name, moves, date_played FROM leaderboard ORDER BY moves ASC"
        ).fetchall()
        return [dict(row) for row in rows]


@app.get("/api/leaderboard/top/{limit}", response_model=list[LeaderboardResponse])
def get_top_leaderboard(limit: int):
    """Get top N leaderboard entries."""
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, player_name, moves, date_played FROM leaderboard ORDER BY moves ASC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


@app.post("/api/leaderboard", response_model=LeaderboardResponse)
def add_leaderboard_entry(entry: LeaderboardEntry):
    """Add a new leaderboard entry (player victory)."""
    if not entry.player_name.strip():
        raise HTTPException(status_code=400, detail="Player name is required")
    if entry.moves < 1:
        raise HTTPException(status_code=400, detail="Moves must be at least 1")

    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO leaderboard (player_name, moves, date_played) VALUES (?, ?, ?)",
            (entry.player_name.strip(), entry.moves, entry.date_played or datetime.utcnow().isoformat()),
        )
        conn.commit()
        return {
            "id": cursor.lastrowid,
            "player_name": entry.player_name.strip(),
            "moves": entry.moves,
            "date_played": entry.date_played,
        }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model_loaded, "device": DEVICE}
