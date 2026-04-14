import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer, Socket } from "socket.io";
import { userStore } from "./lib/userStore";
import { setIO, disconnectTimers } from "./lib/ioInstance";

interface TabSession {
    userData: Record<string, unknown>;
    rooms: string[];
}

// Extend Socket with our custom session property
type AppSocket = Socket & { session: TabSession };

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Map of socketId -> userId
//const socketToUser: Map<string, string> = new Map();
const GRACE_MS = 2000; // 2 seconds — enough for a full page refresh + reconnect

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handler(req, res, parsedUrl);
    });

    // Initialize Socket.IO once and share the instance with API routes
    const io = new SocketIOServer(httpServer, {
        cors: { origin: "*" },
        // Give the client more time to respond before declaring a disconnect
        //pingTimeout: 10000,
        //pingInterval: 5000,
    });
    setIO(io);

    const tabSessions = new Map<string, TabSession>();
    const tabToUser = new Map<string, string>();
    const userToSocket = new Map<string, Socket>(); // Map userId to their socket


    io.on("connection", (socket) => {
        const { tabSessionId } = socket.handshake.auth as { tabSessionId: string };
        socket.data.tabSessionId = tabSessionId;

        const existingUser = tabToUser.get(tabSessionId);
        console.log(`New socket connection: ${socket.id} (tabSessionId: ${tabSessionId}, existingUser: ${existingUser})`);
        if (existingUser) {
            const timer = disconnectTimers.get(existingUser);
            if (timer) {
                clearTimeout(timer);
                disconnectTimers.delete(existingUser);
                console.log(`Reconnect detected — cancelled removal for ${existingUser}`);
            }
        }
        const appSocket = socket as AppSocket;
        console.log(`Socket connected: ${socket.id}`);


        if (!tabSessions.has(tabSessionId)) {
            tabSessions.set(tabSessionId, {
                userData: {},
                rooms: []
            });
        }

        const session = tabSessions.get(tabSessionId)!;
        appSocket.session = session;
        session.rooms.forEach(room => socket.join(room));

        socket.on("setUserData", (data) => {
            session.userData = data;
        });

        socket.on("joinRoom", (room) => {
            socket.join(room);
            session.rooms.push(room);
        });

        socket.on("sendMessage", (data: { to: string; text: string; from: string; id?: string }) => {
            const recipientSocket = userToSocket.get(data.to);
            
            // Only send to recipient, sender already added locally
            if (recipientSocket) {
                recipientSocket.emit("receiveMessage", {
                    id: data.id,
                    from: data.from,
                    text: data.text,
                    timestamp: Date.now(),
                });
            }
        });

        socket.on("register", (userId: string) => {
            tabToUser.set(socket.data.tabSessionId, userId);
            userToSocket.set(userId, socket); // Map user to socket for messaging
            //socketToUser.set(socket.id, userId);

            // Cancel any pending removal for this user (tab-switch reconnect)
            const existing = disconnectTimers.get(userId);
            if (existing) {
                clearTimeout(existing);
                disconnectTimers.delete(userId);
            }

            userStore.upsert(userId, userId);
            console.log(`User registered: ${userId} (${socket.id})`);
            io.emit("users", userStore.ids());
        });

        socket.on("disconnect", () => {
            const tabSessionId = socket.data.tabSessionId;
            const userId = tabToUser.get(tabSessionId);
            //socketToUser.delete(socket.id);
            // Do NOT delete tabToUser here — keep the mapping so that if the same
            // tab reconnects before the grace period expires, "register" can cancel
            // the timer. We clean it up only after the grace period confirms the
            // tab is truly gone.
            console.log(`Socket disconnected: ${socket.id} (user: ${userId})`);
            if (userId) {
                userToSocket.delete(userId); // Clean up user->socket mapping
                console.log(`Socket lost for: ${userId} — waiting ${GRACE_MS}ms before removing`);
                // Delay removal to allow page-refresh reconnects on the same tab
                const timer = setTimeout(() => {
                    const stillSameUser = tabToUser.get(tabSessionId) === userId;
                    const tabReconnected = Array.from(io.sockets.sockets.values()).some(
                        (connectedSocket) => connectedSocket.data.tabSessionId === tabSessionId
                    );

                    // If the tab has already reconnected, skip removal even if this timer wasn't canceled in time.
                    if (!stillSameUser || tabReconnected) {
                        disconnectTimers.delete(userId);
                        return;
                    }

                    tabToUser.delete(tabSessionId);
                    tabSessions.delete(tabSessionId);
                    disconnectTimers.delete(userId);
                    userStore.remove(userId);
                    console.log(`User removed after grace period: ${userId}`);
                    io.emit("users", userStore.ids());
                }, GRACE_MS);
                disconnectTimers.set(userId, timer);
            } else {
                io.emit("users", userStore.ids());
            }
        });
    });

    httpServer.once("error", (err) => {
        if (err.name === "EADDRINUSE") {
            console.error(`Port ${port} is already in use. Please free the port and try again.`);
        } else {
            console.error("Server error:", err);
        }
        process.exit(1);
    })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
