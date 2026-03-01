import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { cn } from "@/lib/utils";

// MUI
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import CodeIcon from "@mui/icons-material/Code";
import LanguageIcon from "@mui/icons-material/Language";

import { useQuery } from "@tanstack/react-query";
import { fetchPolicies } from "@/lib/api";

type PolicyType = {
    id: string;
    policy_code: string;
    policy_name: string;
    category: string;
    rule_definition: any;
    severity: string;
    is_active: boolean;
    applies_to_tiers: string[];
};

export function Policy() {
    const { data: policies = [], isLoading } = useQuery<PolicyType[]>({
        queryKey: ["policies"],
        queryFn: fetchPolicies,
    });

    const [activeRule, setActiveRule] = useState<PolicyType | null>(null);

    // Initialize selection when data loads
    if (!activeRule && policies.length > 0) {
        setActiveRule(policies[0]);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-between mb-6 shrink-0"
            >
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Policy Enforcer</h1>
                    <p className="text-muted-foreground mt-1">Configure OPA/Rego rules for distributed edge environments.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border">
                        <span className="text-xs text-muted-foreground font-mono">Draft Hash:</span>
                        <span className="text-xs text-white font-mono">0x7f4a...e83a</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md transition-colors shadow-[0_0_15px_-3px_rgba(79,70,229,0.5)]">
                        Publish Bundle
                    </button>
                </div>
            </motion.div>

            {/* Split Layout */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">

                {/* Left Panel: Rule List */}
                <Card className="lg:col-span-5 h-full flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/50 shrink-0">
                        <div className="flex justify-between items-center">
                            <CardTitle>Active Rules</CardTitle>
                            <button className="p-1 text-muted-foreground hover:text-white transition-colors">
                                <AddIcon sx={{ fontSize: 20 }} />
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search rules..."
                            className="mt-3 w-full bg-black/50 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-white placeholder:text-muted-foreground transition-all"
                        />
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2 no-scrollbar">
                        <div className="space-y-1">
                            {isLoading ? (
                                <p className="text-sm text-center text-muted-foreground py-6">Loading policies...</p>
                            ) : policies.map((rule) => {
                                const isActive = activeRule?.id === rule.id;
                                return (
                                    <div
                                        key={rule.id}
                                        onClick={() => setActiveRule(rule)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                                            isActive
                                                ? "bg-white/10 border-white/20"
                                                : "bg-transparent border-transparent hover:bg-white/5"
                                        )}
                                    >
                                        <DragIndicatorIcon sx={{ fontSize: 16 }} className="text-muted-foreground opacity-50 cursor-grab" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{rule.policy_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                                                    {rule.category}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Custom Toggle */}
                                        <div className={cn("w-8 h-4 rounded-full flex items-center p-0.5 transition-colors", rule.is_active ? "bg-primary" : "bg-muted")}>
                                            <div className={cn("w-3 h-3 bg-background rounded-full transform transition-transform", rule.is_active ? "translate-x-4" : "translate-x-0")} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Panel: Rule Editor */}
                {activeRule ? (
                    <Card className="lg:col-span-7 h-full flex flex-col bg-[#0a0a0c] border border-border/80">
                        <CardHeader className="pb-4 border-b border-border/50 shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{activeRule.policy_name}</CardTitle>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">CODE: {activeRule.policy_code} • Type: OPA/Rego</p>
                                </div>
                                <div className={cn(
                                    "px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider",
                                    activeRule.severity === "critical" ? "text-destructive bg-destructive/10 border border-destructive/20" :
                                        activeRule.severity === "high" ? "text-amber-500 bg-amber-500/10 border border-amber-500/20" :
                                            "text-success bg-success/10 border border-success/20"
                                )}>
                                    {activeRule.severity} Priority
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">

                            {/* Scoping Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                    <LanguageIcon sx={{ fontSize: 18 }} className="text-muted-foreground" /> Environment Scope
                                </div>
                                <div className="flex gap-2">
                                    {["cloud", "edge", "client"].map(env => (
                                        <button
                                            key={env}
                                            className={cn(
                                                "px-4 py-1.5 rounded-md text-sm transition-colors border",
                                                // Simplified mock since the real DB has applies_to_tiers which dictates env
                                                "bg-primary/20 text-white border-primary/50"
                                            )}
                                        >
                                            {env.charAt(0).toUpperCase() + env.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Gateways pull specific bundles based on their assigned environment scope.</p>
                            </div>

                            {/* Code Editor Mock */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm font-medium text-white">
                                    <span className="flex items-center gap-2">
                                        <CodeIcon sx={{ fontSize: 18 }} className="text-muted-foreground" /> Rule Parameters (JSON)
                                    </span>
                                    <span className="text-xs font-mono text-muted-foreground">rego_vars</span>
                                </div>
                                <div className="rounded-lg bg-[#000000] border border-border/50 overflow-hidden font-mono text-sm">
                                    <div className="flex bg-[#111] px-4 py-2 border-b border-white/5">
                                        <span className="text-xs text-muted-foreground">policy_config.json</span>
                                    </div>
                                    <div className="p-4 text-emerald-400">
                                        <pre>
                                            <code>
                                                {JSON.stringify(activeRule.rule_definition, null, 2)}
                                            </code>
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/30 flex justify-end">
                                <button className="text-sm font-medium text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md transition-all">
                                    Save Changes to Draft
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="lg:col-span-7 h-full flex flex-col justify-center items-center bg-[#0a0a0c] border border-border/80 text-muted-foreground">
                        Select a policy to edit
                    </Card>
                )}
            </div>
        </div>
    );
}
