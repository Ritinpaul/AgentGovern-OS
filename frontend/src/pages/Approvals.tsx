import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchEscalations, resolveEscalation } from "@/lib/api";
import { cn } from "@/lib/utils";

// MUI Icons
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

export function Approvals() {
    const queryClient = useQueryClient();
    const [selectedCase, setSelectedCase] = useState<any>(null);
    const [reason, setReason] = useState("");

    const { data: escalations, isLoading } = useQuery({
        queryKey: ["escalations"],
        queryFn: () => fetchEscalations("pending"),
        refetchInterval: 10000,
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, verdict, human_reason }: any) =>
            resolveEscalation(id, { verdict, human_reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["escalations"] });
            setSelectedCase(null);
            setReason("");
        },
    });

    const handleResolve = (verdict: "APPROVED" | "REJECTED") => {
        if (!selectedCase) return;
        resolveMutation.mutate({
            id: selectedCase.id,
            verdict,
            human_reason: reason || `Action ${verdict.toLowerCase()} by administrator via dashboard.`,
        });
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Human Approval Workbench</h1>
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                        <FactCheckIcon sx={{ fontSize: 16 }} className="text-emerald-500" />
                        ECLIPSE Module — Managing escalated agent actions requiring human oversight.
                    </p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-500/20">
                    {escalations?.length || 0} Pending Items
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left List: Escalation Queue */}
                <div className="lg:col-span-4 flex flex-col gap-3 overflow-y-auto no-scrollbar">
                    {isLoading && (
                        <div className="flex items-center justify-center p-12 text-muted-foreground text-sm italic">
                            Scanning for escalations...
                        </div>
                    )}

                    {!isLoading && escalations?.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-border bg-white/[0.02]">
                            <CheckCircleOutlineIcon className="text-emerald-500 mb-2 opacity-50" />
                            <p className="text-muted-foreground text-sm">Queue is clear. No escalations.</p>
                        </div>
                    )}

                    {escalations?.map((item: any) => (
                        <motion.div
                            key={item.id}
                            layoutId={item.id}
                            onClick={() => setSelectedCase(item)}
                            className={cn(
                                "p-4 rounded-xl border cursor-pointer transition-all transition-duration-200",
                                selectedCase?.id === item.id
                                    ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]"
                                    : "bg-white/[0.03] border-border hover:border-emerald-500/20 hover:bg-white/[0.05]"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    {item.agent_code}
                                </span>
                                {item.priority === "high" ? (
                                    <PriorityHighIcon sx={{ fontSize: 14 }} className="text-red-400" />
                                ) : (
                                    <WarningAmberIcon sx={{ fontSize: 14 }} className="text-orange-400" />
                                )}
                            </div>
                            <h3 className="text-sm font-medium text-white mb-1 truncate">
                                {item.escalation_reason.length > 40 ? item.escalation_reason.slice(0, 40) + '...' : item.escalation_reason}
                            </h3>
                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                                <span className="flex items-center gap-1">
                                    View Case <KeyboardArrowRightIcon sx={{ fontSize: 14 }} />
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Right Detail: Workbench */}
                <div className="lg:col-span-8 bg-[#030304]/40 border border-border rounded-2xl overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                        {selectedCase ? (
                            <motion.div
                                key={selectedCase.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col h-full"
                            >
                                {/* Header detail */}
                                <div className="p-6 border-b border-white/[0.05] bg-gradient-to-r from-emerald-500/[0.03] to-transparent">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-lg font-semibold text-white mb-1">Escalated Decision Review</h2>
                                            <p className="text-xs text-muted-foreground">Case ID: {selectedCase.id}</p>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            selectedCase.priority === "high" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                                        )}>
                                            {selectedCase.priority} Priority
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Agent Identity</label>
                                            <div className="font-mono text-sm text-emerald-400 font-bold">{selectedCase.agent_code}</div>
                                        </div>
                                        <div className="w-px bg-white/[0.05]" />
                                        <div className="flex-1">
                                            <label className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Trigger Reason</label>
                                            <div className="text-sm text-white font-medium">{selectedCase.escalation_reason}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content detail */}
                                <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-6">
                                    <section>
                                        <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                                            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                                            Action Context
                                        </h4>
                                        <div className="bg-[#050507] border border-white/[0.05] rounded-xl p-4">
                                            <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed">
                                                {JSON.stringify(selectedCase.context_package, null, 2)}
                                            </pre>
                                        </div>
                                    </section>

                                    <section className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-white mb-2">Decision Memo</h4>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Add administrative reasoning for your decision (recorded in audit ledger)..."
                                            className="w-full bg-black/40 border border-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 min-h-[100px] resize-none"
                                        />
                                    </section>
                                </div>

                                {/* Actions footer */}
                                <div className="p-6 border-t border-white/[0.05] flex gap-4">
                                    <button
                                        onClick={() => handleResolve("REJECTED")}
                                        disabled={resolveMutation.isPending}
                                        className="flex-1 h-11 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-colors font-medium flex items-center justify-center gap-2"
                                    >
                                        <HighlightOffIcon sx={{ fontSize: 18 }} />
                                        Reject Action
                                    </button>
                                    <button
                                        onClick={() => handleResolve("APPROVED")}
                                        disabled={resolveMutation.isPending}
                                        className="flex-1 h-11 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-colors font-bold flex items-center justify-center gap-2"
                                    >
                                        <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                                        Approve Action
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-12">
                                <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-border flex items-center justify-center mb-6">
                                    <FactCheckIcon sx={{ fontSize: 32 }} className="text-muted-foreground opacity-20" />
                                </div>
                                <h3 className="text-lg font-medium text-white mb-2">Select a case to review</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Pending agent actions that triggered architectural boundary alerts or authority limits will appear in the queue.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
