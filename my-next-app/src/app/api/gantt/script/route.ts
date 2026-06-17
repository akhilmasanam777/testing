import { BASE_URL } from "@/config/api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const apiRes = await fetch(`${BASE_URL}/Web/dashboard/gantt/script`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        const script = await apiRes.text();

        if (!apiRes.ok) {
            return new NextResponse(script || "Backend failed", {
                status: apiRes.status,
                headers: {
                    "Content-Type":
                        apiRes.headers.get("content-type") ??
                        "text/plain; charset=utf-8",
                },
            });
        }

        return new NextResponse(script, {
            status: 200,
            headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/javascript; charset=utf-8",
            },
        });
    } catch (error) {
        console.error("Gantt script proxy failed:", error);

        return NextResponse.json(
            { error: "Unable to load Gantt script" },
            { status: 500 }
        );
    }
}
