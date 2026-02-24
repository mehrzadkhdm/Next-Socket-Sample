import { NextResponse } from "next/server";

// In-memory store (replace with a real DB in production)
export const users: { id: string; name: string }[] = [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
];

// GET /api/users
export async function GET() {
    return NextResponse.json(users);
}

// POST /api/users  (bonus)
export async function POST(request: Request) {
    const body = await request.json();

    if (!body.id || !body.name) {
        return NextResponse.json(
            { error: "id and name are required" },
            { status: 400 }
        );
    }

    const exists = users.find((u) => u.id === body.id);
    if (exists) {
        return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const newUser = { id: body.id, name: body.name };
    users.push(newUser);
    return NextResponse.json(newUser, { status: 201 });
}
