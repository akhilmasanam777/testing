// // import { NextResponse } from "next/server";
// // import { cookies } from "next/headers";
// // import { BASE_URL } from "@/config/api";

// // export async function GET(request: Request, { params }: { params: { id: string } }) {
// //     const cookieStore = await cookies();
// //     const token = cookieStore.get("token")?.value;
// //     if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

// //     const apiRes = await fetch(`${BASE_URL}/Web/timeline/progress/${params.id}`, {
// //         headers: { Authorization: `Bearer ${token}` },
// //         cache: "no-store",
// //     });

// //     const data = await apiRes.json();
// //     return NextResponse.json(data);
// // }



// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { BASE_URL } from "@/config/api";

// export async function GET(
//     request: Request,
//     { params }: { params: { id: string } }
// ) {
//     const cookieStore = await cookies();
//     const token = cookieStore.get("token")?.value;

//     if (!token)
//         return NextResponse.json({ error: "No token" }, { status: 401 });

//     const apiRes = await fetch(
//         `${BASE_URL}/Web/timeline/progress/new/${params.id}`,
//         {
//             headers: {
//                 Authorization: `Bearer ${token}`,
//             },
//             cache: "no-store",
//         }
//     );

//     const data = await apiRes.json();
//     return NextResponse.json(data);
// }



// FILE: app/api/timeline/progress/new/[id]/route.ts
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

    console.log(`[GET progress/new/${id}] → ${BASE_URL}/Web/timeline/progress/new/${id}`);

    const apiRes = await fetch(`${BASE_URL}/Web/timeline/progress/new/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    if (!apiRes.ok) {
        const text = await apiRes.text().catch(() => "");
        console.error(`[progress/new/${id}] Backend ${apiRes.status}:`, text);
        return NextResponse.json(
            { error: `Backend returned ${apiRes.status}`, detail: text },
            { status: apiRes.status }
        );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
}