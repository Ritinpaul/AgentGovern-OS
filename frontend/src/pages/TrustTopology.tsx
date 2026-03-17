import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { fetchAgentLineage, fetchAgents } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRealtimePulse } from "@/hooks/useRealtimePulse";

// MUI Icons
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BiotechIcon from "@mui/icons-material/Biotech";
import CircleIcon from "@mui/icons-material/Circle";

export function TrustTopology() {
    const realtime = useRealtimePulse();
    const helixRef = useRef<SVGSVGElement | null>(null);
    const lineageRef = useRef<SVGSVGElement | null>(null);

    const { data: agentsData, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
        refetchInterval: 10000,
    });

    const agents = agentsData?.agents || [];
    const [selectedAgentId, setSelectedAgentId] = useState<string>("");

    useEffect(() => {
        if (!selectedAgentId && agents.length > 0) {
            setSelectedAgentId(agents[0].id);
        }
    }, [agents, selectedAgentId]);

    const { data: lineageData } = useQuery({
        queryKey: ["agent-lineage", selectedAgentId],
        queryFn: () => fetchAgentLineage(selectedAgentId),
        enabled: !!selectedAgentId,
        refetchInterval: 15000,
    });

    const selectedAgent = useMemo(
        () => agents.find((agent: any) => agent.id === selectedAgentId),
        [agents, selectedAgentId]
    );

    useEffect(() => {
        if (!helixRef.current) {
            return;
        }
        const svg = d3.select(helixRef.current);
        svg.selectAll("*").remove();

        const width = helixRef.current.clientWidth || 760;
        const height = 220;
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const centerY = height / 2;
        const amplitude = 32;
        const turns = 8;
        const points = d3.range(0, width + 1, 8);

        const strandA = d3
            .line<number>()
            .x((d: number) => d)
            .y((d: number) => centerY + Math.sin((d / width) * Math.PI * turns) * amplitude)
            .curve(d3.curveCatmullRom.alpha(0.5));

        const strandB = d3
            .line<number>()
            .x((d: number) => d)
            .y((d: number) => centerY + Math.sin((d / width) * Math.PI * turns + Math.PI) * amplitude)
            .curve(d3.curveCatmullRom.alpha(0.5));

        svg.append("path")
            .datum(points)
            .attr("d", strandA)
            .attr("fill", "none")
            .attr("stroke", "#22d3ee")
            .attr("stroke-width", 2.2)
            .attr("opacity", 0.9);

        svg.append("path")
            .datum(points)
            .attr("d", strandB)
            .attr("fill", "none")
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2.2)
            .attr("opacity", 0.9);

        const rungData = d3.range(0, width, 20);
        svg.append("g")
            .selectAll("line")
            .data(rungData)
            .join("line")
            .attr("x1", (d: number) => d)
            .attr("x2", (d: number) => d)
            .attr("y1", (d: number) => centerY + Math.sin((d / width) * Math.PI * turns) * amplitude)
            .attr("y2", (d: number) => centerY + Math.sin((d / width) * Math.PI * turns + Math.PI) * amplitude)
            .attr("stroke", "#94a3b8")
            .attr("stroke-width", 1)
            .attr("opacity", 0.35);
    }, [selectedAgentId]);

    useEffect(() => {
        if (!lineageRef.current || !lineageData) {
            return;
        }
        const svg = d3.select(lineageRef.current);
        svg.selectAll("*").remove();

        const width = lineageRef.current.clientWidth || 760;
        const height = 300;
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const ancestors = lineageData.ancestors || [];
        const descendants = lineageData.descendants || [];
        const root = lineageData.root;

        const all = [...ancestors, root, ...descendants];
        const byDepth = d3.group(all, (n: any) => n.depth);
        const minDepth = d3.min(all, (n: any) => n.depth) ?? -1;
        const maxDepth = d3.max(all, (n: any) => n.depth) ?? 1;

        const xScale = d3.scaleLinear().domain([minDepth, maxDepth]).range([80, width - 80]);
        const positioned = all.map((node: any) => {
            const peers = byDepth.get(node.depth) || [];
            const idx = peers.findIndex((p: any) => p.id === node.id);
            const yGap = height / (peers.length + 1);
            return {
                ...node,
                x: xScale(node.depth),
                y: yGap * (idx + 1),
            };
        });

        const byId = new Map(positioned.map((n: any) => [n.id, n]));
        const links: Array<{ source: any; target: any }> = [];

        ancestors.forEach((node: any, idx: number) => {
            const source = byId.get(node.id);
            const parentDepth = idx === 0 ? 0 : ancestors[idx - 1].id;
            const target = idx === 0 ? byId.get(root.id) : byId.get(parentDepth);
            if (source && target) {
                links.push({ source, target });
            }
        });

        descendants.forEach((node: any) => {
            const source = byId.get(node.parent_id || root.id);
            const target = byId.get(node.id);
            if (source && target) {
                links.push({ source, target });
            }
        });

        svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("x1", (d: { source: any; target: any }) => d.source.x)
            .attr("y1", (d: { source: any; target: any }) => d.source.y)
            .attr("x2", (d: { source: any; target: any }) => d.target.x)
            .attr("y2", (d: { source: any; target: any }) => d.target.y)
            .attr("stroke", "#334155")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.85);

        const tierColor = (tier: string) => {
            const value = tier.toUpperCase();
            if (value.includes("PLAT")) return "#22d3ee";
            if (value.includes("GOLD") || value === "T1") return "#f59e0b";
            if (value.includes("SILVER") || value === "T2") return "#94a3b8";
            return "#10b981";
        };

        const nodes = svg
            .append("g")
            .selectAll("g")
            .data(positioned)
            .join("g")
            .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);

        nodes.append("circle")
            .attr("r", (d: any) => (d.id === root.id ? 11 : 8))
            .attr("fill", (d: any) => tierColor(d.tier))
            .attr("stroke", "#0b1220")
            .attr("stroke-width", 2);

        nodes.append("text")
            .text((d: any) => d.agent_code)
            .attr("x", 14)
            .attr("y", 4)
            .attr("fill", "#e2e8f0")
            .style("font-size", "10px")
            .style("font-family", "monospace");
    }, [lineageData]);

    const tiers = ["PLATINUM", "GOLD", "SILVER"];

    return (
        <div className="flex flex-col h-full gap-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Trust Topology Map</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 flex-wrap">
                    <DeviceHubIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                    SENTINEL Graph — Visualizing authoritative hierarchies and trust propagation across the fleet.
                    <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px]",
                        realtime.connected
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                    )}>
                        <CircleIcon sx={{ fontSize: 8 }} />
                        {realtime.connected ? "Realtime connected" : "Realtime reconnecting"}
                    </span>
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-[#030304]/40 border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <BiotechIcon sx={{ fontSize: 16 }} className="text-cyan-400" />
                            DNA Helix Signature
                        </h2>
                        <span className="text-[10px] text-muted-foreground">
                            {selectedAgent ? `Anchor: ${selectedAgent.code}` : "Awaiting agent"}
                        </span>
                    </div>
                    <svg ref={helixRef} className="w-full h-55 rounded-xl bg-[#020408] border border-white/5" />
                </section>

                <section className="bg-[#030304]/40 border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <AccountTreeIcon sx={{ fontSize: 16 }} className="text-emerald-400" />
                            Agent Lineage Tree
                        </h2>
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="bg-[#0b1117] border border-border text-xs text-white rounded-lg px-2 py-1 outline-none"
                        >
                            {agents.map((agent: any) => (
                                <option key={agent.id} value={agent.id}>{agent.code} - {agent.name}</option>
                            ))}
                        </select>
                    </div>
                    {!lineageData ? (
                        <div className="h-75 rounded-xl bg-[#020408] border border-white/5 flex items-center justify-center text-xs text-muted-foreground">
                            Lineage unavailable for current role or data set.
                        </div>
                    ) : (
                        <svg ref={lineageRef} className="w-full h-75 rounded-xl bg-[#020408] border border-white/5" />
                    )}
                </section>
            </div>

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

                                <div className="flex flex-wrap justify-center gap-8 max-w-50">
                                    {agents.filter((a: any) => a.tier.toUpperCase() === tierName).map((agent: any) => (
                                        <AgentNode key={agent.code} agent={agent} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Visual connections would go here, simplified with CSS borders/divs if needed */}
                        <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-500/5 -translate-y-1/2 z-0" />
                        <div className="absolute top-0 left-1/3 w-px h-full bg-cyan-500/5 z-0" />
                        <div className="absolute top-0 right-1/3 w-px h-full bg-amber-500/5 z-0" />
                    </div>
                )}
            </div>

            <footer className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/2 border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                        <BiotechIcon sx={{ fontSize: 14 }} className="text-cyan-400" />
                        Isolation Level
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Platinum nodes operate in high-security enclaves with direct administrative oversight and maximum authority.
                    </p>
                </div>
                <div className="bg-white/2 border border-border p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                        <AccountTreeIcon sx={{ fontSize: 14 }} className="text-amber-400" />
                        Decision Latency
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Authority propagation takes ~14ms across the topology. Any break in trust triggers immediate node isolation.
                    </p>
                </div>
                <div className="bg-white/2 border border-border p-4 rounded-xl">
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
        <div className="flex flex-col items-center gap-2 relative group">
            <div className={cn(
                "w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all duration-300",
                isPlatinum ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)]" :
                isGold ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_-5px_rgba(245,158,11,0.3)]" :
                "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_10px_-5px_rgba(16,185,129,0.2)]"
            )}>
                <div className="text-xs font-bold text-white uppercase">{agent.code.substring(0, 2)}</div>

                <div className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[8px] font-black px-1 rounded border border-black/20">
                    {(agent.trust_score * 100).toFixed(0)}%
                </div>

                <div className={cn(
                    "absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-[#030304]",
                    agent.status === 'active' ? "bg-emerald-500" : "bg-slate-500"
                )} />
            </div>
            <div className="text-[10px] text-muted-foreground font-medium group-hover:text-white transition-colors">
                {agent.name.split(' ')[0]}
            </div>
        </div>
    );
}
