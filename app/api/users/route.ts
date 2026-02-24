import { NextResponse } from "next/server";
import { userStore } from "@/lib/userStore";
import { broadcastUsers } from "@/lib/ioInstance";

// GET /api/users
export async function GET() {
    return NextResponse.json(userStore.list());
}

// POST /api/users
export async function POST(request: Request) {
    const body = await request.json();

    if (!body.id || !body.name) {
        return NextResponse.json(
            { error: "id and name are required" },
            { status: 400 }
        );
    }

    if (userStore.get(body.id)) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const newUser = userStore.upsert(body.id, body.name);
    broadcastUsers(userStore.ids());
    return NextResponse.json(newUser, { status: 201 });
}
