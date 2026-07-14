import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { motion, AnimatePresence } from "framer-motion";

export function MainLayout() {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
            {/* Sidebar - fixed left */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                <TopNav />

                {/* Page Content with subtle scroll fade */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 no-scrollbar scroll-smooth relative wave-bg">

                    {/* Subtle emerald background glow for EqtyLab feel */}
                    <div className="absolute top-0 left-1/4 w-[40rem] h-[30rem] bg-emerald-500/[0.07] blur-[120px] -z-10 rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 right-1/4 w-[30rem] h-[20rem] bg-emerald-600/[0.04] blur-[100px] -z-10 rounded-full pointer-events-none" />

                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="h-full max-w-7xl mx-auto"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
