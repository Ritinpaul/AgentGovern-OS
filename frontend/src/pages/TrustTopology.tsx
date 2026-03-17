import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchAgents } from "@/lib/api";
import { cn } from "@/lib/utils";

// MUI Icons
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import SecurityIcon from "@mui/icons-material/Security";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";

export function TrustTopology() {
    const { data: agentsData, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
        refetchInterval: 10000,
    });

    const agents = agentsData?.agents || [];

    const tiers = ["PLATINUM", "GOLD", "SILVER"];

    return (
        <div className="flex flex-col h-full gap-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Trust Topology Map</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <DeviceHubIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                    SENTINEL Graph — Visualizing authoritative hierarchies and trust propagation across the fleet.
                </p>
            </header>

            <div className="flex-1 min-h-0 bg-[#030304]/40 border border-border rounded-2xl p-8 relative overflow-hidden flex flex-col items-center justify-center">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(circle, #34d399 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {isLoading ? (
                    <div className="text-muted-foreground animate-pulse text-sm">Calculating node coordinates...</div>
                ) : (
                    <div className="w-full h-full flex items-center justify-around relative">
                        {tiers.map((tierName) => (
                            <div key={tierName} className="flex flex-col items-center gap-12 relative z-10">
                                <h3 className={cn(
                                    "text-[10px] font-bold tracking-[0.2em] mb-4 py-1 px-4 rounded-full border",
                                    tierName === "PLATINUM" ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" :
                                    tierName === "GOLD" ? "text-amber-400 border-amber-500/30 bg-amber-500/5" :
                                    "text-slate-400 border-slate-500/30 bg-slate-500/5"
                                )}>
                                    {tierName} AUTHORITY
                                </h3>

                                <div className="flex flex-wrap justify-center gap-8 max-w-[200px]">
                                    {agents.filter((a: any) => a.tier.toUpperCase() === tierName).map((agent: any) => (
                                        <AgentNode key={agent.code} agent={agent} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Visual connections would go here, simplified with CSS borders/divs if needed */}
                        <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-500/5 -translate-y-1/2 -z-0" />
                        <div className="absolute top-0 left-1/3 w-px h-full bg-cyan-500/5 -z-0" />
                        <div className="absolute top-0 right-1/3 w-px h-full bg-amber-500/5 -z-0" />
                    </div>
                )}
            </div>
            
            <footer className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/[0.02] border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                        <SecurityIcon sx={{ fontSize: 14 }} className="text-cyan-400" />
                        Isolation Level
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Platinum nodes operate in high-security enclaves with direct administrative oversight and maximum authority.
                    </p>
                </div>
                <div className="bg-white/[0.02] border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                        <GpsFixedIcon sx={{ fontSize: 14 }} className="text-amber-400" />
                        Decision Latency
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Authority propagation takes ~14ms across the topology. Any break in trust triggers immediate node isolation.
                    </p>
                </div>
                <div className="bg-white/[0.02] border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                        <DeviceHubIcon sx={{ fontSize: 14 }} className="text-emerald-400" />
                        Topology Health
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        The current trust graph is stable. All nodes are reporting consistent authority signatures.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function AgentNode({ agent }: { agent: any }) {
    const isPlatinum = agent.tier.toUpperCase() === "PLATINUM";
    const isGold = agent.tier.toUpperCase() === "GOLD";

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center gap-2 relative group"
        >
            <div className={cn(
                "w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all duration-300",
                isPlatinum ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]" :
                isGold ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]" :
                "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_10px_-5px_rgba(16,185,129,0.2)]",
                "group-hover:translate-z-10 group-hover:shadow-[0_0_30px_-5px_currentColor]"
            )}>
                <div className="text-xs font-bold text-white uppercase">{agent.code.substring(0, 2)}</div>
                
                {/* Floating score label */}
                <div className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[8px] font-black px-1 rounded border border-black/20">
                    {(agent.trust_score * 100).toFixed(0)}%
                </div>

                {/* Status dot */}
                <div className={cn(
                    "absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-[#030304]",
                    agent.status === 'active' ? "bg-emerald-500" : "bg-slate-500"
                )} />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium group-hover:text-white transition-colors">
                {agent.name.split(' ')[0]}
            </div>

            {/* Tooltip info */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-32 p-2 bg-black/90 border border-border rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="text-[10px] text-white font-bold mb-1">{agent.name}</div>
                <div className="flex justify-between text-[8px]">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="text-emerald-400 font-mono">{agent.code}</span>
                </div>
            </div>
        </motion.div>
    );
}
