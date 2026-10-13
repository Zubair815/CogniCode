"""
Module: backend.websocket
Purpose: WebSocket layer for real-time chat.

Created: 10/10/2026
"""

from websocket.chat_handler import router as websocket_router

__all__ = ["websocket_router"]