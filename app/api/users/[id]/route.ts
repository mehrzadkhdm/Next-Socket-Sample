import { NextResponse } from "next/server";
import { users } from "../route";

type Params = { params: Promise<{ id: string }> };

// GET /api/users/:id
export async function GET(_req: Request, { params }: Params) {
    const { id } = await params;
    const user = users.find((u) => u.id === id);

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

// PUT /api/users/:id  — upsert: creates the user if they don't exist yet
export async function PUT(request: Request, { params }: Params) {
    const { id } = await params;
    const body = await request.json();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
        // User doesn't exist — create them
        const newUser = { id, name: body.name ?? id };
        users.push(newUser);
        return NextResponse.json(newUser, { status: 201 });
    }

    // User exists — update them
    users[index] = { ...users[index], ...body, id };
    return NextResponse.json(users[index]);
}

// DELETE /api/users/:id
export async function DELETE(_req: Request, { params }: Params) {
    const { id } = await params;
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [deleted] = users.splice(index, 1);
    return NextResponse.json({ deleted });
}
