import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
    evictExpiredCacheEntries,
    fetchCacheAnalytics,
    fetchCacheSettings,
    updateCacheSettings,
    type CacheAnalytics,
} from "@/lib/api";

import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import SavingsIcon from "@mui/icons-material/Savings";
import StorageIcon from "@mui/icons-material/Storage";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

function percent(value: number): string {
    return `${value.toFixed(2)}%`;
}

function toCost(value: number | string): string {
    const parsed = typeof value === "number" ? value : Number.parseFloat(value || "0");
    return `$${(Number.isNaN(parsed) ? 0 : parsed).toFixed(4)}`;
}

export function QICacheAnalytics() {
    const queryClient = useQueryClient();
    const [agentId, setAgentId] = useState("operator");

    const {
        data: analytics,
        isLoading: analyticsLoading,
        isFetching: analyticsFetching,
        refetch: refetchAnalytics,
    } = useQuery<CacheAnalytics>({
        queryKey: ["cacheAnalytics"],
        queryFn: fetchCacheAnalytics,
        refetchInterval: 7000,
    });

    const {
        data: settings,
        isLoading: settingsLoading,
        refetch: refetchSettings,
    } = useQuery({
        queryKey: ["cacheSettings", agentId],
        queryFn: () => fetchCacheSettings(agentId),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: updateCacheSettings,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["cacheSettings", agentId] }),
                refetchAnalytics(),
            ]);
        },
    });

    const evictMutation = useMutation({
        mutationFn: evictExpiredCacheEntries,
        onSuccess: async () => {
            await refetchAnalytics();
        },
    });

    const totalRequests = analytics?.total_queries ?? 0;
    const hitRate = analytics?.hit_rate ?? 0;
    const hitCount = analytics?.cache_hits ?? 0;
    const missCount = analytics?.cache_misses ?? 0;

    const chartBars = useMemo(() => {
        const max = Math.max(hitCount, missCount, 1);
        return {
            hits: Math.round((hitCount / max) * 100),
            misses: Math.round((missCount / max) * 100),
        };
    }, [hitCount, missCount]);

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">QICACHE Analytics</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Live semantic-cache performance, token savings, and per-agent cache controls.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => refetchAnalytics()}
                    className="text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 px-3 py-2 rounded-md transition-colors"
                >
                    Refresh Stats
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total Queries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-semibold text-white">
                                {analyticsLoading ? "..." : totalRequests.toLocaleString()}
                            </p>
                            <StorageIcon className="text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Hit Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-semibold text-white">{analyticsLoading ? "..." : percent(hitRate)}</p>
                            <AutoGraphIcon className="text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Tokens Saved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-semibold text-white">
                                {analyticsLoading ? "..." : (analytics?.tokens_saved ?? 0).toLocaleString()}
                            </p>
                            <SavingsIcon className="text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Estimated Cost Saved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <p className="text-xl font-semibold text-white">{analyticsLoading ? "..." : toCost(analytics?.cost_saved ?? 0)}</p>
                            <SavingsIcon className="text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0 flex-1">
                <Card className="xl:col-span-2 flex flex-col">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <CardTitle>Cache Hit vs Miss Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-emerald-400">Cache Hits</span>
                                <span className="text-white font-medium">{hitCount.toLocaleString()}</span>
                            </div>
                            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${chartBars.hits}%` }} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-amber-400">Cache Misses</span>
                                <span className="text-white font-medium">{missCount.toLocaleString()}</span>
                            </div>
                            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                                <div className="h-full bg-amber-500" style={{ width: `${chartBars.misses}%` }} />
                            </div>
                        </div>

                        <div className="text-xs text-muted-foreground border-t border-border/50 pt-4">
                            Cache efficiency formula: hits / (hits + misses).
                        </div>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader className="pb-4 border-b border-border/50">
                        <CardTitle>Per-Agent Cache Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">Agent ID</label>
                            <input
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value.trim() || "operator")}
                                className="w-full rounded-md border border-border bg-[#030304]/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                                placeholder="operator"
                            />
                        </div>

                        <div className="space-y-2 text-sm">
                            <label className="flex items-center justify-between">
                                <span className="text-muted-foreground">Enable cache reads</span>
                                <input
                                    type="checkbox"
                                    checked={settings?.cache_enabled ?? true}
                                    onChange={(e) => {
                                        if (!settings) {
                                            return;
                                        }
                                        updateSettingsMutation.mutate({
                                            agent_id: agentId,
                                            cache_enabled: e.target.checked,
                                            save_enabled: settings.save_enabled,
                                            ttl_days: settings.ttl_days,
                                        });
                                    }}
                                    disabled={settingsLoading || updateSettingsMutation.isPending}
                                />
                            </label>

                            <label className="flex items-center justify-between">
                                <span className="text-muted-foreground">Enable cache writes</span>
                                <input
                                    type="checkbox"
                                    checked={settings?.save_enabled ?? true}
                                    onChange={(e) => {
                                        if (!settings) {
                                            return;
                                        }
                                        updateSettingsMutation.mutate({
                                            agent_id: agentId,
                                            cache_enabled: settings.cache_enabled,
                                            save_enabled: e.target.checked,
                                            ttl_days: settings.ttl_days,
                                        });
                                    }}
                                    disabled={settingsLoading || updateSettingsMutation.isPending}
                                />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground uppercase tracking-wider">TTL (days)</label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={settings?.ttl_days ?? 3}
                                onChange={(e) => {
                                    if (!settings) {
                                        return;
                                    }
                                    const ttl = Number.parseInt(e.target.value, 10);
                                    updateSettingsMutation.mutate({
                                        agent_id: agentId,
                                        cache_enabled: settings.cache_enabled,
                                        save_enabled: settings.save_enabled,
                                        ttl_days: Number.isNaN(ttl) ? settings.ttl_days : Math.max(1, Math.min(30, ttl)),
                                    });
                                }}
                                disabled={settingsLoading || updateSettingsMutation.isPending}
                                className="w-full rounded-md border border-border bg-[#030304]/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => evictMutation.mutate()}
                            disabled={evictMutation.isPending}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-60"
                        >
                            <DeleteSweepIcon sx={{ fontSize: 16 }} />
                            Evict Expired Entries
                        </button>

                        <p className="text-xs text-muted-foreground">
                            {evictMutation.data ? `Evicted ${evictMutation.data.evicted} expired entries.` : "Use this to manually force TTL cleanup."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {(analyticsFetching || updateSettingsMutation.isPending || evictMutation.isPending) && (
                <p className="text-xs text-muted-foreground">Syncing cache subsystem data...</p>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => Promise.all([refetchAnalytics(), refetchSettings()])}
                    className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-white hover:bg-white/5"
                >
                    Refresh All
                </button>
            </div>
        </div>
    );
}
