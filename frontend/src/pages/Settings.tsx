import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { cn } from "@/lib/utils";

// MUI
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DnsIcon from "@mui/icons-material/Dns";
import SecurityIcon from "@mui/icons-material/Security";

const TABS = [
    { id: "general", label: "General", icon: DnsIcon },
    { id: "security", label: "Security & API", icon: SecurityIcon },
    { id: "notifications", label: "Notifications", icon: NotificationsIcon },
];

export function Settings() {
    const [activeTab, setActiveTab] = useState("general");

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-semibold tracking-tight text-white">Platform Settings</h1>
                <p className="text-muted-foreground mt-1">Manage global configuration for the AgentGovern OS.</p>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Settings Navigation */}
                <div className="w-full lg:w-64 shrink-0">
                    <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                        isActive
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <Icon sx={{ fontSize: 18 }} className={cn(isActive ? "text-primary" : "text-muted-foreground")} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Settings Content area */}
                <div className="flex-1">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {activeTab === "general" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Control Plane Configuration</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white">Master Node URL</label>
                                        <input
                                            type="text"
                                            defaultValue="https://api.agentgovern.enterprise/v1"
                                            className="w-full bg-[#050505] border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                        />
                                        <p className="text-xs text-muted-foreground">The central control plane address for Edge Gateway synchronization.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-white">Default Policy Mode</label>
                                        <select className="w-full bg-[#050505] border border-border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary transition-all appearance-none">
                                            <option value="permissive">Permissive (Log Only)</option>
                                            <option value="enforcing" selected>Enforcing (Block Unauthorized)</option>
                                            <option value="strict">Strict (Require Quorum)</option>
                                        </select>
                                    </div>

                                    <div className="pt-4 border-t border-border/50">
                                        <button className="text-sm font-medium text-white bg-primary px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
                                            Save Changes
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "security" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>API Credentials & JWT</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-medium text-white leading-none">Global Rotation Hook</h4>
                                            <p className="text-xs text-muted-foreground">Force immediate rotation of all Edge Gateway JWT secrets.</p>
                                        </div>
                                        <button className="text-xs font-semibold px-3 py-1.5 rounded bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive text-white transition-all">
                                            Force Rotate
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-white">Generated API Keys</h4>
                                        <div className="rounded-lg border border-border/50 bg-[#050505] overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                                                <div className="flex items-center gap-2">
                                                    <VpnKeyIcon sx={{ fontSize: 16 }} className="text-muted-foreground" />
                                                    <span className="text-sm text-white font-mono">pk_live_8f...49a</span>
                                                </div>
                                                <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">Active</span>
                                            </div>
                                            <div className="bg-white/5 px-4 py-3 flex justify-between items-center group">
                                                <span className="text-sm text-muted-foreground font-mono">sk_live_************************</span>
                                                <button className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {activeTab === "notifications" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Alert Routing</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Toggle items */}
                                    {[
                                        { title: "Policy Integrity Breaches", desc: "Notify when an Edge Gateway reports a tampered policy bundle." },
                                        { title: "Escalated Audit Events", desc: "Alert the security team when an agent action is escalated to human review." },
                                        { title: "Trust Score Drops", desc: "Notify when any agent's trust score drops below 70 across any execution tier." }
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-medium text-white leading-none">{item.title}</h4>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <div className="w-10 h-5 rounded-full bg-primary flex items-center p-0.5 cursor-pointer">
                                                <div className="w-4 h-4 rounded-full bg-white transform translate-x-5 shadow-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
