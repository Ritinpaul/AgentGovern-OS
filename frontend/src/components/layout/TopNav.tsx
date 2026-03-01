import { useState, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LanguageIcon from "@mui/icons-material/Language";

export function TopNav() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 px-4 sm:gap-x-6 sm:px-6 lg:px-8 transition-all duration-300 ${scrolled
                ? "glass-panel border-b border-border shadow-md"
                : "bg-transparent"
                }`}
        >
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                {/* Command Search Bar - Visual Trigger */}
                <div className="relative flex flex-1 items-center">
                    <div className="w-full max-w-lg relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground group-hover:text-white transition-colors">
                            <SearchIcon sx={{ fontSize: 18 }} />
                        </div>
                        <button className="flex w-full items-center justify-between rounded-md border border-border bg-[#030304]/50 hover:bg-[#0a0b0f] px-3 py-1.5 pl-10 text-sm text-muted-foreground transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500/30">
                            <span>Search agents, policies, audits...</span>
                            <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </button>
                    </div>
                </div>

                {/* Right Nav Actions */}
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-success ring-4 ring-success/20 animate-pulse"></span>
                        <span className="text-xs font-medium text-success-foreground px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                            System Healthy
                        </span>
                    </div>

                    <div className="h-6 w-px bg-border max-sm:hidden" aria-hidden="true" />

                    <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md transition-colors relative">
                        <LanguageIcon sx={{ fontSize: 22 }} />
                    </button>

                    <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-md transition-colors relative">
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background"></span>
                        <NotificationsNoneIcon sx={{ fontSize: 22 }} />
                    </button>
                </div>
            </div>
        </header>
    );
}
