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
        const progressId = searchParams.get("progressId");

        if (!progressId) {
            return NextResponse.json({ error: "progressId is required" }, { status: 400 });
        }

        const endpoint = `${BASE_URL}/Web/dms/downloadall/progress?progressId=${progressId}`;

        const res = await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${token}`,
                "accept": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const errorData = await res.text();
            return NextResponse.json(
                { error: `Failed to get progress. Status: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[DMS Download Progress API] Error:", errorMessage);
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}