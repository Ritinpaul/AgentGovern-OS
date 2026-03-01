import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./Card";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import { cn } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api";

type AuditLog = {
    id: string;
    agent: string;
    env: string;
    action: string;
    amount: string;
    status: string;
    time: string;
};

const StatusBadge = ({ status }: { status: string }) => {
    if (status === "allowed") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
                <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> Allowed
            </span>
        );
    }
    if (status === "denied") {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                <BlockIcon sx={{ fontSize: 14 }} /> Denied
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <WarningAmberIcon sx={{ fontSize: 14 }} /> Escalated
        </span>
    );
};

export function RecentAuditLedger() {
    const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
        queryKey: ["auditLogs"],
        queryFn: fetchAuditLogs,
        refetchInterval: 5000, // Poll every 5 seconds for live edge sync
    });

    return (
        <Card className="col-span-full xl:col-span-4 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle>Recent Audit Ledger</CardTitle>
                    <p className="text-sm text-muted-foreground">Live decisions synced from Edge Gateways.</p>
                </div>
                <button className="text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-md transition-colors">
                    View Master Chain
                </button>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-auto no-scrollbar">
                <div className="min-w-full inline-block align-middle">
                    <table className="min-w-full divide-y divide-border/50">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Hash ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Environment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Action / Amount</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Verdict</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30 bg-transparent">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                        Syncing ledger from Edge Gateways...
                                    </td>
                                </tr>
                            ) : auditLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                        No recent decisions recorded.
                                    </td>
                                </tr>
                            ) : auditLogs.map((log: AuditLog, idx: number) => (
                                <motion.tr
                                    key={`${log.id}-${idx}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * idx, duration: 0.3 }}
                                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground group-hover:text-emerald-400 transition-colors">
                                        {log.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                                        {log.agent}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs border border-border">
                                            {log.env}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        <span className="text-white">{log.action}</span>
                                        {log.amount !== "-" && <span className="ml-2 text-xs opacity-70">({log.amount})</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <StatusBadge status={log.status} />
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
