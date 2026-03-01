import { Card, CardHeader, CardTitle, CardContent } from "./Card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const DATA = [
    { name: "Mon", cloud: 120, edge: 45, client: 8 },
    { name: "Tue", cloud: 135, edge: 55, client: 12 },
    { name: "Wed", cloud: 140, edge: 50, client: 10 },
    { name: "Thu", cloud: 128, edge: 60, client: 15 },
    { name: "Fri", cloud: 150, edge: 70, client: 22 },
    { name: "Sat", cloud: 80, edge: 30, client: 5 },
    { name: "Sun", cloud: 90, edge: 35, client: 6 },
];

const COLORS = {
    cloud: "#3b82f6", // Blue
    edge: "#10b981",  // Emerald
    client: "#8b5cf6" // Violet
};

export function EnvironmentTopology() {
    return (
        <Card className="col-span-full xl:col-span-3">
            <CardHeader>
                <CardTitle>Environment Topology (Live)</CardTitle>
                <p className="text-sm text-muted-foreground">Active agent distribution across Edge, Cloud, and Client execution nodes.</p>
            </CardHeader>
            <CardContent className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717a", fontSize: 12 }} />
                        <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{ backgroundColor: "#121316", borderColor: "#24262d", borderRadius: "8px", boxShadow: "0 4px 12px 0 rgba(0,0,0,0.5)" }}
                            itemStyle={{ color: "#fff" }}
                        />
                        <Bar dataKey="cloud" stackId="a" fill={COLORS.cloud} radius={[0, 0, 4, 4]}>
                            {DATA.map((_, index) => (
                                <Cell key={`cell-cloud-${index}`} fillOpacity={0.8} />
                            ))}
                        </Bar>
                        <Bar dataKey="edge" stackId="a" fill={COLORS.edge}>
                            {DATA.map((_, index) => (
                                <Cell key={`cell-edge-${index}`} fillOpacity={0.8} />
                            ))}
                        </Bar>
                        <Bar dataKey="client" stackId="a" fill={COLORS.client} radius={[4, 4, 0, 0]}>
                            {DATA.map((_, index) => (
                                <Cell key={`cell-client-${index}`} fillOpacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-blue-500 opacity-80" />
                        <span className="text-xs text-muted-foreground font-medium">Cloud (Centralized)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 opacity-80" />
                        <span className="text-xs text-muted-foreground font-medium">Edge (Gateways)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-violet-500 opacity-80" />
                        <span className="text-xs text-muted-foreground font-medium">Client (Local Devices)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
