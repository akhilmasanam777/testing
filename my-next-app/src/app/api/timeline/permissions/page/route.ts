// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { BASE_URL } from "@/config/api";

// export async function GET(request: Request) {
//     const { searchParams } = new URL(request.url);

//     const controller = searchParams.get("controller");
//     const action = searchParams.get("action");

//     const cookieStore = await cookies();
//     const token = cookieStore.get("token")?.value;

//     if (!token)
//         return NextResponse.json({ error: "No token" }, { status: 401 });

//     const res = await fetch(
//         `${BASE_URL}/api/permissions/page?controller=${controller}&action=${action}`,
//         {
//             headers: { Authorization: `Bearer ${token}` },
//             cache: "no-store",
//         }
//     );

//     const data = await res.json();
//     return NextResponse.json(data);
// }


// FILE: app/api/permissions/page/route.ts
// NOTE: Make sure your folder is named "page" NOT "page\" (no backslash)
// The folder structure must be: app/api/permissions/page/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const controller = searchParams.get("controller");
    const action = searchParams.get("action");

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
        return NextResponse.json({ error: "No token" }, { status: 401 });

    console.log(`[permissions] controller=${controller} action=${action}`);

    const apiRes = await fetch(
        `${BASE_URL}/api/permissions/page?controller=${controller}&action=${action}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        }
    );

    // If backend returns 404, return full permissions as defaults
    if (!apiRes.ok) {
        console.warn(`[permissions] Backend returned ${apiRes.status}, using defaults`);
        return NextResponse.json({
            CanRead: true,
            CanView: true,
            CanUpdate: true,
            CanDelete: true,
        });
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
}