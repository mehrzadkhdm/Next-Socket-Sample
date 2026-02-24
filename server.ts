import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Map of socketId -> userId
const connectedUsers: Map<string, string> = new Map();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });

    // Initialize Socket.IO once
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on("register", (userId: string) => {
            connectedUsers.set(socket.id, userId);
            console.log(`User registered: ${userId} (${socket.id})`);
            // Broadcast updated user list to all clients
            io.emit("users", Array.from(connectedUsers.values()));
        });

        socket.on("disconnect", () => {
            const userId = connectedUsers.get(socket.id);
            connectedUsers.delete(socket.id);
            console.log(`User disconnected: ${userId} (${socket.id})`);
            io.emit("users", Array.from(connectedUsers.values()));
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
