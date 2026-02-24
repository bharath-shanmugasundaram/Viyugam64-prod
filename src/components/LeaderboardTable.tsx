'use client';

import { LeaderboardEntry } from '@/lib/api';
import { Trophy } from 'lucide-react';

interface LeaderboardTableProps {
    entries: LeaderboardEntry[];
    compact?: boolean;
}

export default function LeaderboardTable({ entries, compact = false }: LeaderboardTableProps) {
    if (entries.length === 0) {
        return (
            <div className="leaderboard-empty">
                <Trophy size={32} className="empty-icon" />
                <p>No entries yet. Be the first to defeat the AI!</p>
            </div>
        );
    }

    return (
        <div className={`leaderboard-table-wrapper ${compact ? 'compact' : ''}`}>
            <table className="leaderboard-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Moves</th>
                        {!compact && <th>Date</th>}
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, index) => (
                        <tr key={entry.id || index} className={index < 3 ? `rank-${index + 1}` : ''}>
                            <td className="rank-cell">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                            </td>
                            <td className="player-cell">{entry.player_name}</td>
                            <td className="moves-cell">{entry.moves}</td>
                            {!compact && (
                                <td className="date-cell">
                                    {new Date(entry.date_played).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
