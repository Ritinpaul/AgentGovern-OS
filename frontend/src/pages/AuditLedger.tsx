import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { fetchAuditChainIntegrity, fetchAuditLogs, type AuditLog } from "@/lib/api";

import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SyncIcon from "@mui/icons-material/Sync";
import SearchIcon from "@mui/icons-material/Search";

type VerdictFilter = "all" | "allowed" | "denied" | "escalated";

const VERDICT_OPTIONS: VerdictFilter[] = ["all", "allowed", "denied", "escalated"];

export function AuditLedger() {
    const [search, setSearch] = useState("");
    const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");

    const {
        data: logs = [],
        isLoading: logsLoading,
        isFetching: logsFetching,
        refetch: refetchLogs,
    } = useQuery({
        queryKey: ["auditLogs", "full-page"],
        queryFn: fetchAuditLogs,
        refetchInterval: 8000,
    });

    const {
        data: integrity,
        isLoading: integrityLoading,
        isFetching: integrityFetching,
        refetch: refetchIntegrity,
    } = useQuery({
        queryKey: ["auditIntegrity"],
        queryFn: fetchAuditChainIntegrity,
        refetchInterval: 15000,
    });

    const filteredLogs = useMemo(() => {
        const query = search.trim().toLowerCase();
        return logs.filter((row: AuditLog) => {
            const verdictOk = verdictFilter === "all" ? true : row.status === verdictFilter;
            if (!verdictOk) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [row.id, row.agent, row.env, row.action, row.amount, row.status]
                .join(" ")
                .toLowerCase()
                .includes(query);
        });
    }, [logs, search, verdictFilter]);

    const refreshAll = async () => {
        await Promise.all([refetchLogs(), refetchIntegrity()]);
    };

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Federated Audit Ledger</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Immutable decision trail across Cloud, Edge, and Client execution boundaries.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refreshAll}
                    className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 px-3 py-2 rounded-md transition-colors"
                >
                    <SyncIcon sx={{ fontSize: 16 }} />
                    Refresh Ledger
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Ledger Integrity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {integrity?.valid ? (
                                <VerifiedUserIcon className="text-emerald-400" />
                            ) : (
                                <ErrorOutlineIcon className="text-amber-400" />
                            )}
                            <span className="text-xl font-semibold text-white">
                                {integrityLoading ? "..." : `${integrity?.integrity_pct ?? 0}%`}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {integrity?.valid ? "Hash chain is fully intact." : "Detected hash or linkage anomalies."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Total Blocks Checked</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold text-white">
                            {integrityLoading ? "..." : (integrity?.total_blocks ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">Most recent verification window.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">Broken Links / Blocks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold text-white">
                            {integrityLoading
                                ? "..."
                                : `${integrity?.broken_links?.length ?? 0} / ${integrity?.broken_blocks?.length ?? 0}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {integrity?.verified_at
                                ? `Verified at ${new Date(integrity.verified_at).toLocaleTimeString()}`
                                : "Awaiting verifier response"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="flex-1 min-h-0 flex flex-col">
                <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
                        <CardTitle className="text-base">Decision Log Stream</CardTitle>

                        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                            <div className="relative w-full sm:w-72">
                                <SearchIcon
                                    sx={{ fontSize: 16 }}
                                    className="absolute left-2.5 top-2.5 text-muted-foreground"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by hash, agent, action..."
                                    className="w-full rounded-md border border-border bg-[#030304]/60 pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                                />
                            </div>

                            <select
                                value={verdictFilter}
                                onChange={(e) => setVerdictFilter(e.target.value as VerdictFilter)}
                                className="rounded-md border border-border bg-[#030304]/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                            >
                                {VERDICT_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option === "all" ? "All verdicts" : option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 p-0 overflow-auto no-scrollbar">
                    <table className="min-w-full divide-y divide-border/50">
                        <thead>
                            <tr>
                                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Hash</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Agent</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Environment</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                                <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Verdict</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {(logsLoading || integrityLoading) && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-sm text-center text-muted-foreground">
                                        Loading ledger records...
                                    </td>
                                </tr>
                            )}

                            {!logsLoading && filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-sm text-center text-muted-foreground">
                                        No records matched your filters.
                                    </td>
                                </tr>
                            )}

                            {filteredLogs.map((row, idx) => (
                                <motion.tr
                                    key={`${row.id}-${idx}`}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.015 }}
                                    className="hover:bg-white/5"
                                >
                                    <td className="px-5 py-3 text-sm font-mono text-emerald-400">{row.id}</td>
                                    <td className="px-5 py-3 text-sm text-white">{row.agent}</td>
                                    <td className="px-5 py-3 text-sm text-muted-foreground">{row.env}</td>
                                    <td className="px-5 py-3 text-sm text-muted-foreground">{row.action}</td>
                                    <td className="px-5 py-3 text-sm text-muted-foreground">{row.amount}</td>
                                    <td className="px-5 py-3 text-right">
                                        <span
                                            className={[
                                                "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border",
                                                row.status === "allowed"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                                    : row.status === "denied"
                                                        ? "bg-red-500/10 text-red-400 border-red-500/25"
                                                        : "bg-amber-500/10 text-amber-400 border-amber-500/25",
                                            ].join(" ")}
                                        >
                                            {row.status}
                                        </span>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {(logsFetching || integrityFetching) && (
                <p className="text-xs text-muted-foreground">Syncing latest ledger updates...</p>
            )}
        </div>
    );
}
