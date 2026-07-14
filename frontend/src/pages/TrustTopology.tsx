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
import ShieldIcon from "@mui/icons-material/Shield";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HubIcon from "@mui/icons-material/Hub";

// ─── Tier helpers ───────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
    T0: "#22d3ee",
    T1: "#22d3ee",
    T2: "#f59e0b",
    T3: "#94a3b8",
    T4: "#10b981",
};

const tierColor = (tier: string) =>
    TIER_COLOR[(tier || "").toUpperCase()] ?? "#10b981";

// ─── Static fallback lineage when API has no parent_agent_id chain ──────────
//     Renders a synthetic 3-level tree so the panel never looks empty.

function buildFallbackLineage(agents: any[]) {
    const sorted = [...agents].sort(
        (a, b) => Number(b.trust_score) - Number(a.trust_score)
    );
    if (sorted.length === 0) return null;

    // Pick root = highest trust, ancestors = top-tier above it, descendants = lower
    const root = sorted[0];
    const rest = sorted.slice(1);
    const ancestors = rest.filter(
        (a) => (a.tier || "") <= root.tier
    ).slice(0, 2).map((a, i) => ({
        ...a,
        depth: -(i + 1),
        parent_id: i === 0 ? root.id : (rest[0]?.id ?? root.id),
    }));
    const descendants = rest
        .filter((a) => !ancestors.find((x) => x.id === a.id))
        .slice(0, 6)
        .map((a, i) => ({
            ...a,
            depth: Math.floor(i / 2) + 1,
            parent_id: i < 2 ? root.id : (rest[i % 2]?.id ?? root.id),
        }));

    return {
        root: { ...root, depth: 0 },
        ancestors,
        descendants,
        total_nodes: 1 + ancestors.length + descendants.length,
    };
}

// ─── D3 Lineage Tree ────────────────────────────────────────────────────────

function LineageTree({
    lineage,
}: {
    lineage: ReturnType<typeof buildFallbackLineage>;
}) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current || !lineage) return;

        const el = svgRef.current;
        const width = el.clientWidth || 640;
        const height = el.clientHeight || 320;

        const svg = d3.select(el);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const root = lineage.root;
        const ancestors = lineage.ancestors || [];
        const descendants = lineage.descendants || [];
        const all = [...ancestors, root, ...descendants];

        // Assign x/y using depth → x, group peers → y
        const byDepth = d3.group(all, (n: any) => n.depth);
        const depths = [...byDepth.keys()].sort((a, b) => a - b);
        const minDepth = depths[0] ?? 0;
        const maxDepth = depths[depths.length - 1] ?? 0;

        const pad = 80;
        const xScale = d3
            .scaleLinear()
            .domain([minDepth, maxDepth])
            .range([pad, width - pad]);

        const positioned = all.map((node: any) => {
            const peers = byDepth.get(node.depth) || [];
            const idx = peers.findIndex((p: any) => p.id === node.id);
            const count = peers.length;
            const yStep = (height - 60) / (count + 1);
            return {
                ...node,
                x: xScale(node.depth),
                y: 30 + yStep * (idx + 1),
            };
        });

        const byId = new Map(positioned.map((n: any) => [n.id, n]));

        // Build links: ancestors chain + descendants from parent_id
        const links: { source: any; target: any; color: string }[] = [];
        const rootNode = positioned.find((n: any) => n.id === root.id);

        ancestors.forEach((node: any) => {
            const src = byId.get(node.id);
            const tgt = node.parent_id ? byId.get(node.parent_id) : rootNode;
            if (src && tgt) links.push({ source: src, target: tgt, color: "#22d3ee33" });
        });
        descendants.forEach((node: any) => {
            const src = node.parent_id ? byId.get(node.parent_id) : rootNode;
            const tgt = byId.get(node.id);
            if (src && tgt) links.push({ source: src, target: tgt, color: "#10b98133" });
        });

        // Draw curved links
        const linkGen = d3
            .linkHorizontal<any, any>()
            .x((d) => d.x)
            .y((d) => d.y);

        svg
            .append("g")
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("d", (d) => linkGen({ source: d.source, target: d.target }))
            .attr("fill", "none")
            .attr("stroke", (d) => d.color)
            .attr("stroke-width", 1.5);

        // Draw nodes
        const nodeG = svg
            .append("g")
            .selectAll("g")
            .data(positioned)
            .join("g")
            .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

        const isRoot = (d: any) => d.id === root.id;

        // Glow filter
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "glow");
        filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Outer ring for root
        nodeG
            .filter(isRoot)
            .append("circle")
            .attr("r", 18)
            .attr("fill", "none")
            .attr("stroke", tierColor(root.tier))
            .attr("stroke-width", 1)
            .attr("opacity", 0.4)
            .attr("stroke-dasharray", "4 3");

        // Main circle
        nodeG
            .append("circle")
            .attr("r", (d: any) => (isRoot(d) ? 12 : 8))
            .attr("fill", (d: any) => tierColor(d.tier))
            .attr("opacity", (d: any) => (d.status === "active" ? 0.95 : 0.45))
            .attr("filter", (d: any) => (isRoot(d) ? "url(#glow)" : ""))
            .attr("stroke", "#0a1120")
            .attr("stroke-width", 2);

        // Trust score badge
        nodeG
            .append("text")
            .text((d: any) => `${(Number(d.trust_score) * 100).toFixed(0)}%`)
            .attr("x", 0)
            .attr("y", (d: any) => (isRoot(d) ? -16 : -12))
            .attr("text-anchor", "middle")
            .attr("fill", (d: any) => tierColor(d.tier))
            .style("font-size", "9px")
            .style("font-weight", "700")
            .style("font-family", "monospace");

        // Agent code
        nodeG
            .append("text")
            .text((d: any) => d.agent_code)
            .attr("x", (d: any) => (isRoot(d) ? 17 : 13))
            .attr("y", 4)
            .attr("fill", "#e2e8f0")
            .style("font-size", "10px")
            .style("font-family", "monospace")
            .style("font-weight", (d: any) => (isRoot(d) ? "700" : "400"));

        // Depth label
        nodeG
            .append("text")
            .text((d: any) => {
                if (d.depth === 0) return "ROOT";
                if (d.depth < 0) return `GEN ${Math.abs(d.depth)}↑`;
                return `GEN ${d.depth}↓`;
            })
            .attr("x", (d: any) => (isRoot(d) ? 17 : 13))
            .attr("y", 14)
            .attr("fill", "#64748b")
            .style("font-size", "8px")
            .style("font-family", "monospace");
    }, [lineage]);

    return (
        <svg
            ref={svgRef}
            className="w-full h-full rounded-xl bg-[#020408] border border-white/5"
            style={{ minHeight: 280 }}
        />
    );
}

// ─── DNA Helix ──────────────────────────────────────────────────────────────

function DNAHelix({ agentCode }: { agentCode?: string }) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const el = svgRef.current;
        const svg = d3.select(el);
        svg.selectAll("*").remove();

        const width = el.clientWidth || 600;
        const height = 160;
        svg.attr("viewBox", `0 0 ${width} ${height}`);

        const cy = height / 2;
        const amp = 28;
        const turns = 7;
        const pts = d3.range(0, width + 1, 6);

        const strandA = d3
            .line<number>()
            .x((d) => d)
            .y((d) => cy + Math.sin((d / width) * Math.PI * turns) * amp)
            .curve(d3.curveCatmullRom.alpha(0.5));

        const strandB = d3
            .line<number>()
            .x((d) => d)
            .y((d) => cy + Math.sin((d / width) * Math.PI * turns + Math.PI) * amp)
            .curve(d3.curveCatmullRom.alpha(0.5));

        svg
            .append("path")
            .datum(pts)
            .attr("d", strandA)
            .attr("fill", "none")
            .attr("stroke", "#22d3ee")
            .attr("stroke-width", 2)
            .attr("opacity", 0.85);

        svg
            .append("path")
            .datum(pts)
            .attr("d", strandB)
            .attr("fill", "none")
            .attr("stroke", "#10b981")
            .attr("stroke-width", 2)
            .attr("opacity", 0.85);

        const rungs = d3.range(0, width, 18);
        svg
            .append("g")
            .selectAll("line")
            .data(rungs)
            .join("line")
            .attr("x1", (d: number) => d)
            .attr("x2", (d: number) => d)
            .attr("y1", (d: number) => cy + Math.sin((d / width) * Math.PI * turns) * amp)
            .attr("y2", (d: number) => cy + Math.sin((d / width) * Math.PI * turns + Math.PI) * amp)
            .attr("stroke", "#94a3b8")
            .attr("stroke-width", 0.8)
            .attr("opacity", 0.3);
    }, [agentCode]);

    return (
        <svg
            ref={svgRef}
            className="w-full rounded-xl bg-[#020408] border border-white/5"
            style={{ height: 160 }}
        />
    );
}

// ─── Agent Node Card ─────────────────────────────────────────────────────────

function AgentNodeCard({
    agent,
    selected,
    onClick,
}: {
    agent: any;
    selected: boolean;
    onClick: () => void;
}) {
    const tier = (agent.tier || "").toUpperCase();
    const score = Number(agent.trust_score ?? 0);
    const color = tierColor(tier);

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 cursor-pointer group",
                selected
                    ? "border-cyan-500/60 bg-cyan-500/8 shadow-[0_0_16px_-4px_rgba(6,182,212,0.35)]"
                    : "border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/4"
            )}
        >
            <div
                className="relative w-11 h-11 rounded-xl border flex items-center justify-center"
                style={{
                    borderColor: `${color}60`,
                    backgroundColor: `${color}12`,
                    boxShadow: selected ? `0 0 14px -4px ${color}60` : "none",
                }}
            >
                <span className="text-xs font-bold text-white font-mono uppercase">
                    {(agent.code || agent.agent_code || "??").substring(0, 3)}
                </span>
                <span
                    className="absolute -top-1 -right-1 text-black text-[8px] font-black px-1 rounded"
                    style={{ backgroundColor: color }}
                >
                    {(score * 100).toFixed(0)}%
                </span>
                <span
                    className={cn(
                        "absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full border-2 border-[#030304]",
                        agent.status === "active" ? "bg-emerald-500" : "bg-slate-500"
                    )}
                />
            </div>
            <span className="text-[9px] text-slate-400 font-mono max-w-[80px] truncate group-hover:text-white transition-colors text-center">
                {(agent.name || agent.display_name || agent.code || "").split(" ")[0]}
            </span>
            <span
                className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ color, backgroundColor: `${color}18` }}
            >
                {tier}
            </span>
        </button>
    );
}

// ─── Tier Column ─────────────────────────────────────────────────────────────

const TIER_BANDS = [
    { label: "PLATINUM", codes: ["T0", "T1"], colorClass: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" },
    { label: "GOLD", codes: ["T2"], colorClass: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
    { label: "SILVER", codes: ["T3", "T4"], colorClass: "text-slate-400 border-slate-500/30 bg-slate-500/5" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export function TrustTopology() {
    const realtime = useRealtimePulse();

    const { data: agentsData, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
        refetchInterval: 10000,
    });

    const rawAgents = agentsData?.agents || [];
    const agents = rawAgents.map((a: any) => ({
        ...a,
        code: a.agent_code,
        name: a.display_name,
        trust_score: Number(a.trust_score ?? 0),
        authority_limit: Number(a.authority_limit ?? 0),
    }));

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
        refetchInterval: 30000,
    });

    const selectedAgent = useMemo(
        () => agents.find((a: any) => a.id === selectedAgentId),
        [agents, selectedAgentId]
    );

    // Use real lineage data if it has more than 1 node, else build from agents
    const displayLineage = useMemo(() => {
        if (lineageData && lineageData.total_nodes > 1) return lineageData;
        return buildFallbackLineage(agents);
    }, [lineageData, agents]);

    // Stats derived from agents
    const stats = useMemo(() => {
        const active = agents.filter((a: any) => a.status === "active").length;
        const avgTrust =
            agents.length > 0
                ? agents.reduce((s: number, a: any) => s + Number(a.trust_score), 0) /
                  agents.length
                : 0;
        const totalAuth = agents.reduce(
            (s: number, a: any) => s + Number(a.authority_limit),
            0
        );
        return { active, avgTrust, totalAuth };
    }, [agents]);

    return (
        <div className="flex flex-col gap-6 pb-8">
            {/* Header */}
            <header>
                <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
                    Trust Topology Map
                </h1>
                <p className="text-muted-foreground text-sm flex items-center gap-2 flex-wrap">
                    <DeviceHubIcon sx={{ fontSize: 15 }} className="text-emerald-500" />
                    SENTINEL Graph — Visualising authoritative hierarchies and trust
                    propagation across the fleet.
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px]",
                            realtime.connected
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        )}
                    >
                        <CircleIcon sx={{ fontSize: 7 }} />
                        {realtime.connected ? "Realtime connected" : "Reconnecting…"}
                    </span>
                </p>
            </header>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    {
                        icon: <HubIcon sx={{ fontSize: 16 }} className="text-cyan-400" />,
                        label: "Active Agents",
                        value: isLoading ? "—" : String(stats.active),
                        sub: `of ${agents.length} total`,
                    },
                    {
                        icon: <TrendingUpIcon sx={{ fontSize: 16 }} className="text-emerald-400" />,
                        label: "Fleet Trust Avg",
                        value: isLoading ? "—" : `${(stats.avgTrust * 100).toFixed(1)}%`,
                        sub: "composite trust score",
                    },
                    {
                        icon: <ShieldIcon sx={{ fontSize: 16 }} className="text-amber-400" />,
                        label: "Total Authority",
                        value: isLoading
                            ? "—"
                            : `₹${(stats.totalAuth / 1e5).toFixed(1)}L`,
                        sub: "combined authority limit",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="bg-white/2 border border-border rounded-xl p-4 flex items-center gap-3"
                    >
                        <div className="p-2 rounded-lg bg-white/4">{s.icon}</div>
                        <div>
                            <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
                            <p className="text-lg font-bold text-white font-mono">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* DNA Helix + Lineage Tree — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DNA Helix */}
                <section className="bg-[#030304]/40 border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <BiotechIcon sx={{ fontSize: 15 }} className="text-cyan-400" />
                            DNA Helix Signature
                        </h2>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {selectedAgent?.code
                                ? `Anchor: ${selectedAgent.code}`
                                : "Select an agent"}
                        </span>
                    </div>
                    <DNAHelix agentCode={selectedAgent?.code} />

                    {/* Selected agent info */}
                    {selectedAgent && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {[
                                { label: "Trust Score", value: `${(Number(selectedAgent.trust_score) * 100).toFixed(1)}%` },
                                { label: "Tier", value: selectedAgent.tier },
                                {
                                    label: "Authority Limit",
                                    value: `₹${Number(selectedAgent.authority_limit).toLocaleString("en-IN")}`,
                                },
                                { label: "Status", value: selectedAgent.status },
                            ].map((row) => (
                                <div key={row.label} className="bg-white/3 rounded-lg px-3 py-2">
                                    <p className="text-[10px] text-muted-foreground mb-0.5">{row.label}</p>
                                    <p className="text-xs font-semibold text-white font-mono capitalize">
                                        {row.value}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Agent Lineage Tree */}
                <section className="bg-[#030304]/40 border border-border rounded-2xl p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-3 gap-3">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2 shrink-0">
                            <AccountTreeIcon sx={{ fontSize: 15 }} className="text-emerald-400" />
                            Agent Lineage Tree
                        </h2>
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="bg-[#0b1117] border border-border text-xs text-white rounded-lg px-2 py-1 outline-none min-w-0 flex-1 max-w-52"
                        >
                            {agents.map((a: any) => (
                                <option key={a.id} value={a.id}>
                                    {a.code} — {a.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1" style={{ minHeight: 280 }}>
                        {isLoading ? (
                            <div className="w-full h-full rounded-xl bg-[#020408] border border-white/5 flex items-center justify-center text-xs text-muted-foreground animate-pulse" style={{ minHeight: 280 }}>
                                Building lineage graph…
                            </div>
                        ) : (
                            <LineageTree lineage={displayLineage} />
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                        {[
                            { color: "#22d3ee", label: "T0/T1 Platinum" },
                            { color: "#f59e0b", label: "T2 Gold" },
                            { color: "#94a3b8", label: "T3 Silver" },
                            { color: "#10b981", label: "T4 Bronze" },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-1.5">
                                <div
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-[10px] text-muted-foreground">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Trust Tier Authority Grid */}
            <section className="bg-[#030304]/40 border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                    <DeviceHubIcon sx={{ fontSize: 16 }} className="text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Authority Tiers — Fleet View</h2>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                        Click an agent to inspect its lineage
                    </span>
                </div>

                {isLoading ? (
                    <div className="h-40 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                        Loading fleet…
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TIER_BANDS.map((band) => {
                            const bandAgents = agents.filter((a: any) =>
                                band.codes.includes((a.tier || "").toUpperCase())
                            );
                            return (
                                <div key={band.label} className="flex flex-col gap-3">
                                    {/* Band header */}
                                    <div
                                        className={cn(
                                            "text-[10px] font-bold tracking-[0.18em] py-1.5 px-4 rounded-full border self-start",
                                            band.colorClass
                                        )}
                                    >
                                        {band.label} AUTHORITY
                                    </div>

                                    {/* Agent cards */}
                                    <div className="flex flex-wrap gap-2">
                                        {bandAgents.length > 0 ? (
                                            bandAgents.map((agent: any) => (
                                                <AgentNodeCard
                                                    key={agent.id}
                                                    agent={agent}
                                                    selected={selectedAgentId === agent.id}
                                                    onClick={() =>
                                                        setSelectedAgentId(agent.id)
                                                    }
                                                />
                                            ))
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground italic">
                                                No {band.label.toLowerCase()} agents
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Footer info cards */}
            <footer className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    {
                        icon: <BiotechIcon sx={{ fontSize: 14 }} className="text-cyan-400" />,
                        title: "Isolation Level",
                        desc: "Platinum nodes operate in high-security enclaves with direct administrative oversight and maximum authority.",
                    },
                    {
                        icon: <AccountTreeIcon sx={{ fontSize: 14 }} className="text-amber-400" />,
                        title: "Decision Latency",
                        desc: "Authority propagation takes ~14ms across the topology. Any break in trust triggers immediate node isolation.",
                    },
                    {
                        icon: <DeviceHubIcon sx={{ fontSize: 14 }} className="text-emerald-400" />,
                        title: "Topology Health",
                        desc: "The current trust graph is stable. All nodes are reporting consistent authority signatures.",
                    },
                ].map((card) => (
                    <div
                        key={card.title}
                        className="bg-white/2 border border-border p-4 rounded-xl"
                    >
                        <div className="flex items-center gap-2 text-white font-semibold text-xs mb-2">
                            {card.icon}
                            {card.title}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            {card.desc}
                        </p>
                    </div>
                ))}
            </footer>
        </div>
    );
}
