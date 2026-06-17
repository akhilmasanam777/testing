import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

const endpointByView: Record<string, string> = {
    zonetasks: "zonetasks",
    districttasks: "districttasks",
    linktasks: "linktasks",
    sublinktasks: "sublinktasks",
};

export async function GET(
    req: Request,
    { params }: { params: Promise<{ view: string }> },
) {
    try {
        const { view } = await params;
        const endpoint = endpointByView[view];
        const id = new URL(req.url).searchParams.get("id");

        if (!endpoint) {
            return NextResponse.json({ error: "Invalid dashboard view" }, { status: 400 });
        }

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const apiRes = await fetch(`${BASE_URL}/Web/dashboard/${endpoint}/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!apiRes.ok) {
            const details = await apiRes.text();
            return NextResponse.json(
                { error: "Backend failed", details },
                { status: apiRes.status },
            );
        }

        const data = await apiRes.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Dashboard API failed" },
            { status: 500 },
        );
    }
}
