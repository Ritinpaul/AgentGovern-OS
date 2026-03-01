import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import BoltIcon from "@mui/icons-material/Bolt";
import LoopIcon from "@mui/icons-material/Loop";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SendIcon from "@mui/icons-material/Send";
import TerminalIcon from "@mui/icons-material/Terminal";
import SeedlingIcon from "@mui/icons-material/Spa";

const SAP_ADAPTER_URL = "http://localhost:8002";
const GOVERNANCE_API_URL = "http://localhost:8000";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─── SAP Demo Events ──────────────────────────────────────────────────────────

const DEMO_EVENTS = [
    {
        label: "Finance: Purchase Order — ₹45,000",
        tag: "S/4HANA Finance",
        source: "S4H-PROD-001",
        payload: {
            specversion: "1.0",
            source: "/sap/s4hana-prod/purchaseorder",
            type: "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1",
            sap_source_system: "S4H-PROD-001",
            data: { PurchaseOrder: "PO-DEMO-001", Supplier: "VENDOR-TATA-001", NetAmount: 45000, DocumentCurrency: "INR" },
        },
    },
    {
        label: "Finance: Purchase Order — ₹8,50,000 (exceeds limit)",
        tag: "S/4HANA Finance",
        source: "S4H-PROD-001",
        payload: {
            specversion: "1.0",
            source: "/sap/s4hana-prod/purchaseorder",
            type: "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1",
            sap_source_system: "S4H-PROD-001",
            data: { PurchaseOrder: "PO-DEMO-002", Supplier: "VENDOR-INFOSYS-003", NetAmount: 850000, DocumentCurrency: "INR" },
        },
    },
    {
        label: "HR: Employee Onboarding — Ravi Shankar",
        tag: "SuccessFactors HR",
        source: "SF-PROD-001",
        payload: {
            specversion: "1.0",
            source: "/sap/successfactors/employee",
            type: "sap.s4.beh.employee.v1.Employee.Onboarded.v1",
            sap_source_system: "SF-PROD-001",
            data: { EmployeeId: "EMP-DEMO-001", FirstName: "Ravi", LastName: "Shankar", Department: "Engineering" },
        },
    },
    {
        label: "Sales: Order Created — ₹12,000",
        tag: "S/4HANA Sales",
        source: "S4H-PROD-001",
        payload: {
            specversion: "1.0",
            source: "/sap/s4hana-prod/salesorder",
            type: "sap.s4.beh.salesorder.v1.SalesOrder.Created.v1",
            sap_source_system: "S4H-PROD-001",
            data: { SalesOrder: "SO-DEMO-001", SoldToParty: "CUSTOMER-WIPRO-007", TotalNetAmount: 12000, TransactionCurrency: "INR" },
        },
    },
    {
        label: "IoT: Temperature Threshold Breach — 92.7°C",
        tag: "BTP Alert",
        source: "EDGE-CLUSTER-A",
        payload: {
            specversion: "1.0",
            source: "/sap/btp/alert-notification/iot-sensor-cluster-a",
            type: "com.sap.alert.notification.v1.AlertNotification.Triggered.v1",
            sap_source_system: "EDGE-CLUSTER-A",
            data: { thresholdValue: 92.7, alertType: "THRESHOLD_BREACH", severity: "HIGH" },
        },
    },
    {
        label: "BTP Workflow: CapEx Approval Started",
        tag: "BTP Workflow",
        source: "BTP-INTEGRATION-001",
        payload: {
            specversion: "1.0",
            source: "/sap/btp/workflow/process-integration",
            type: "com.sap.btp.workflow.v1.WorkflowInstance.Started.v1",
            sap_source_system: "BTP-INTEGRATION-001",
            data: { workflowDefinitionId: "CapEx-Approval-v2", status: "started", initiatedBy: "priya.nair@enterprise.com" },
        },
    },
    {
        label: "Finance: Payment Advice Posted — ₹45,000",
        tag: "S/4HANA Finance",
        source: "S4H-PROD-001",
        payload: {
            specversion: "1.0",
            source: "/sap/s4hana-prod/paymentadvice",
            type: "sap.s4.beh.paymentAdvice.v1.PaymentAdvice.Posted.v1",
            sap_source_system: "S4H-PROD-001",
            data: { PaymentAdvice: "PA-DEMO-001", Payee: "VENDOR-TATA-001", Amount: 45000, Currency: "INR" },
        },
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type EventStatus = "pending" | "running" | "done-approve" | "done-block" | "done-escalate" | "error";

interface EventResult {
    id: string;
    label: string;
    tag: string;
    source: string;
    status: EventStatus;
    verdict?: string;
    confidence?: number;
    reasoning?: string;
    violations?: string[];
    workflow_decision?: string;
    requires_human_review?: boolean;
    timestamp: string;
    sapEventType?: string;
    amount?: number;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function verdictStatus(verdict: string): EventStatus {
    const v = verdict?.toUpperCase();
    if (v === "APPROVE") return "done-approve";
    if (v === "BLOCK") return "done-block";
    return "done-escalate";
}

const TAG_COLORS: Record<string, string> = {
    // SAP
    "S/4HANA Finance": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "SuccessFactors HR": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "S/4HANA Sales": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "BTP Alert": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "BTP Workflow": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    // Catalog tags
    "SAP S/4HANA Finance": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "SAP SuccessFactors HR": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "SAP S/4HANA Sales": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "SAP BTP Workflow": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "SAP BTP Alert / IoT": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "SAP Legacy": "bg-red-900/20 text-red-400 border-red-700/20",
    // Universal
    "Stripe Payments": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "AWS Cloud": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "GitHub DevOps": "bg-slate-500/10 text-slate-300 border-slate-500/20",
    "Salesforce CRM": "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

function VerdictBadge({ status }: { status: EventStatus }) {
    if (status === "running")
        return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <LoopIcon sx={{ fontSize: 14 }} />
                </motion.span>
                Evaluating...
            </span>
        );
    if (status === "done-approve")
        return <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><CheckCircleIcon sx={{ fontSize: 14 }} /> APPROVE</span>;
    if (status === "done-block")
        return <span className="flex items-center gap-1 text-xs font-semibold text-red-400"><CancelIcon sx={{ fontSize: 14 }} /> BLOCK</span>;
    if (status === "done-escalate")
        return <span className="flex items-center gap-1 text-xs font-semibold text-amber-400"><WarningAmberIcon sx={{ fontSize: 14 }} /> ESCALATE</span>;
    if (status === "error")
        return <span className="text-xs text-red-500 font-semibold">ERROR</span>;
    return null;
}

// ─── Types for structured AI response ───────────────────────────────────────

interface EventAnalysis {
    event_number: number;
    verdict: string;
    what_happened: string;
    why_verdict: string;
    business_impact: string;
    next_steps: string;
}

// ─── Groq JSON Analysis Fetch ────────────────────────────────────────────────

async function fetchAnalysis(events: EventResult[]): Promise<EventAnalysis[]> {
    const eventSummaries = events.map((e, i) => ({
        event_number: i + 1,
        label: e.label,
        sap_module: e.tag,
        source: e.source,
        verdict: e.verdict || "BLOCK",
        sap_workflow: e.workflow_decision || "REJECT",
        confidence: e.confidence ? Math.round(e.confidence * 100) + "%" : "99%",
        reasoning: e.reasoning || "Zero-trust default: No registered agent found.",
        violations: e.violations?.join(", ") || "UNREGISTERED_AGENT",
        human_review: e.requires_human_review ? "Yes" : "No",
    }));

    const systemPrompt = `You are AgentGovern OS — an enterprise AI governance engine. Analyze SAP BTP governance decisions and return ONLY valid JSON. No prose, no markdown, no explanation outside the JSON.

Return a JSON object containing an "analysis" key with an array matching this schema:
{
  "analysis": [
    {
      "event_number": 1,
      "verdict": "BLOCK",
      "what_happened": "One sentence: what the SAP event attempted to do.",
      "why_verdict": "One to two sentences: exact reason the verdict was given.",
      "business_impact": "One sentence: enterprise risk/compliance implication.",
      "next_steps": "One sentence: recommended action."
    }
  ]
}

Be concise. Business language. No asterisks, no markdown formatting.`;

    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Analyze these ${events.length} governance decisions:\n${JSON.stringify(eventSummaries, null, 2)}` },
            ],
            stream: false,
            max_tokens: 2000,
            temperature: 0.3,
            response_format: { type: "json_object" },
        }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    if (parsed.analysis && Array.isArray(parsed.analysis)) {
        return parsed.analysis;
    }

    // Fallback if it somehow hallucinates a different array key
    const arr = Object.values(parsed).find((v) => Array.isArray(v));
    return (arr as EventAnalysis[]) || [];
}

// ─── Section Row ─────────────────────────────────────────────────────────────

function SectionRow({
    label,
    value,
    labelColor = "text-white/50",
}: {
    label: string;
    value: string;
    labelColor?: string;
}) {
    return (
        <div className="flex flex-col leading-relaxed">
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${labelColor} block mb-0.5`}>
                {label}
            </span>
            <p className="text-sm text-white/80">{value}</p>
        </div>
    );
}

// ─── Event Analysis Card ─────────────────────────────────────────────────────

function AnalysisCard({
    analysis,
    event,
    index,
}: {
    analysis: EventAnalysis;
    event: EventResult;
    index: number;
}) {
    const isBlock = event.status === "done-block";
    const isApprove = event.status === "done-approve";

    const borderColor = isApprove
        ? "border-emerald-500/25"
        : isBlock
            ? "border-red-500/25"
            : "border-amber-500/25";
    const bgColor = isApprove
        ? "bg-emerald-500/[0.04]"
        : isBlock
            ? "bg-red-500/[0.04]"
            : "bg-amber-500/[0.04]";
    const accentColor = isApprove ? "from-emerald-500" : isBlock ? "from-red-500" : "from-amber-400";
    const numColor = isApprove ? "bg-emerald-500/20 text-emerald-400" : isBlock ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
            className={`rounded-xl border ${borderColor} ${bgColor} overflow-hidden`}
        >
            {/* Card Header */}
            <div className={`flex items-center justify-between px-4 py-2.5 border-b ${borderColor} bg-gradient-to-r ${accentColor}/5 to-transparent`}>
                <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${numColor}`}>
                        #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${TAG_COLORS[event.tag] ?? "bg-white/5 text-white/50 border-white/10"}`}>
                        {event.tag}
                    </span>
                    <span className="text-sm font-medium text-white truncate max-w-[260px]">{event.label}</span>
                </div>
                <VerdictBadge status={event.status} />
            </div>

            {/* Card Body */}
            <div className="px-4 py-3 grid grid-cols-1 gap-3">
                <SectionRow
                    label="What Happened"
                    value={analysis.what_happened}
                    labelColor="text-white/40"
                />
                <div className="h-px bg-white/[0.05]" />
                <SectionRow
                    label="Why This Verdict"
                    value={analysis.why_verdict}
                    labelColor={isBlock ? "text-red-400/70" : isApprove ? "text-emerald-400/70" : "text-amber-400/70"}
                />
                <div className="h-px bg-white/[0.05]" />
                <SectionRow
                    label="Business Impact"
                    value={analysis.business_impact}
                    labelColor="text-blue-400/70"
                />
                <div className="h-px bg-white/[0.05]" />
                <SectionRow
                    label="Recommended Action"
                    value={analysis.next_steps}
                    labelColor="text-violet-400/70"
                />
            </div>
        </motion.div>
    );
}

// ─── Decisions Made Modal ─────────────────────────────────────────────────────

function DecisionsModal({
    events,
    onClose,
}: {
    events: EventResult[];
    onClose: () => void;
}) {
    const [analyses, setAnalyses] = useState<EventAnalysis[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        fetchAnalysis(events)
            .then((result) => {
                if (!cancelled) {
                    setAnalyses(result);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { cancelled = true; };
    }, []);

    const approved = events.filter((e) => e.status === "done-approve").length;
    const blocked = events.filter((e) => e.status === "done-block").length;
    const escalated = events.filter((e) => e.status === "done-escalate").length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <motion.div
                    initial={{ scale: 0.93, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.93, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                    style={{
                        background: "#0a0a0e",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 25px 60px rgba(0,0,0,0.7)",
                    }}
                >
                    {/* Purple glow top */}
                    <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 shrink-0"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                            >
                                <AutoAwesomeIcon sx={{ fontSize: 16 }} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-white tracking-tight"  >Governance Intelligence Report</h2>
                                <p className="text-[11px] text-white/40 mt-0.5">
                                    {loading ? "Generating AI analysis..." : `${events.length} decisions analysed`} · Groq Llama-3.3-70B
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>

                    {/* Stats bar */}
                    <div
                        className="grid grid-cols-4 shrink-0"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
                    >
                        {[
                            { label: "Total", value: events.length, color: "text-white", border: "" },
                            { label: "Approved", value: approved, color: "text-emerald-400", border: "border-l border-white/5" },
                            { label: "Blocked", value: blocked, color: "text-red-400", border: "border-l border-white/5" },
                            { label: "Escalated", value: escalated, color: "text-amber-400", border: "border-l border-white/5" },
                        ].map((s) => (
                            <div key={s.label} className={`flex flex-col items-center py-3 ${s.border}`}>
                                <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                                <span className="text-[10px] text-white/30 mt-0.5">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                        {error ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 flex flex-col gap-2">
                                <span className="text-sm font-semibold text-red-400">Failed to generate analysis</span>
                                <span className="text-xs text-red-400/60">{error}</span>
                            </div>
                        ) : loading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="rounded-xl border border-white/5 overflow-hidden">
                                        {/* skeleton header */}
                                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                                            <motion.div
                                                className="h-5 w-8 rounded-full bg-white/10"
                                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                            />
                                            <motion.div
                                                className="h-4 rounded bg-white/10"
                                                style={{ width: `${120 + i * 40}px` }}
                                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 + 0.1 }}
                                            />
                                        </div>
                                        {/* skeleton rows */}
                                        <div className="px-4 py-4 space-y-3">
                                            {[90, 75, 85, 65].map((w, j) => (
                                                <motion.div
                                                    key={j}
                                                    className="h-3 rounded bg-white/[0.06]"
                                                    style={{ width: `${w}%` }}
                                                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                                                    transition={{ repeat: Infinity, duration: 1.5, delay: (i + j) * 0.12 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex items-center justify-center gap-2 py-4 text-xs text-violet-400">
                                    <motion.span
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    >
                                        <HourglassTopIcon sx={{ fontSize: 14 }} />
                                    </motion.span>
                                    Analysing {events.length} governance decisions with Groq Llama-3.3-70B...
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {analyses.map((analysis, i) => (
                                    <AnalysisCard
                                        key={i}
                                        analysis={analysis}
                                        event={events[i] || events[0]}
                                        index={i}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        className="px-6 py-3 flex items-center justify-between shrink-0"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}
                    >
                        <p className="text-[10px] text-white/25"  >
                            Analysis by Groq Llama-3.3-70B · AgentGovern OS SENTINEL
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-lg text-sm text-white font-medium transition-all"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}



// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Demo Agent Seed Definitions ────────────────────────────────────────────
const SEED_AGENTS = [
    { agent_code: "FI-ANALYST-DEMO", display_name: "Finance Analyst Agent", role: "fi_analyst", crewai_role: "Senior Financial Analyst", crewai_backstory: "I analyze financial transactions and enforce spending policies.", tier: "T2", dna_profile: { specialization: "finance", risk_tolerance: "medium" }, platform_bindings: ["SAP_S4HANA", "SAP_BTP"] },
    { agent_code: "HR-BOT-DEMO", display_name: "HR Process Bot", role: "hr_bot", crewai_role: "Human Resources Automation Agent", crewai_backstory: "I manage employee onboarding, access provisioning, and termination workflows.", tier: "T3", dna_profile: { specialization: "hr", risk_tolerance: "low" }, platform_bindings: ["SAP_SUCCESSFACTORS", "SAP_BTP"] },
    { agent_code: "SALES-REP-DEMO", display_name: "Sales Automation Agent", role: "sales_rep", crewai_role: "Sales Process Automation Agent", crewai_backstory: "I handle sales order creation and discount approval workflows.", tier: "T3", dna_profile: { specialization: "sales", risk_tolerance: "medium" }, platform_bindings: ["SAP_S4HANA_SALES", "SAP_BTP"] },
    { agent_code: "EDGE-SENSOR-DEMO", display_name: "Edge IoT Sensor Agent", role: "edge_sensor", crewai_role: "Edge Gateway IoT monitoring agent", crewai_backstory: "I monitor IoT sensors at edge locations and detect threshold breaches.", tier: "T4", dna_profile: { specialization: "iot", risk_tolerance: "high" }, platform_bindings: ["SAP_BTP_ALERT", "EDGE_IOT"] },
    { agent_code: "BTP-AGENT-DEMO", display_name: "BTP Workflow Orchestrator", role: "btp_agent", crewai_role: "SAP BTP Workflow Service integration agent", crewai_backstory: "I orchestrate complex multi-step workflows in SAP BTP.", tier: "T2", dna_profile: { specialization: "workflow", risk_tolerance: "low" }, platform_bindings: ["SAP_BTP_WORKFLOW", "SAP_BTP"] },
];

export function Demo() {
    const [activeTab, setActiveTab] = useState<"demo" | "playground">("demo");
    const [results, setResults] = useState<EventResult[]>([]);
    const [running, setRunning] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const [stats, setStats] = useState({ approve: 0, block: 0, escalate: 0 });
    const [showModal, setShowModal] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [seedStatus, setSeedStatus] = useState<string | null>(null);
    // Playground state
    const [pgJson, setPgJson] = useState("");
    const [pgResult, setPgResult] = useState<EventResult | null>(null);
    const [pgLoading, setPgLoading] = useState(false);
    const [pgError, setPgError] = useState<string | null>(null);
    const stopRef = useRef(false);

    const doneResults = results.filter((r) => r.status !== "running" && r.status !== "pending");

    const updateStats = useCallback((verdict: string) => {
        const v = verdict?.toUpperCase();
        setStats((s) => ({
            approve: s.approve + (v === "APPROVE" ? 1 : 0),
            block: s.block + (v === "BLOCK" ? 1 : 0),
            escalate: s.escalate + (!["APPROVE", "BLOCK"].includes(v) ? 1 : 0),
        }));
    }, []);

    // ─── Seed Agents ─────────────────────────────────────────────────────────
    const seedAgents = useCallback(async () => {
        setSeeding(true);
        setSeedStatus("Seeding agents & policies...");
        let ok = 0;
        for (const agent of SEED_AGENTS) {
            try {
                const r = await fetch(`${GOVERNANCE_API_URL}/api/v1/agents/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(agent),
                });
                if (r.ok || r.status === 409) ok++;
            } catch { /* ignore */ }
        }
        setSeedStatus(`✓ ${ok}/${SEED_AGENTS.length} agents ready. APPROVE verdicts unlocked.`);
        setSeeding(false);
    }, []);

    // ─── Playground Evaluate ──────────────────────────────────────────────────
    const evaluatePlayground = useCallback(async () => {
        setPgError(null);
        setPgResult(null);
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(pgJson);
        } catch {
            setPgError("Invalid JSON — please check your payload.");
            return;
        }
        // Accept both the catalog wrapper format {payload: {...}} and raw CloudEvent
        const payload = (parsed.payload as Record<string, unknown>) ?? parsed;
        const label = (parsed.description as string) ?? (payload.type as string) ?? "Custom Event";
        const tag = (parsed.tag as string) ?? "Custom";
        const eventId = `pg-${Date.now()}`;
        setPgLoading(true);
        try {
            const res = await fetch(`${SAP_ADAPTER_URL}/sap/governance/evaluate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, id: eventId }),
            });
            const data = await res.json();
            const resultStatus = verdictStatus(data.verdict);
            updateStats(data.verdict);
            const newResult: EventResult = {
                id: eventId,
                label,
                tag,
                source: (payload.sap_source_system as string) ?? "custom",
                status: resultStatus,
                verdict: data.verdict,
                confidence: data.confidence,
                reasoning: data.reasoning,
                violations: data.policy_violations,
                workflow_decision: data.workflow_decision,
                requires_human_review: data.requires_human_review,
                timestamp: new Date().toLocaleTimeString(),
            };
            setPgResult(newResult);
            // Also append to the shared results list so Decisions Modal can pick it up
            setResults((prev) => [...prev, newResult]);
        } catch (e) {
            setPgError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setPgLoading(false);
        }
    }, [pgJson, updateStats]);

    const fireEvent = useCallback(
        async (eventDef: (typeof DEMO_EVENTS)[0], eventId: string) => {
            const payload = { ...eventDef.payload, id: eventId };

            setResults((prev) => [
                ...prev,
                {
                    id: eventId,
                    label: eventDef.label,
                    tag: eventDef.tag,
                    source: eventDef.source,
                    status: "running",
                    timestamp: new Date().toLocaleTimeString(),
                },
            ]);

            try {
                const res = await fetch(`${SAP_ADAPTER_URL}/sap/governance/evaluate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                const resultStatus = verdictStatus(data.verdict);
                updateStats(data.verdict);
                setResults((prev) =>
                    prev.map((r) =>
                        r.id === eventId
                            ? {
                                ...r,
                                status: resultStatus,
                                verdict: data.verdict,
                                confidence: data.confidence,
                                reasoning: data.reasoning,
                                violations: data.policy_violations,
                                workflow_decision: data.workflow_decision,
                                requires_human_review: data.requires_human_review,
                            }
                            : r
                    )
                );
            } catch {
                setResults((prev) =>
                    prev.map((r) => (r.id === eventId ? { ...r, status: "error" } : r))
                );
            }
        },
        [updateStats]
    );

    const runDemo = useCallback(async () => {
        stopRef.current = false;
        setRunning(true);
        setResults([]);
        setStats({ approve: 0, block: 0, escalate: 0 });

        const eventsToRun = liveMode
            ? Array.from({ length: 100 }, (_, i) => DEMO_EVENTS[i % DEMO_EVENTS.length])
            : DEMO_EVENTS;

        for (const eventDef of eventsToRun) {
            if (stopRef.current) break;
            const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            await fireEvent(eventDef, eventId);
            if (stopRef.current) break;
            await new Promise((r) => setTimeout(r, 800));
        }
        setRunning(false);
    }, [liveMode, fireEvent]);

    const stopDemo = useCallback(() => {
        stopRef.current = true;
        setRunning(false);
    }, []);

    const resetDemo = useCallback(() => {
        stopRef.current = true;
        setRunning(false);
        setResults([]);
        setStats({ approve: 0, block: 0, escalate: 0 });
    }, []);

    const total = results.filter((r) => r.status !== "running").length;

    return (
        <>
            {/* Decisions Modal */}
            {showModal && doneResults.length > 0 && (
                <DecisionsModal events={doneResults} onClose={() => setShowModal(false)} />
            )}

            <div className="flex flex-col gap-6 h-full">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between"
                >
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-white">Universal Governance Demo</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Fire enterprise events from any system — SAP, Stripe, AWS, GitHub, Salesforce — and watch AI agents govern them in real-time.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <button
                            onClick={() => !running && setLiveMode((v) => !v)}
                            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${liveMode
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                : "border-border text-muted-foreground hover:text-white"
                                } ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                            {liveMode && (
                                <motion.span
                                    className="absolute left-2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                />
                            )}
                            <span className={liveMode ? "ml-3" : ""}>{liveMode ? "Live Mode ON" : "Live Mode"}</span>
                        </button>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-4 gap-3"
                >
                    {[
                        { label: "Events Fired", value: total, color: "text-white" },
                        { label: "Approved", value: stats.approve, color: "text-emerald-400" },
                        { label: "Blocked", value: stats.block, color: "text-red-400" },
                        { label: "Escalated", value: stats.escalate, color: "text-amber-400" },
                    ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-border bg-card/50 backdrop-blur-sm px-4 py-3">
                            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Tab Selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
                    {(["demo", "playground"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? "bg-white text-black"
                                : "text-muted-foreground hover:text-white"
                                }`}
                        >
                            {tab === "demo" ? "Quick Demo (7 events)" : "JSON Playground"}
                        </button>
                    ))}
                </div>

                {/* Controls — Demo Tab */}
                {activeTab === "demo" && <div className="flex items-center gap-3 flex-wrap">
                    {!running ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={runDemo}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 shadow-lg shadow-white/10"
                        >
                            <PlayArrowIcon sx={{ fontSize: 18 }} />
                            Run Demo
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={stopDemo}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/90 text-white font-semibold text-sm transition-all hover:bg-red-500"
                        >
                            <StopIcon sx={{ fontSize: 18 }} />
                            Stop
                        </motion.button>
                    )}

                    <button
                        onClick={resetDemo}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:border-white/30 text-sm font-medium transition-all"
                    >
                        <ReplayIcon sx={{ fontSize: 16 }} />
                        Reset
                    </button>

                    {/* Decisions Made Button — only shown once events are done */}
                    <AnimatePresence>
                        {doneResults.length > 0 && !running && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9, x: -8 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all relative overflow-hidden"
                                style={{
                                    background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.15) 100%)",
                                    borderColor: "rgba(139,92,246,0.4)",
                                    color: "#c4b5fd",
                                    boxShadow: "0 0 20px rgba(139,92,246,0.15)",
                                }}
                            >
                                {/* Shimmer */}
                                <motion.div
                                    className="absolute inset-0 opacity-20"
                                    style={{
                                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                                    }}
                                    animate={{ x: ["-100%", "200%"] }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                                />
                                <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                                <span>Decisions Made ({doneResults.length})</span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {running && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-xs text-muted-foreground ml-1"
                        >
                            <motion.div
                                className="w-2 h-2 rounded-full bg-emerald-400"
                                animate={{ opacity: [1, 0.2, 1] }}
                                transition={{ repeat: Infinity, duration: 1.2 }}
                            />
                            Processing events through SENTINEL...
                        </motion.div>
                    )}
                </div>}

                {/* JSON Playground Tab */}
                {activeTab === "playground" && (
                    <div className="flex flex-col gap-4">
                        {/* Seed Banner */}
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 flex items-start gap-3">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-300">Seed agents first for APPROVE verdicts</p>
                                <p className="text-xs text-amber-300/60 mt-0.5">Without seeding, all events return BLOCK (zero-trust default). Seed once per session.</p>
                                {seedStatus && <p className="text-xs text-emerald-400 mt-1">{seedStatus}</p>}
                            </div>
                            <button
                                onClick={seedAgents}
                                disabled={seeding}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50 shrink-0"
                            >
                                {seeding ? <LoopIcon sx={{ fontSize: 14 }} className="animate-spin" /> : <SeedlingIcon sx={{ fontSize: 14 }} />}
                                {seeding ? "Seeding..." : "Seed Agents & Policies"}
                            </button>
                        </div>

                        {/* JSON Input */}
                        <div className="rounded-xl border border-border bg-[#08080a] overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-white/[0.02]">
                                <TerminalIcon sx={{ fontSize: 14 }} className="text-muted-foreground" />
                                <span className="text-xs font-mono text-muted-foreground">Paste a JSON event from the 50-event catalog</span>
                                <a
                                    href="/universal_50_events_catalog.json"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-auto text-[11px] text-violet-400 hover:text-violet-300 underline underline-offset-2"
                                >
                                    View all 50 events →
                                </a>
                            </div>
                            <textarea
                                value={pgJson}
                                onChange={(e) => setPgJson(e.target.value)}
                                placeholder={'{ "id": 14, "description": "Stripe: Large Customer Refund", "tag": "Stripe Payments", "payload": { "specversion": "1.0", "source": "/stripe/webhooks/refund", "type": "stripe.charge.refunded.v1", "sap_source_system": "STRIPE-PROD", "data": { "amount": 450000 } } }'}
                                rows={8}
                                spellCheck={false}
                                className="w-full bg-transparent font-mono text-xs text-white/70 p-4 resize-none outline-none placeholder:text-white/15 leading-relaxed"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={evaluatePlayground}
                                disabled={pgLoading || !pgJson.trim()}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm transition-all hover:bg-white/90 shadow-lg shadow-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {pgLoading ? <LoopIcon sx={{ fontSize: 18 }} className="animate-spin" /> : <SendIcon sx={{ fontSize: 18 }} />}
                                {pgLoading ? "Evaluating..." : "Evaluate Event"}
                            </motion.button>
                            {pgResult && (
                                <button onClick={() => { setPgResult(null); setPgError(null); }} className="text-xs text-muted-foreground hover:text-white transition-all">
                                    Clear result
                                </button>
                            )}
                        </div>

                        {/* Error */}
                        {pgError && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.05] px-4 py-3 text-sm text-red-400">
                                {pgError}
                            </div>
                        )}

                        {/* Result Card */}
                        <AnimatePresence>
                            {pgResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={`rounded-xl border px-5 py-4 ${pgResult.status === "done-approve"
                                        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                                        : pgResult.status === "done-block"
                                            ? "border-red-500/25 bg-red-500/[0.06]"
                                            : "border-amber-500/25 bg-amber-500/[0.06]"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{pgResult.label}</p>
                                            <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${TAG_COLORS[pgResult.tag] ?? "bg-white/5 text-white/50 border-white/10"
                                                }`}>{pgResult.tag}</span>
                                        </div>
                                        <VerdictBadge status={pgResult.status} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        {pgResult.reasoning && (
                                            <div>
                                                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block mb-0.5">Reasoning</span>
                                                <p className="text-white/70">{pgResult.reasoning}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-6 mt-1">
                                            {pgResult.confidence !== undefined && (
                                                <div>
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block mb-0.5">Confidence</span>
                                                    <p className="text-white/80 font-mono">{Math.round(pgResult.confidence * 100)}%</p>
                                                </div>
                                            )}
                                            {pgResult.violations && pgResult.violations.length > 0 && (
                                                <div>
                                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40 block mb-0.5">Policy Violations</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {pgResult.violations.map((v) => (
                                                            <span key={v} className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">{v}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                                            <button
                                                onClick={() => setShowModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all hover:bg-white/5 opacity-80 hover:opacity-100"
                                                style={{
                                                    borderColor: "rgba(139,92,246,0.3)",
                                                    color: "#c4b5fd",
                                                }}
                                            >
                                                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                                                Explain Decision
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Event Feed — visible on both tabs */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar rounded-xl border border-border bg-[#08080a]">
                    {results.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground py-20">
                            <BoltIcon sx={{ fontSize: 40 }} className="opacity-20" />
                            <div className="text-center">
                                <p className="font-medium text-white/40">No events yet</p>
                                <p className="text-xs mt-1 opacity-60">{activeTab === "demo" ? 'Click "Run Demo" to fire 7 enterprise events' : 'Paste a JSON event above and click Evaluate'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 flex flex-col gap-2">
                            <AnimatePresence>
                                {results.map((result) => (
                                    <motion.div
                                        key={result.id}
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`rounded-lg border px-4 py-3 transition-all duration-300 ${result.status === "running"
                                            ? "border-white/10 bg-white/[0.03]"
                                            : result.status === "done-approve"
                                                ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                                                : result.status === "done-block"
                                                    ? "border-red-500/20 bg-red-500/[0.04]"
                                                    : result.status === "done-escalate"
                                                        ? "border-amber-500/20 bg-amber-500/[0.04]"
                                                        : "border-red-900/30 bg-red-900/5"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-white truncate">{result.label}</span>
                                                    <span
                                                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${TAG_COLORS[result.tag] ?? "bg-white/5 text-white/50 border-white/10"
                                                            }`}
                                                    >
                                                        {result.tag}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                    <span>{result.source}</span>
                                                    <span>·</span>
                                                    <span>{result.timestamp}</span>
                                                    {result.requires_human_review && (
                                                        <>
                                                            <span>·</span>
                                                            <span className="text-amber-400">Human review required</span>
                                                        </>
                                                    )}
                                                </div>
                                                {result.reasoning && result.status !== "running" && (
                                                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{result.reasoning}</p>
                                                )}
                                                {result.violations && result.violations.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {result.violations.map((v) => (
                                                            <span key={v} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                                {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <VerdictBadge status={result.status} />
                                                {result.confidence !== undefined && result.status !== "running" && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {Math.round(result.confidence * 100)}% confidence
                                                    </span>
                                                )}
                                                {result.workflow_decision && (
                                                    <span className="text-[10px] font-mono text-white/30">SAP: {result.workflow_decision}</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
