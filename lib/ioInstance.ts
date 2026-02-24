// Shared Socket.IO server instance.
// Assigned once in server.ts; imported by API routes to broadcast changes.
import type { Server as SocketIOServer } from "socket.io";

let _io: SocketIOServer | null = null;

// Grace-period timers shared between server.ts (set) and API routes (cancel)
export const disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

export function setIO(io: SocketIOServer) {
    _io = io;
}

export function getIO(): SocketIOServer | null {
    return _io;
}

/** Broadcast the current user list to all connected clients. */
export function broadcastUsers(userIds: string[]) {
    _io?.emit("users", userIds);
}

/**
 * Cancel a pending grace-period removal for a user.
 * Call this when an explicit DELETE is made so the user is removed immediately
 * without waiting for the timer.
 */
export function cancelDisconnectTimer(userId: string) {
    const timer = disconnectTimers.get(userId);
    if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(userId);
    }
}
