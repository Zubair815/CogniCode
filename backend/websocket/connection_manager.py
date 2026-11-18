"""
Module: backend.websocket.connection_manager
Purpose: Tracks active WebSocket connections per session.

         Design choices:
         - One session can have multiple active connections (e.g.,
           student opens the same session in two tabs). We allow this
           and broadcast responses to all connections for that session.
         - Connections are stored in a dict of session_id → set of
           WebSocket objects.
         - Thread-safe via a lock because FastAPI runs each connection
           in its own task.
         - This is in-memory only — fine for single-instance deployment.
           Multi-instance scaling would need Redis pub/sub.

Created: 10/10/2026
"""

import asyncio
from collections import defaultdict
from typing import Dict, Set
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections grouped by session ID."""

    def __init__(self):
        self._connections: Dict[UUID, Set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, session_id: UUID, websocket: WebSocket) -> None:
        """Accept the socket and register it for the session."""
        await websocket.accept()
        async with self._lock:
            self._connections[session_id].add(websocket)

    async def disconnect(self, session_id: UUID, websocket: WebSocket) -> None:
        """Remove the socket from the session's set."""
        async with self._lock:
            conns = self._connections.get(session_id)
            if conns is not None:
                conns.discard(websocket)
                if not conns:
                    self._connections.pop(session_id, None)

    async def send_to(
        self, session_id: UUID, websocket: WebSocket, payload: dict
    ) -> None:
        """
        Send a JSON payload to a specific socket.

        Failures are silently ignored — the socket may have closed
        between the check and the send.
        """
        try:
            await websocket.send_json(payload)
        except Exception:
            await self.disconnect(session_id, websocket)

    async def broadcast(self, session_id: UUID, payload: dict) -> None:
        """Send a JSON payload to all sockets in a session."""
        async with self._lock:
            targets = list(self._connections.get(session_id, set()))

        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                await self.disconnect(session_id, ws)


# Single shared instance used by the chat handler.
manager = ConnectionManager()