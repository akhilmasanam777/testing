import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    // Forward all query params as-is
    const query = searchParams.toString();

    const apiRes = await fetch(`${BASE_URL}/Web/timeline/details?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });

    const data = await apiRes.json();
    return NextResponse.json(data);
}