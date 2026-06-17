import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const cookiestore = await cookies();
        const token = cookiestore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const regionId = searchParams.get("RegionId");
        const spanType = searchParams.get("SpanType");

        const res = await fetch(`${BASE_URL}/Web/spanconfiguration/getspanroutes?RegionId=${regionId}&SpanType=${spanType}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}