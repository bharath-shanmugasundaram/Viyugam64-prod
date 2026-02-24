/**
 * API Client for Leaderboard
 * Communicates with the FastAPI backend.
 * Falls back to localStorage if backend is unavailable.
 */

export interface LeaderboardEntry {
    id?: number;
    player_name: string;
    moves: number;
    date_played: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Get leaderboard entries from backend, with localStorage fallback
 */
export async function getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    try {
        const url = limit
            ? `${API_BASE}/api/leaderboard/top/${limit}`
            : `${API_BASE}/api/leaderboard`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) return await res.json();
    } catch {
        // Backend unavailable, fall through to localStorage
    }

    // Fallback: localStorage
    return getLocalLeaderboard(limit);
}

/**
 * Add a new leaderboard entry
 */
export async function addLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id'>): Promise<boolean> {
    // Always save to localStorage as backup
    saveLocalEntry(entry);

    try {
        const res = await fetch(`${API_BASE}/api/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        return res.ok;
    } catch {
        // Backend unavailable, localStorage already saved
        return true;
    }
}

// --- localStorage Helpers ---

const STORAGE_KEY = 'chess_leaderboard';

function getLocalLeaderboard(limit?: number): LeaderboardEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const entries: LeaderboardEntry[] = JSON.parse(data);
        entries.sort((a, b) => a.moves - b.moves);
        return limit ? entries.slice(0, limit) : entries;
    } catch {
        return [];
    }
}

function saveLocalEntry(entry: Omit<LeaderboardEntry, 'id'>) {
    if (typeof window === 'undefined') return;
    try {
        const existing = getLocalLeaderboard();
        existing.push({ ...entry, id: Date.now() });
        existing.sort((a, b) => a.moves - b.moves);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
        // Storage full or unavailable
    }
}
