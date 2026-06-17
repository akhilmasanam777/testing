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
        const id = searchParams.get("id") || "2";

        const endpoint = `${BASE_URL}/api/dropdowns/GetPackages?id=${id}`;

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
                { error: `Failed to fetch packages. Status: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        const normalized = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.response)
                    ? data.response
                    : Array.isArray(data?.result)
                        ? data.result
                        : data;

        return NextResponse.json(normalized);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[Dropdowns API] Error:", errorMessage);
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}