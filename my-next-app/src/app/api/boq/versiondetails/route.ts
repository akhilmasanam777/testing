import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const blockId = searchParams.get("blockId");
        const version = searchParams.get("version");

        const res = await fetch(
            `${BASE_URL}/Web/boq/info?blockId=${blockId}&versionNumber=${version}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const data = await res.json();

        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}