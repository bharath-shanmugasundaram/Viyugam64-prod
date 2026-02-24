'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard, LeaderboardEntry } from '@/lib/api';
import LeaderboardTable from '@/components/LeaderboardTable';
import { Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadLeaderboard = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const data = await getLeaderboard();
            setEntries(data);
        } catch {
            // Will use localStorage fallback from api.ts
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadLeaderboard();

        // Auto-refresh every 10 seconds for live updates when multiple users play
        const interval = setInterval(() => loadLeaderboard(true), 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="leaderboard-page">
            <div className="leaderboard-container">
                {/* Header */}
                <div className="leaderboard-page-header">
                    <div className="leaderboard-header-left">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="leaderboard-header-title">
                            <Trophy size={20} className="trophy-icon" />
                            <h1>Leaderboard</h1>
                        </div>
                    </div>
                    <div className="leaderboard-header-right">
                        <button
                            className="icon-btn"
                            onClick={() => loadLeaderboard(true)}
                            disabled={refreshing}
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                        </button>
                        <Link href="/" className="btn btn-primary">
                            Play Now
                        </Link>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="leaderboard-stats">
                    <div className="lb-stat">
                        <span className="lb-stat-value">{entries.length}</span>
                        <span className="lb-stat-label">Total Wins</span>
                    </div>
                    {entries.length > 0 && (
                        <>
                            <div className="lb-stat">
                                <span className="lb-stat-value">{entries[0]?.moves || '-'}</span>
                                <span className="lb-stat-label">Best Score</span>
                            </div>
                            <div className="lb-stat">
                                <span className="lb-stat-value">{entries[0]?.player_name || '-'}</span>
                                <span className="lb-stat-label">Top Player</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Table */}
                <div className="leaderboard-table-container">
                    {loading ? (
                        <div className="leaderboard-loading">
                            <RefreshCw size={24} className="spinning" />
                            <p>Loading leaderboard...</p>
                        </div>
                    ) : (
                        <LeaderboardTable entries={entries} />
                    )}
                </div>

                {/* Live indicator */}
                <div className="leaderboard-footer">
                    <span className="live-dot"></span>
                    <span className="live-text">Live — auto-refreshes every 10s</span>
                </div>
            </div>
        </div>
    );
}
