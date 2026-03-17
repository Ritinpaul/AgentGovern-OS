import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchAgents, fetchMetrics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtimePulse } from "@/hooks/useRealtimePulse";

// MUI Icons
import ShieldIcon from "@mui/icons-material/Shield";
import HubIcon from "@mui/icons-material/Hub";
import OnlinePredictionIcon from "@mui/icons-material/OnlinePrediction";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export function Fleet() {
    const realtime = useRealtimePulse();

    const { data: agentsData, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
        refetchInterval: 10000,
    });
    const { data: metrics } = useQuery({
        queryKey: ["governance-metrics"],
        queryFn: fetchMetrics,
        refetchInterval: 10000,
    });

    const agents = agentsData?.agents || [];
    const activeAgents = agents.filter((agent: any) => agent.status === "active").length;
    const avgTrust = agents.length > 0
        ? agents.reduce((sum: number, agent: any) => sum + (agent.trust_score ?? 0), 0) / agents.length
        : 0;

    const getTierColor = (tier: string) => {
        switch (tier.toUpperCase()) {
            case "PLATINUM": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
            case "GOLD": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
            case "SILVER": return "text-slate-400 bg-slate-500/10 border-slate-500/20";
            default: return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Agent Fleet Registry</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                        <HubIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                        GENESIS Module — Real-time inventory of all autonomous entities within the governance boundary.
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-white/[0.03] border border-border px-3 py-2 rounded-xl flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            realtime.connected ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            {realtime.connected ? "Live stream" : `Reconnecting (${realtime.reconnectAttempt})`}
                        </div>
                    </div>
                    <div className="bg-white/[0.03] border border-border px-4 py-2 rounded-xl flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Agents</div>
                            <div className="text-sm font-mono text-white">{agentsData?.total ?? 0}</div>
                        </div>
                        <div className="w-px h-8 bg-white/[0.05]" />
                        <div className="text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Evaluations / 1h</div>
                            <div className="text-sm font-mono text-emerald-400">{metrics?.evaluations_last_1h ?? 0}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Quick stats cards */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 relative overflow-hidden group">
                    <TrendingUpIcon sx={{ fontSize: 40 }} className="absolute -right-2 -bottom-2 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors" />
                    <div className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mb-1">Active Agents</div>
                    <div className="text-2xl font-mono text-white">{activeAgents}</div>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 relative overflow-hidden group">
                    <OnlinePredictionIcon sx={{ fontSize: 40 }} className="absolute -right-2 -bottom-2 text-blue-500/10 group-hover:text-blue-500/20 transition-colors" />
                    <div className="text-xs font-semibold text-blue-400/70 uppercase tracking-widest mb-1">Pending Escalations</div>
                    <div className="text-2xl font-mono text-white">{metrics?.pending_escalations ?? 0}</div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 relative overflow-hidden group">
                    <VerifiedUserIcon sx={{ fontSize: 40 }} className="absolute -right-2 -bottom-2 text-amber-500/10 group-hover:text-amber-500/20 transition-colors" />
                    <div className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest mb-1">Avg Trust Score</div>
                    <div className="text-2xl font-mono text-white">{avgTrust.toFixed(2)}</div>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl p-4 relative overflow-hidden group">
                    <ShieldIcon sx={{ fontSize: 40 }} className="absolute -right-2 -bottom-2 text-cyan-500/10 group-hover:text-cyan-500/20 transition-colors" />
                    <div className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-1">Cost Saved (USD)</div>
                    <div className="text-2xl font-mono text-white">{(metrics?.cost_saved_usd ?? 0).toFixed(0)}</div>
                </div>
            </div>

            <div className="bg-[#030304]/40 border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Agent Identity</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Operational Tier</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Trust Intensity</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Provisioned</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-4 h-16 bg-white/[0.01]" />
                                </tr>
                            ))
                        ) : agents.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                    No agents discovered in current cluster.
                                </td>
                            </tr>
                        ) : (
                            agents.map((agent: any, idx: number) => (
                                <motion.tr
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={agent.code}
                                    className="hover:bg-white/[0.02] transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                {agent.code.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white">{agent.name}</div>
                                                <div className="text-[10px] font-mono text-muted-foreground cursor-copy hover:text-emerald-400 transition-colors">{agent.code}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold border",
                                            getTierColor(agent.tier)
                                        )}>
                                            {agent.tier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                                                agent.status === 'active' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-500 shadow-slate-500/50"
                                            )} />
                                            <span className="text-xs text-white capitalize">{agent.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-xs font-mono text-emerald-400">{(agent.trust_score * 100).toFixed(1)}%</div>
                                            <div className="w-24 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${agent.trust_score * 100}%` }}
                                                    className="h-full bg-emerald-500"
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                                        {idx === 0 ? "Just now" : `${idx * 2} min ago`}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-muted-foreground hover:text-white transition-colors">
                                            <MoreVertIcon sx={{ fontSize: 18 }} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
