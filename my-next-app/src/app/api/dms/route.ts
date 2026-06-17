import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized - No token found" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const folderId = searchParams.get("folderId") || searchParams.get("folderid") || "0";
        const isVirtual = searchParams.get("isvirtual") || searchParams.get("isVirtual") || "1";
        const virtualType = searchParams.get("virtualtype") || searchParams.get("virtualType") || "zone";

        console.log(`[DMS API] Fetching DMS files for folderId: ${folderId}, isVirtual: ${isVirtual}, virtualType: ${virtualType}`);

        // Correct endpoint based on curl command
        const endpoint = `${BASE_URL}/Web/dms/files?folderId=${folderId}&isvirtual=${isVirtual}&virtualtype=${virtualType}`;

        console.log(`[DMS API] Calling endpoint: ${endpoint}`);
        
        const res = await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${token}`,
                "accept": "application/json",
            },
            cache: "no-store",
        });

        console.log(`[DMS API] Response status: ${res.status}`);

        if (!res.ok) {
            const errorData = await res.text();
            console.error(`[DMS API] Error response: ${errorData}`);
            return NextResponse.json(
                { 
                    error: `Failed to fetch DMS data. Status: ${res.status}`,
                    folderId,
                    debug: process.env.NODE_ENV === "development"
                },
                { status: res.status }
            );
        }

        const data = await res.json();
        console.log(`[DMS API] Success! Returned items count:`, data?.length || Object.keys(data).length);

        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[DMS API] Error:", errorMessage);
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}