import "socket.io";

interface TabSession {
    userData: Record<string, unknown>;
    rooms: string[];
}

declare module "socket.io" {
    interface Socket {
        session: TabSession;
    }
}
