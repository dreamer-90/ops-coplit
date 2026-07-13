from typing import List, Protocol

import redis.asyncio as redis

from app.schemas import AuditLogRecord, EmergencyState, EngineDecision


class StateStore(Protocol):
    async def add_decision(self, decision: EngineDecision) -> None: ...
    async def get_decisions(self) -> List[EngineDecision]: ...
    async def add_audit_log(self, record: AuditLogRecord) -> None: ...
    async def get_audit_logs(self) -> List[AuditLogRecord]: ...
    async def get_emergency_state(self) -> EmergencyState: ...
    async def set_emergency_state(self, state: EmergencyState) -> None: ...
    async def clear_all(self) -> None: ...

    # Pub/Sub methods
    async def publish(self, channel: str, message: str) -> None: ...
    async def subscribe(
        self, channel: str
    ): ...  # Returns an async iterator/generator yielding messages


class InMemoryStateStore:
    def __init__(self) -> None:
        self._decisions: List[EngineDecision] = []
        self._audit_logs: List[AuditLogRecord] = []
        self._emergency_state = EmergencyState()
        self._subscribers: dict[str, List] = {}

    async def add_decision(self, decision: EngineDecision) -> None:
        self._decisions.append(decision)
        if len(self._decisions) > 100:
            self._decisions = self._decisions[-100:]

    async def get_decisions(self) -> List[EngineDecision]:
        return list(self._decisions)

    async def add_audit_log(self, record: AuditLogRecord) -> None:
        self._audit_logs.append(record)
        if len(self._audit_logs) > 100:
            self._audit_logs = self._audit_logs[-100:]

    async def get_audit_logs(self) -> List[AuditLogRecord]:
        return list(self._audit_logs)

    async def get_emergency_state(self) -> EmergencyState:
        return self._emergency_state

    async def set_emergency_state(self, state: EmergencyState) -> None:
        self._emergency_state = state

    async def clear_all(self) -> None:
        self._decisions.clear()
        self._audit_logs.clear()
        self._emergency_state = EmergencyState()

    async def publish(self, channel: str, message: str) -> None:
        if channel in self._subscribers:
            for queue in self._subscribers[channel]:
                await queue.put(message)

    async def subscribe(self, channel: str):
        import asyncio

        if channel not in self._subscribers:
            self._subscribers[channel] = []
        queue = asyncio.Queue()
        self._subscribers[channel].append(queue)

        try:
            while True:
                msg = await queue.get()
                yield msg
        finally:
            self._subscribers[channel].remove(queue)


class RedisStateStore:
    def __init__(self, redis_url: str) -> None:
        self.redis = redis.from_url(redis_url, decode_responses=True)
        self._pubsub = None

    async def add_decision(self, decision: EngineDecision) -> None:
        data = decision.model_dump_json()
        await self.redis.rpush("decisions", data)
        # Keep last 100 max
        await self.redis.ltrim("decisions", -100, -1)

    async def get_decisions(self) -> List[EngineDecision]:
        items = await self.redis.lrange("decisions", 0, -1)
        return [EngineDecision.model_validate_json(i) for i in items]

    async def add_audit_log(self, record: AuditLogRecord) -> None:
        data = record.model_dump_json()
        await self.redis.rpush("audit_logs", data)

    async def get_audit_logs(self) -> List[AuditLogRecord]:
        items = await self.redis.lrange("audit_logs", 0, -1)
        return [AuditLogRecord.model_validate_json(i) for i in items]

    async def get_emergency_state(self) -> EmergencyState:
        data = await self.redis.get("emergency_state")
        if data:
            return EmergencyState.model_validate_json(data)
        return EmergencyState()

    async def set_emergency_state(self, state: EmergencyState) -> None:
        data = state.model_dump_json()
        await self.redis.set("emergency_state", data)

    async def clear_all(self) -> None:
        await self.redis.delete("decisions", "audit_logs", "emergency_state")

    async def publish(self, channel: str, message: str) -> None:
        await self.redis.publish(channel, message)

    async def subscribe(self, channel: str):
        pubsub = self.redis.pubsub()
        await pubsub.subscribe(channel)
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield message["data"]
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
