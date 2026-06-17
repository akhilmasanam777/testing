// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { BASE_URL } from "@/config/api";

// export async function GET(request: Request, { params }: { params: { id: string } }) {
//     const cookieStore = await cookies();
//     const token = cookieStore.get("token")?.value;
//     if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

//     const apiRes = await fetch(`${BASE_URL}/Web/timeline/deleteprogress/${params.id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//         cache: "no-store",
//     });

//     const data = await apiRes.json();
//     return NextResponse.json(data);
// }


// FILE: app/api/timeline/deleteprogress/[id]/route.ts
// FIX: Next.js 15 — params is a Promise, must await it

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;  // ← MUST await in Next.js 15

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
        return NextResponse.json({ error: "No token" }, { status: 401 });

    const apiRes = await fetch(`${BASE_URL}/Web/timeline/deleteprogress/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (!apiRes.ok) {
        return NextResponse.json(
            { error: `Backend returned ${apiRes.status}` },
            { status: apiRes.status }
        );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
}