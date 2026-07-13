"""Pydantic models for events, decisions, and decision history.

All data flowing through the system is validated against these schemas,
ensuring the AI engine's output is always structurally correct.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """Represents a topological location in the stadium exterior/interior graph."""

    node_id: str
    node_type: str = Field(
        description="Transit | Security | Plaza | Gate | Concourse | Stand"
    )
    connected_to: List[str] = Field(default_factory=list)
    capacity: int
    current_occupancy: int = 0


class EmergencyState(BaseModel):
    """Server-authoritative state object governing the emergency control plane."""

    current_level: int = Field(
        0,
        description="0: Nominal, 1: Freeze AI, 2: Lock Sector, 3: Full Emergency, 4: Evacuate",
    )
    current_commander: Optional[str] = None
    active_incident: Optional[str] = None
    activated_at: Optional[str] = None
    recovery_eta: Optional[str] = None
    affected_zones: List[str] = Field(default_factory=list)


class AuditLogRecord(BaseModel):
    """Immutable ledger entry for operational actions."""

    event_id: str
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    operator_id: str
    action: str
    previous_state: int
    new_state: int
    reason: str


class ScramRequest(BaseModel):
    """Payload for initiating a SCRAM."""

    level: int = Field(..., ge=1, le=4)
    operator_id: str = Field(..., description="ID of the operator initiating SCRAM")
    override_code: Optional[str] = Field(
        default=None, description="Manager override code required for Level 3+"
    )


class DispatchRequest(BaseModel):
    """Payload for manual dispatch, evaluated against minimum reserve limits."""

    zone: str
    roles: List[str]
    remaining_reserve: int = Field(
        ..., description="The calculated reserve left after this dispatch"
    )


class CrowdEvent(BaseModel):
    """A crowd-related event detected in a stadium zone."""

    event_id: str = Field(..., description="Unique event identifier")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 timestamp of the event",
    )
    zone_id: str = Field(..., description="Zone where the event occurred (A-D)")
    event_type: str = Field(
        ...,
        description="Type: crowd_surge | medical_incident | gate_congestion | weather_alert | match_event | vip_movement",
    )
    density_percent: float = Field(
        ..., ge=0, le=100, description="Current zone density as a percentage"
    )
    trend: str = Field(..., description="Density trend: rising | stable | falling")
    details: str = Field(..., description="Human-readable event description")
    severity: str = Field(
        ..., description="Severity level: low | medium | high | critical"
    )
    predicted_density_percent: Optional[float] = Field(
        default=None, description="Forecasted peak density"
    )
    time_to_critical_minutes: Optional[int] = Field(
        default=None, description="Minutes until critical density is reached"
    )
    queue_growth_rate: Optional[str] = Field(
        default=None, description="Rate of queue growth (e.g., '+42/min')"
    )


class StaffAllocation(BaseModel):
    """Describes a staff movement decision."""

    role: str = Field(..., description="Staff role: volunteer | security | medical")
    from_zone: str = Field(..., description="Zone to pull staff from")
    to_zone: str = Field(..., description="Zone to deploy staff to")
    count: int = Field(..., ge=1, description="Number of staff to move")
    eta_minutes: int = Field(..., ge=0, description="Estimated transit time in minutes")


class EngineDecision(BaseModel):
    """Structured output from the AI Decision Engine."""

    event_id: str = Field(..., description="ID of the triggering event")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 timestamp of the decision",
    )
    risk_level: str = Field(
        ..., description="Overall risk: low | moderate | high | critical"
    )
    affected_zones: list[str] = Field(
        ..., description="List of zone IDs affected by this decision"
    )
    confidence_score: float = Field(
        ..., ge=0, le=100, description="Confidence in this decision percentage (0-100)"
    )
    decision_provenance: dict[str, list[str]] = Field(
        default_factory=dict,
        description="Tracks used data sources and missing feeds. e.g. {'based_on': ['CCTV'], 'missing': ['Transit']}",
    )
    alternatives: Optional[list[str]] = Field(
        None, description="Alternative actions that were considered but rejected"
    )
    recommended_action: str = Field(
        ..., description="Concise action recommendation for ops staff"
    )
    reasoning: str = Field(
        ...,
        description="1-2 sentence explanation of WHY this action was chosen",
    )
    mission_objective: str = Field(
        ...,
        description="The primary operational objective this decision supports (e.g. 'Preserve life', 'Prevent crowd reversal')",
    )
    expected_outcome: str = Field(
        ...,
        description="The predicted state after execution (e.g. 'Density drops below 6/m²')",
    )
    predicted_effects: dict[str, str] = Field(
        default_factory=dict,
        description="Digital Twin simulation forecasting side effects on other areas (e.g. {'South Ramp': '+28%', 'Transit Delay': '+5 min'})",
    )
    predicted_queue_reduction: Optional[str] = Field(
        default=None, description="Expected reduction in bottleneck/queue (e.g. '18%')"
    )
    staff_allocation: list[StaffAllocation] = Field(
        default_factory=list,
        description="Staff movements, if any",
    )
    alert_text_en: str = Field(
        ..., description="Alert message in English for broadcast"
    )
    alert_translations: dict[str, str] = Field(
        default_factory=dict,
        description="Translated alerts keyed by language code (es, fr, ar, pt)",
    )
    conflict_resolution: Optional[str] = Field(
        default=None,
        description="Explanation of trade-offs if competing demands existed",
    )
    priority: int = Field(
        ..., ge=1, le=5, description="Priority 1 (highest) to 5 (lowest)"
    )


class DecisionHistory:
    """Maintains a rolling window of recent decisions for engine context.

    This gives the decision engine *memory* across events — it can
    reference what it already decided (e.g. "don't re-allocate a
    volunteer we already moved") rather than reasoning statelessly.
    """

    def __init__(self, max_history: int = 10) -> None:
        self._decisions: list[EngineDecision] = []
        self._max_history = max_history
        self._staff_state: dict[str, dict[str, int]] = {}

    @property
    def decisions(self) -> list[EngineDecision]:
        """Return all stored decisions (oldest first)."""
        return list(self._decisions)

    def add(self, decision: EngineDecision) -> None:
        """Append a decision and trim to the rolling window size."""
        self._decisions.append(decision)
        if len(self._decisions) > self._max_history:
            self._decisions = self._decisions[-self._max_history :]

        for a in decision.staff_allocation:
            self._staff_state.setdefault(a.from_zone, {})
            self._staff_state[a.from_zone][a.role] = (
                self._staff_state[a.from_zone].get(a.role, 0) - a.count
            )
            self._staff_state.setdefault(a.to_zone, {})
            self._staff_state[a.to_zone][a.role] = (
                self._staff_state[a.to_zone].get(a.role, 0) + a.count
            )

    def clear(self) -> None:
        """Reset all decision history (for demo restart)."""
        self._decisions.clear()
        self._staff_state.clear()

    def get_recent(self, n: int = 5) -> str:
        """Format the last *n* decisions as context for the LLM prompt."""
        recent = self._decisions[-n:]
        if not recent:
            return "No previous decisions have been made yet."

        lines: list[str] = []
        for d in recent:
            alloc_str = ""
            if d.staff_allocation:
                moves = [
                    f"{a.count} {a.role}(s) from Zone {a.from_zone} → Zone {a.to_zone}"
                    for a in d.staff_allocation
                ]
                alloc_str = " | Staff moves: " + "; ".join(moves)
            lines.append(
                f"- [{d.risk_level.upper()}] {d.recommended_action} "
                f"(zones: {', '.join(d.affected_zones)}){alloc_str}"
            )
        return "\n".join(lines)

    def get_staff_state(self) -> dict[str, dict[str, int]]:
        """Compute current staff positions based on cumulative decisions.

        Returns a dict like ``{"A": {"volunteer": 4, "security": 1}, ...}``.
        """
        import copy

        return copy.deepcopy(self._staff_state)


class ActionRequest(BaseModel):
    """Payload for manual quick actions (e.g. Open Gates)."""

    action_type: str = Field(..., description="Action identifier")
    zone_id: Optional[str] = None
    operator_id: str


class BroadcastRequest(BaseModel):
    """Payload for manual PA broadcasts."""

    message: str
    zones: list[str]
    operator_id: str
