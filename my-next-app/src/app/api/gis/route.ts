import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const token = cookies().get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const regionId = searchParams.get("regionId");

        const res = await fetch(
            `${BASE_URL}/Web/gis/boqfiles?regionId=${regionId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        const data = await res.json();

        // RETURN SAME STRUCTURE (IMPORTANT)
        return NextResponse.json(data);

    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
