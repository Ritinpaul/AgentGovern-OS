import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SecurityIcon from "@mui/icons-material/Security";
import BoltIcon from "@mui/icons-material/Bolt";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import DevicesOtherIcon from "@mui/icons-material/DevicesOther";
import TimelineIcon from "@mui/icons-material/Timeline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TerminalIcon from "@mui/icons-material/Terminal";
import PolicyIcon from "@mui/icons-material/Policy";

/* ─── Framer Motion Variants ──────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    }),
};

const fadeDown = {
    hidden: { opacity: 0, y: -20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
};

/* ─── Circuit Line SVG Component ──────────── */
const CircuitLines = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-left circuit cluster */}
        <motion.svg
            className="absolute -top-10 -left-20 w-[500px] h-[400px] opacity-[0.15]"
            viewBox="0 0 500 400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
        >
            <motion.path
                d="M 50 200 L 150 200 L 180 170 L 280 170"
                stroke="rgba(34,197,94,0.6)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
            />
            <motion.path
                d="M 80 250 L 200 250 L 230 220 L 320 220"
                stroke="rgba(34,197,94,0.4)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.0, ease: "easeInOut" }}
            />
            <motion.circle cx="280" cy="170" r="3" fill="rgba(34,197,94,0.6)"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.0 }} />
            <motion.circle cx="320" cy="220" r="3" fill="rgba(34,197,94,0.4)"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2 }} />
            <motion.circle cx="150" cy="200" r="2" fill="rgba(34,197,94,0.5)"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.8 }} />
        </motion.svg>

        {/* Top-right circuit cluster */}
        <motion.svg
            className="absolute -top-10 -right-20 w-[500px] h-[400px] opacity-[0.15]"
            viewBox="0 0 500 400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.7 }}
        >
            <motion.path
                d="M 450 180 L 350 180 L 320 210 L 220 210"
                stroke="rgba(34,197,94,0.6)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.0, ease: "easeInOut" }}
            />
            <motion.path
                d="M 420 240 L 300 240 L 270 270 L 180 270"
                stroke="rgba(34,197,94,0.4)"
                strokeWidth="1"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 1.2, ease: "easeInOut" }}
            />
            <motion.circle cx="220" cy="210" r="3" fill="rgba(34,197,94,0.6)"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.2 }} />
            <motion.circle cx="180" cy="270" r="3" fill="rgba(34,197,94,0.4)"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 2.4 }} />
        </motion.svg>
    </div>
);

/* ─── Floating Node Chips ─────────────────── */
const FloatingChip = ({
    icon,
    x,
    y,
    delay,
    size = 40,
}: {
    icon: React.ReactNode;
    x: string;
    y: string;
    delay: number;
    size?: number;
}) => (
    <motion.div
        className="absolute z-10"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
        <motion.div
            className="rounded-xl border border-emerald-500/20 bg-[#0a0b0f]/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
            style={{ width: size, height: size }}
            animate={{ y: [0, -8, 0] }}
            transition={{
                duration: 4 + delay,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        >
            {icon}
        </motion.div>
    </motion.div>
);

/* ─── Integration Badges ──────────────────── */
const INTEGRATIONS = [
    { name: "SAP S/4HANA", sub: "ERP Core" },
    { name: "AWS", sub: "Cloud Provider" },
    { name: "Stripe", sub: "Payments" },
    { name: "GitHub", sub: "DevOps" },
    { name: "Salesforce", sub: "CRM" },
];

/* ─── Stats Data ──────────────────────────── */
const STATS = [
    { value: "142", label: "Edge Gateways", suffix: "+" },
    { value: "3,940", label: "Policy Blocks", suffix: "" },
    { value: "99.97", label: "Uptime", suffix: "%" },
    { value: "<50", label: "Latency", suffix: "ms" },
];

/* ─── Navigation Links ───────────────────── */
const NAV_LINKS = ["Overview", "Technology", "Demo", "Resources"];

/* ════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════ */
export const LandingPage = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.25], [1, 0.95]);

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-[#030304] text-white overflow-x-hidden relative"
        >
            {/* ─── Multi-layer Wave Background ─── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Layer 1: Top emerald glow */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[50vh]"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                    }}
                />
                {/* Layer 2: Animated wave 1 */}
                <motion.div
                    className="absolute bottom-0 left-0 w-full h-[45vh]"
                    animate={{ y: [0, -12, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                >
                    <svg
                        viewBox="0 0 1440 320"
                        className="w-full h-full"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="waveGrad1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(16,185,129,0.06)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,96L48,112C96,128,192,160,288,176C384,192,480,192,576,170.7C672,149,768,107,864,112C960,117,1056,171,1152,181.3C1248,192,1344,160,1392,144L1440,128L1440,320L0,320Z"
                            fill="url(#waveGrad1)"
                        />
                    </svg>
                </motion.div>
                {/* Layer 3: Animated wave 2 (opposite phase) */}
                <motion.div
                    className="absolute bottom-0 left-0 w-full h-[40vh]"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                >
                    <svg
                        viewBox="0 0 1440 320"
                        className="w-full h-full"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            <linearGradient id="waveGrad2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(34,197,94,0.04)" />
                                <stop offset="100%" stopColor="transparent" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,181.3C672,192,768,160,864,149.3C960,139,1056,149,1152,144C1248,139,1344,117,1392,106.7L1440,96L1440,320L0,320Z"
                            fill="url(#waveGrad2)"
                        />
                    </svg>
                </motion.div>
                {/* Layer 4: Horizontal flowing line */}
                <div className="absolute top-[55%] left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
                <div className="absolute top-[62%] left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent" />
            </div>

            {/* ─── Navigation Bar ─── */}
            <motion.nav
                className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
                variants={fadeDown}
                initial="hidden"
                animate="visible"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                            <SecurityIcon sx={{ fontSize: 18, color: "#fff" }} />
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            <span className="text-white">AgentGovern</span>
                            <span className="text-emerald-400 ml-0.5">OS</span>
                        </span>
                    </div>

                    {/* Center nav links */}
                    <div className="hidden md:flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md">
                        {NAV_LINKS.map((link) => (
                            <button
                                key={link}
                                className="px-4 py-1.5 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                                {link}
                            </button>
                        ))}
                    </div>

                    {/* Right buttons */}
                    <div className="flex items-center gap-3">
                        <button className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.02]">
                            Log In
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate("/dashboard")}
                            className="text-sm font-semibold text-white px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-[0_0_20px_-4px_rgba(34,197,94,0.4)]"
                        >
                            Get Started
                        </motion.button>
                    </div>
                </div>
            </motion.nav>

            {/* ─── Hero Section ─── */}
            <motion.section
                className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-20"
                style={{ opacity: heroOpacity, scale: heroScale }}
            >
                <CircuitLines />

                {/* Floating chip nodes */}
                <FloatingChip
                    icon={<PolicyIcon sx={{ fontSize: 16, color: "#6ee7b7" }} />}
                    x="15%" y="25%" delay={0.8} size={42}
                />
                <FloatingChip
                    icon={<BoltIcon sx={{ fontSize: 14, color: "#6ee7b7" }} />}
                    x="82%" y="20%" delay={1.0} size={36}
                />
                <FloatingChip
                    icon={<DevicesOtherIcon sx={{ fontSize: 16, color: "#6ee7b7" }} />}
                    x="10%" y="55%" delay={1.2} size={38}
                />
                <FloatingChip
                    icon={<TimelineIcon sx={{ fontSize: 14, color: "#6ee7b7" }} />}
                    x="88%" y="50%" delay={1.4} size={36}
                />
                <FloatingChip
                    icon={<TerminalIcon sx={{ fontSize: 14, color: "#6ee7b7" }} />}
                    x="22%" y="70%" delay={1.6} size={34}
                />
                <FloatingChip
                    icon={<VerifiedUserIcon sx={{ fontSize: 14, color: "#6ee7b7" }} />}
                    x="78%" y="68%" delay={1.8} size={34}
                />

                {/* Central chip graphic */}
                <motion.div
                    className="relative mb-10"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div
                        className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#0d1a12] to-[#071a0e] border border-emerald-500/30 flex items-center justify-center shadow-[0_0_60px_-10px_rgba(34,197,94,0.3)]"
                        animate={{
                            boxShadow: [
                                "0 0 60px -10px rgba(34,197,94,0.3)",
                                "0 0 80px -10px rgba(34,197,94,0.45)",
                                "0 0 60px -10px rgba(34,197,94,0.3)",
                            ]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Chip grid dots */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {Array.from({ length: 16 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.2, 0.6, 0.2] }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.08,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                />
                            ))}
                        </div>
                    </motion.div>
                    {/* Vertical line from chip to heading */}
                    <motion.div
                        className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-px h-10 bg-gradient-to-b from-emerald-500/40 to-transparent"
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: 1, duration: 0.6 }}
                        style={{ transformOrigin: "top" }}
                    />
                </motion.div>

                {/* Headline */}
                <motion.div
                    className="text-center max-w-4xl"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.h1
                        className="text-6xl md:text-8xl font-bold tracking-tight leading-[0.95]"
                        variants={fadeUp}
                        custom={0}
                    >
                        <span className="text-white">Govern AI.</span>
                        <br />
                        <span className="bg-gradient-to-b from-white to-emerald-400/70 bg-clip-text text-transparent">
                            Earn Trust.
                        </span>
                    </motion.h1>

                    <motion.p
                        className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
                        variants={fadeUp}
                        custom={1}
                    >
                        Introducing AgentGovern OS — the enterprise platform for
                        AI agent governance, policy enforcement, and verifiable trust
                        across Cloud, Edge, and Client nodes.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div className="mt-10" variants={fadeUp} custom={2}>
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate("/dashboard")}
                            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-all shadow-[0_0_30px_-5px_rgba(34,197,94,0.5)] hover:shadow-[0_0_40px_-5px_rgba(34,197,94,0.65)]"
                        >
                            <DashboardIcon sx={{ fontSize: 20 }} />
                            Launch Dashboard
                            <ArrowForwardIcon
                                sx={{ fontSize: 16 }}
                                className="transition-transform group-hover:translate-x-0.5"
                            />
                        </motion.button>
                    </motion.div>
                </motion.div>

                {/* Integration badges */}
                <motion.div
                    className="mt-24 text-center"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.p
                        className="text-xs uppercase tracking-[0.2em] text-white/30 mb-5 font-medium"
                        variants={fadeUp}
                        custom={3}
                    >
                        Enterprise Integrations
                    </motion.p>
                    <motion.div
                        className="flex flex-wrap justify-center gap-3"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        {INTEGRATIONS.map((item, i) => (
                            <motion.div
                                key={item.name}
                                variants={fadeUp}
                                custom={4 + i}
                                className="group flex flex-col items-center gap-1 px-6 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all cursor-default min-w-[120px]"
                            >
                                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                                    {item.name}
                                </span>
                                <span className="text-[11px] text-white/30">{item.sub}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </motion.section>

            {/* ─── Stats Section ─── */}
            <motion.section
                className="relative z-10 py-32 px-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={staggerContainer}
            >
                <div className="max-w-5xl mx-auto">
                    <motion.h2
                        className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-4"
                        variants={fadeUp}
                        custom={0}
                    >
                        Built for Enterprise Scale
                    </motion.h2>
                    <motion.p
                        className="text-center text-white/40 mb-16 max-w-lg mx-auto"
                        variants={fadeUp}
                        custom={1}
                    >
                        Real-time governance across every node, every agent, every
                        decision.
                    </motion.p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {STATS.map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                variants={fadeUp}
                                custom={2 + i}
                                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
                            >
                                <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                                    {stat.value}
                                    <span className="text-emerald-400">{stat.suffix}</span>
                                </div>
                                <div className="mt-2 text-sm text-white/40 group-hover:text-white/60 transition-colors">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* ─── Feature Cards Section ─── */}
            <motion.section
                className="relative z-10 py-20 px-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={staggerContainer}
            >
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
                    {[
                        {
                            icon: <PolicyIcon sx={{ fontSize: 24, color: "#6ee7b7" }} />,
                            title: "Policy Enforcer",
                            desc: "OPA/Rego-based rule engine with real-time evaluation across distributed environments.",
                        },
                        {
                            icon: <BoltIcon sx={{ fontSize: 24, color: "#6ee7b7" }} />,
                            title: "Edge Gateways",
                            desc: "Deploy governance at the edge with sub-50ms latency decision making.",
                        },
                        {
                            icon: <VerifiedUserIcon sx={{ fontSize: 24, color: "#6ee7b7" }} />,
                            title: "Audit Ledger",
                            desc: "Immutable cryptographic audit trail for every AI agent decision.",
                        },
                    ].map((card, i) => (
                        <motion.div
                            key={card.title}
                            variants={fadeUp}
                            custom={i}
                            className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 hover:border-emerald-500/20 hover:bg-emerald-500/[0.03] transition-all"
                        >
                            {/* Top glow line on hover */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 group-hover:via-emerald-500/40 to-transparent transition-all duration-500" />
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                                {card.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                                {card.title}
                            </h3>
                            <p className="text-sm text-white/40 leading-relaxed">
                                {card.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* ─── Bottom CTA ─── */}
            <motion.section
                className="relative z-10 py-24 px-6 text-center"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <motion.h2
                    className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
                    variants={fadeUp}
                    custom={0}
                >
                    Ready to Govern Your AI Fleet?
                </motion.h2>
                <motion.p
                    className="text-white/40 mb-8 max-w-md mx-auto"
                    variants={fadeUp}
                    custom={1}
                >
                    Get started with AgentGovern OS and take control of every AI
                    agent in your enterprise.
                </motion.p>
                <motion.div variants={fadeUp} custom={2}>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/dashboard")}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-[0_0_30px_-5px_rgba(34,197,94,0.5)]"
                    >
                        <DashboardIcon sx={{ fontSize: 20 }} />
                        Launch Dashboard
                    </motion.button>
                </motion.div>
            </motion.section>

            {/* ─── Footer ─── */}
            <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                            <SecurityIcon sx={{ fontSize: 14, color: "#fff" }} />
                        </div>
                        <span className="text-sm font-semibold text-white/60">
                            AgentGovern OS
                        </span>
                    </div>
                    <p className="text-xs text-white/30">
                        © 2025 AgentGovern OS. Enterprise AI Governance Platform.
                    </p>
                    <div className="flex items-center gap-6">
                        {["Privacy", "Terms", "Docs"].map((link) => (
                            <button
                                key={link}
                                className="text-xs text-white/30 hover:text-white/60 transition-colors"
                            >
                                {link}
                            </button>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};
