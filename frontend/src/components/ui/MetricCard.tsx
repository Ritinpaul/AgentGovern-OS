import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "./Card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    title: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: React.ElementType;
    data: any[];
    delay?: number;
}

export function MetricCard({
    title,
    value,
    trend,
    trendUp,
    icon: Icon,
    data,
    delay = 0,
}: MetricCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
        >
            <Card className="overflow-hidden group hover:border-primary/30 transition-colors duration-300">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{title}</p>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-3xl font-semibold tracking-tight text-white">{value}</h2>
                                <span
                                    className={cn(
                                        "text-xs font-medium px-1.5 py-0.5 rounded-md",
                                        trendUp ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                                    )}
                                >
                                    {trend}
                                </span>
                            </div>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Icon sx={{ fontSize: 20 }} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    </div>

                    {/* Subtle Sparkline Chart */}
                    <div className="h-[40px] w-full mt-4 -mx-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={trendUp ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={trendUp ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={trendUp ? "#10b981" : "#ef4444"}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill={`url(#gradient-${title.replace(/\s+/g, '')})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
