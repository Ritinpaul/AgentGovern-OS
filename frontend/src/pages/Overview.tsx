import { motion } from "framer-motion";
import { MetricCard } from "../components/ui/MetricCard";
import { RecentAuditLedger } from "../components/ui/RecentAuditLedger";
import { EnvironmentTopology } from "../components/ui/EnvironmentTopology";
import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "@/lib/api";

// MUI Icons
import GroupIcon from "@mui/icons-material/Group";
import DevicesIcon from "@mui/icons-material/Devices";
import GppBadIcon from "@mui/icons-material/GppBad";
import WarningIcon from "@mui/icons-material/Warning";

// Dummy data for the Recharts sparklines
const mockTrendData = (length = 7, min = 10, max = 50) =>
    Array.from({ length }, () => ({ value: Math.floor(Math.random() * (max - min + 1)) + min }));

export function Overview() {
    const { data: agentsData, isLoading: isLoadingAgents } = useQuery({
        queryKey: ["agents"],
        queryFn: fetchAgents,
        refetchInterval: 10000,
    });

    const totalFleet = agentsData?.total || 0;

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
                    <h1 className="text-2xl font-semibold tracking-tight text-white">Fleet Command Center</h1>
                    <p className="text-muted-foreground mt-1">
                        Global overview of agent governance across Cloud, Edge, and Client nodes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="text-xs font-medium bg-white/5 hover:bg-white/10 text-white border border-border px-3 py-1.5 rounded-md transition-colors">
                        Export Report
                    </button>
                    <button className="text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md transition-colors">
                        Deploy Policy
                    </button>
                </div>
            </motion.div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Fleet Size"
                    value={isLoadingAgents ? "..." : totalFleet.toLocaleString()}
                    trend="+12% this month"
                    trendUp={true}
                    icon={GroupIcon}
                    data={mockTrendData(10, 3000, 4821)}
                    delay={0.1}
                />
                <MetricCard
                    title="Active Edge Gateways"
                    value="142"
                    trend="+3 online today"
                    trendUp={true}
                    icon={DevicesIcon}
                    data={mockTrendData(10, 100, 142)}
                    delay={0.2}
                />
                <MetricCard
                    title="Policy Blocks (24h)"
                    value="3,940"
                    trend="-5% vs yesterday"
                    trendUp={true} // Going down is good for blocks
                    icon={GppBadIcon}
                    data={mockTrendData(10, 4000, 3940)}
                    delay={0.3}
                />
                <MetricCard
                    title="High-Risk Escalations"
                    value="24"
                    trend="+8 requires review"
                    trendUp={false} // Going up is bad for risk
                    icon={WarningIcon}
                    data={mockTrendData(10, 5, 24)}
                    delay={0.4}
                />
            </div>

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
