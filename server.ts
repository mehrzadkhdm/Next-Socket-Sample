import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { userStore } from "./lib/userStore";
import { setIO, disconnectTimers } from "./lib/ioInstance";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Map of socketId -> userId
const socketToUser: Map<string, string> = new Map();
const GRACE_MS = 500; // 15 seconds — enough for a full page refresh + reconnect

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO once and share the instance with API routes
    const io = new SocketIOServer(httpServer, {
        cors: { origin: "*" },
        // Give the client more time to respond before declaring a disconnect
        //pingTimeout: 10000,
        //pingInterval: 5000,
    });
    setIO(io);

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("register", (userId: string) => {
            socketToUser.set(socket.id, userId);

            // Cancel any pending removal for this user (tab-switch reconnect)
            const existing = disconnectTimers.get(userId);
            if (existing) {
                clearTimeout(existing);
                disconnectTimers.delete(userId);
                console.log(`User reconnected, removal cancelled: ${userId}`);
            }

            userStore.upsert(userId, userId);
            console.log(`User registered: ${userId} (${socket.id})`);
            io.emit("users", userStore.ids());
        });

        socket.on("disconnect", () => {
            const userId = socketToUser.get(socket.id);
            socketToUser.delete(socket.id);

            if (userId) {
                console.log(`Socket lost for: ${userId} — waiting ${GRACE_MS}ms before removing`);
                // Delay removal to allow tab-switch reconnects
                const timer = setTimeout(() => {
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

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
