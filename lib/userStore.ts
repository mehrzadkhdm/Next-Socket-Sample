// Shared in-memory store — single instance across the Node.js process.
// Both the custom server (server.ts) and the API routes share this module.

export type User = { id: string; name: string };

// Keyed by userId for O(1) lookup
const userMap = new Map<string, User>();

export const userStore = {
    upsert(id: string, name: string): User {
        const user: User = { id, name };
        userMap.set(id, user);
        return user;
    },

    remove(id: string): User | undefined {
        const user = userMap.get(id);
        userMap.delete(id);
        return user;
    },

    get(id: string): User | undefined {
        return userMap.get(id);
    },

    list(): User[] {
        return Array.from(userMap.values());
    },

    ids(): string[] {
        return Array.from(userMap.keys());
    },
};
