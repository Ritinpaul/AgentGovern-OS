"""
AgentGovern OS — CrewAI Tool Registry

All 13 custom tools available to the agent crews.
Import and use these in agent definitions.
"""

from .document_search import DocumentSearchTool
from .credit_api import CreditScoringTool
from .payment_history import PaymentHistoryTool
from .fraud_detector import FraudDetectorTool
from .settlement_calculator import SettlementCalculatorTool
from .policy_checker import PolicyCheckerTool
from .trust_scorer import TrustScorerTool
from .audit_logger import AuditLoggerTool
from .human_escalator import HumanEscalatorTool
from .prophecy_simulator import ProphecySimulatorTool
from .sap_connector import SAPConnectorTool
from .dna_inspector import DNAInspectorTool
from .cache_manager import CacheManagerTool

__all__ = [
    "DocumentSearchTool",
    "CreditScoringTool",
    "PaymentHistoryTool",
    "FraudDetectorTool",
    "SettlementCalculatorTool",
    "PolicyCheckerTool",
    "TrustScorerTool",
    "AuditLoggerTool",
    "HumanEscalatorTool",
    "ProphecySimulatorTool",
    "SAPConnectorTool",
    "DNAInspectorTool",
    "CacheManagerTool",
]
