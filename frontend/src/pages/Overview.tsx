import { motion } from "framer-motion";
import { MetricCard } from "../components/ui/MetricCard";
import { RecentAuditLedger } from "../components/ui/RecentAuditLedger";
import { EnvironmentTopology } from "../components/ui/EnvironmentTopology";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "@/lib/api";

// MUI Icons
import GroupIcon from "@mui/icons-material/Group";
import GppBadIcon from "@mui/icons-material/GppBad";
import WarningIcon from "@mui/icons-material/Warning";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";

// Dummy sparkline seed so charts aren't flat (they animate nicely even with zeros)
const mockTrendData = (length = 7, min = 10, max = 50) =>
    Array.from({ length }, () => ({ value: Math.floor(Math.random() * (max - min + 1)) + min }));

export function Overview() {
    const { data: metrics, isLoading } = useQuery({
        queryKey: ["governanceMetrics"],
        queryFn: fetchMetrics,
        refetchInterval: 8000, // refresh every 8s — live without hammering
    });

    const fmt = (n: number | undefined, fallback = "—") =>
        n !== undefined ? n.toLocaleString() : fallback;

    const isLive = !isLoading && metrics !== undefined;

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-end justify-between"
            >
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold tracking-tight text-white">
                            Fleet Command Center
                        </h1>
                        {/* LIVE badge */}
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                            <span
                                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                                style={{
                                    animation: "pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite",
                                }}
                            />
                            {isLive ? "LIVE" : "CONNECTING..."}
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Global overview of agent governance across Cloud, Edge, and Client nodes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-md transition-colors">
                        Export Report
                    </button>
                    <button className="text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 px-3 py-1.5 rounded-md transition-colors shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]">
                        Deploy Policy
                    </button>
                </div>
            </motion.div>

            {/* Metrics Row — live data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Active Fleet Agents"
                    value={isLoading ? "..." : fmt(metrics?.active_agents)}
                    trend={isLive ? `${fmt(metrics?.evaluated_today)} evals today` : "Loading..."}
                    trendUp={true}
                    icon={GroupIcon}
                    data={mockTrendData(10, 3, 15)}
                    delay={0.1}
                />
                <MetricCard
                    title="Approvals (All Time)"
                    value={isLoading ? "..." : fmt(metrics?.approved)}
                    trend={isLive ? `${((metrics?.approved_rate ?? 0) * 100).toFixed(0)}% approval rate` : "Loading..."}
                    trendUp={true}
                    icon={VerifiedUserIcon}
                    data={mockTrendData(10, 1000, 5000)}
                    delay={0.2}
                />
                <MetricCard
                    title="Policy Blocks (All Time)"
                    value={isLoading ? "..." : fmt(metrics?.blocked)}
                    trend={isLive ? `${((metrics?.blocked_rate ?? 0) * 100).toFixed(0)}% block rate` : "Loading..."}
                    trendUp={false}
                    icon={GppBadIcon}
                    data={mockTrendData(10, 100, 1000)}
                    delay={0.3}
                />
                <MetricCard
                    title="Pending Escalations"
                    value={isLoading ? "..." : fmt(metrics?.pending_escalations)}
                    trend={isLive
                        ? `${fmt(metrics?.evaluations_last_1h)} evals last hour`
                        : "Loading..."}
                    trendUp={(metrics?.pending_escalations ?? 0) === 0}
                    icon={WarningIcon}
                    data={mockTrendData(10, 0, 10)}
                    delay={0.4}
                />
            </div>

            {/* Cost Savings Banner */}
            {isLive && (metrics?.cost_saved_usd ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-sm text-emerald-300"
                >
                    <span className="text-lg">💰</span>
                    <span>
                        <span className="font-semibold text-emerald-400">
                            ${metrics!.cost_saved_usd.toFixed(2)}
                        </span>{" "}
                        in estimated LLM costs saved via QICACHE semantic caching
                    </span>
                    {metrics!.top_blocked_actions.length > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            Top blocked:{" "}
                            <span className="font-mono text-amber-400">
                                {metrics!.top_blocked_actions.slice(0, 2).join(", ")}
                            </span>
                        </span>
                    )}
                </motion.div>
            )}

            {/* Complex Layout Row */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-1 xl:grid-cols-7 gap-6 min-h-[450px]"
            >
                {/* Topology View (Col span 3) */}
                <EnvironmentTopology />

                {/* Audit Ledger (Col span 4) */}
                <RecentAuditLedger />
            </motion.div>
        </div>
    );
}
