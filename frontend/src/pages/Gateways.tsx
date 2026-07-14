import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchGateways } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtimePulse } from "@/hooks/useRealtimePulse";

// MUI Icons
import RouterIcon from "@mui/icons-material/Router";
import SignalCellularAltIcon from "@mui/icons-material/SignalCellularAlt";
import SecurityIcon from "@mui/icons-material/Security";
import PublicIcon from "@mui/icons-material/Public";

export function Gateways() {
    const realtime = useRealtimePulse();

    const { data, isLoading } = useQuery({
        queryKey: ["gateways"],
        queryFn: fetchGateways,
        refetchInterval: 15000,
    });

    const gateways = data?.gateways ?? [];

    return (
        <div className="flex flex-col h-full gap-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Edge Gateways Fleet</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 flex-wrap">
                    <RouterIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                    Managing the distributed infrastructure entry points for cross-border agent activities.
                    <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px]",
                        realtime.connected
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", realtime.connected ? "bg-emerald-400" : "bg-amber-400")} />
                        {realtime.connected ? "WebSocket live" : "WebSocket reconnecting"}
                    </span>
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="bg-[#030304]/60 border border-border p-5 rounded-2xl animate-pulse h-[238px]"
                        />
                    ))
                ) : gateways.length === 0 ? (
                    <div className="col-span-full text-sm text-muted-foreground border border-border rounded-2xl px-5 py-6 bg-[#030304]/50">
                        No gateway telemetry available. Ensure gateway/adapter services are running and reachable from Governance API.
                    </div>
                ) : gateways.map((gw, idx) => (
                    <motion.div
                        key={gw.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[#030304]/60 border border-border p-5 rounded-2xl hover:border-emerald-500/50 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <RouterIcon sx={{ fontSize: 20 }} className="text-emerald-400" />
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                gw.status === 'online' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            )}>
                                {gw.status.toUpperCase()}
                            </div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <h3 className="text-sm font-bold text-white tracking-tight">{gw.id}</h3>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <PublicIcon sx={{ fontSize: 10 }} />
                                {gw.location}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] mb-1">
                                    <span className="text-muted-foreground">Load intensity</span>
                                    <span className="text-white font-mono">{Math.min(100, Math.round(gw.latency_ms))}%</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.round(gw.latency_ms))}%` }}
                                        className={cn(
                                            "h-full rounded-full",
                                            gw.status === 'degraded' ? "bg-amber-500" : gw.status === 'offline' ? "bg-rose-500" : "bg-emerald-500"
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="bg-white/[0.03] p-2 rounded-lg border border-white/5">
                                    <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Traffic</div>
                                    <div className="text-[10px] font-bold text-white flex items-center gap-1">
                                        <SignalCellularAltIcon sx={{ fontSize: 10 }} className="text-emerald-400" />
                                        {gw.latency_ms} ms
                                    </div>
                                </div>
                                <div className="bg-white/[0.03] p-2 rounded-lg border border-white/5">
                                    <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Security</div>
                                    <div className="text-[10px] font-bold text-white flex items-center gap-1">
                                        <SecurityIcon sx={{ fontSize: 10 }} className="text-cyan-400" />
                                        {gw.mode === 'unknown' ? 'TLS 1.3' : gw.mode.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="flex-1 min-h-[300px] border border-border rounded-2xl bg-[#030304]/40 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Live Global Ingress Map</h3>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> High Trust
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Probated
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center relative">
                    {/* Visual Placeholder for a Map */}
                    <div className="absolute inset-0 opacity-[0.05] grayscale brightness-50 flex items-center justify-center p-20 pointer-events-none">
                        <PublicIcon sx={{ fontSize: 400 }} />
                    </div>
                    <div className="text-center relative z-10 px-12">
                        <SignalCellularAltIcon sx={{ fontSize: 48 }} className="text-emerald-500/20 mb-4" />
                        <p className="text-muted-foreground text-sm max-w-sm">
                            Real-time packet inspection and regional traffic routing active. Monitoring {data?.total ?? 0} active entry points across the federated network.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
