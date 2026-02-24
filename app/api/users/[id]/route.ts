import { NextResponse } from "next/server";
import { userStore } from "@/lib/userStore";
import { broadcastUsers, cancelDisconnectTimer } from "@/lib/ioInstance";

type Params = { params: Promise<{ id: string }> };

// GET /api/users/:id
export async function GET(_req: Request, { params }: Params) {
    const { id } = await params;
    const user = userStore.get(id);

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

// PUT /api/users/:id  — upsert: creates the user if they don't exist yet
export async function PUT(request: Request, { params }: Params) {
    const { id } = await params;
    const body = await request.json();
    const existing = userStore.get(id);
    const user = userStore.upsert(id, body.name ?? id);
    broadcastUsers(userStore.ids());
    return NextResponse.json(user, { status: existing ? 200 : 201 });
}

// DELETE /api/users/:id
export async function DELETE(_req: Request, { params }: Params) {
    const { id } = await params;
    // Cancel any grace-period timer so the removal is instant, not delayed
    cancelDisconnectTimer(id);
    const deleted = userStore.remove(id);

    if (!deleted) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    broadcastUsers(userStore.ids());
    return NextResponse.json({ deleted });
}
