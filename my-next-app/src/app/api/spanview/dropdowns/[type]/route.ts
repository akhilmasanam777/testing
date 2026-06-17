import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        // Await the params object (required in newer Next.js versions)
        const { type } = await params;

        // Await cookies() 
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Combined endpoint map (added "task-level" from your second function)
        const endpointMap: Record<string, string> = {
            "task-level": "GetTaskLevel",
            "package": "GetPackageSpan",
            "zone": "GetZoneSpan",
            "district": "GetDistrictSpan",
            "region": "GetRegionsByUserIdAll",
            "parent-gp": "GetParentGP",
            "child-gp": "GetChildGP",
            "gi": "GetGI",
        };

        const endpoint = endpointMap[type];
        if (!endpoint) {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const apiRes = await fetch(`${BASE_URL}/api/dropdowns/${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        if (!apiRes.ok) {
            return NextResponse.json({ error: "Failed" }, { status: apiRes.status });
        }

        const data = await apiRes.json();
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


















// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { BASE_URL } from "@/config/api";

// export async function GET(
//     req: Request,
//     { params }: { params: Promise<{ type: string }> }
// ) {
//     try {
//         const { type } = await params;

//         const cookieStore = await cookies();
//         const token = cookieStore.get("token")?.value;

//         if (!token) {
//             return NextResponse.json({ error: "No token" }, { status: 401 });
//         }

//         const endpointMap: Record<string, string> = {
//             "package": "GetPackageSpan",
//             "zone": "GetZoneSpan",
//             "district": "GetDistrictSpan",
//             "region": "GetRegionsByUserIdAll",
//             "parent-gp": "GetParentGP",
//             "child-gp": "GetChildGP",
//             "gi": "GetGI",
//         };

//         const endpoint = endpointMap[type];
//         if (!endpoint) {
//             return NextResponse.json({ error: "Invalid type" }, { status: 400 });
//         }

//         const apiRes = await fetch(`${BASE_URL}/api/dropdowns/${endpoint}`, {
//             headers: { Authorization: `Bearer ${token}` },
//             cache: "no-store",
//         });

//         if (!apiRes.ok) {
//             return NextResponse.json({ error: "Failed" }, { status: apiRes.status });
//         }

//         const data = await apiRes.json();
//         return NextResponse.json(data);

//     } catch (err: any) {
//         return NextResponse.json({ error: err.message }, { status: 500 });
//     }
// }



