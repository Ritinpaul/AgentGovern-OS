import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

// MUI Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import PolicyIcon from "@mui/icons-material/Policy";
import SecurityIcon from "@mui/icons-material/Security";
import TimelineIcon from "@mui/icons-material/Timeline";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import DevicesOtherIcon from "@mui/icons-material/DevicesOther";
import BoltIcon from "@mui/icons-material/Bolt";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { label: "Overview", path: "/dashboard", icon: DashboardIcon },
    { label: "Agent Fleet", path: "/dashboard/fleet", icon: GroupWorkIcon },
    { label: "Policy Enforcer", path: "/dashboard/policy", icon: PolicyIcon },
    { label: "Audit Ledger", path: "/dashboard/audit", icon: SecurityIcon },
    { label: "Trust Topology", path: "/dashboard/trust", icon: TimelineIcon },
    { label: "Edge Gateways", path: "/dashboard/gateways", icon: DevicesOtherIcon },
    { label: "SAP Demo", path: "/dashboard/demo", icon: BoltIcon },
];

export function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    // Handle subtle responsiveness (collapse automatically on smaller screens)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setCollapsed(true);
            }
        };
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <motion.aside
            animate={{ width: collapsed ? "72px" : "260px" }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="h-screen sticky top-0 flex flex-col border-r border-border bg-[#030304] z-40 overflow-hidden"
            style={{ boxShadow: "1px 0 15px rgba(0,0,0,0.6), 1px 0 30px rgba(16,185,129,0.03)" }}
        >
            {/* Brand Header */}
            <div className="flex h-16 shrink-0 items-center justify-between px-4">
                {!collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="flex items-center justify-center shrink-0">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="28" height="28" rx="6" fill="url(#logo_gradient)" />
                                <path d="M14 6L20 9V14C20 18.5 14 22 14 22C14 22 8 18.5 8 14V9L14 6Z" stroke="#050505" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="14" cy="12" r="2" fill="#050505" />
                                <defs>
                                    <linearGradient id="logo_gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#22c55e" />
                                        <stop offset="1" stopColor="#15803d" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <span className="font-semibold tracking-tight text-white text-md">
                            AgentGovern OS
                        </span>
                    </motion.div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        "p-1.5 rounded-md hover:bg-white/10 text-muted-foreground transition-colors",
                        collapsed && "mx-auto"
                    )}
                >
                    {collapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-2">
                    {!collapsed && "Governance Platform"}
                </div>

                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <Link key={item.path} to={item.path}>
                            <div
                                className={cn(
                                    "group relative flex items-center rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-muted-foreground hover:bg-emerald-500/5 hover:text-white"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav"
                                        className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-emerald-400 ml-0.5"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}

                                <Icon
                                    sx={{ fontSize: 20 }}
                                    className={cn("shrink-0", collapsed ? "mx-auto" : "mr-3", isActive && "text-emerald-400")}
                                />

                                {!collapsed && (
                                    <span className="truncate">{item.label}</span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Footer Settings */}
            <div className="p-3 border-t border-border mt-auto">
                <Link to="/dashboard/settings">
                    <div className={cn(
                        "flex items-center rounded-lg p-2.5 text-sm font-medium text-muted-foreground hover:bg-emerald-500/5 hover:text-white transition-all",
                        location.pathname === "/dashboard/settings" && "bg-emerald-500/10 text-emerald-400"
                    )}>
                        <SettingsIcon sx={{ fontSize: 20 }} className={collapsed ? "mx-auto" : "mr-3"} />
                        {!collapsed && "Settings"}
                    </div>
                </Link>
            </div>
        </motion.aside>
    );
}
