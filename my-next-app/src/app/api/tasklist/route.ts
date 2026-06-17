import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const taskId = searchParams.get("taskId");
        const link = searchParams.get("Link") || "0";
        const sublink = searchParams.get("Sublink") || "0";

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const url = `${BASE_URL}/Web/dashboard/taskslist/${taskId}/${link}/${sublink}`;

        console.log("API CALL:", url);

        const apiRes = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        // VERY IMPORTANT
        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error("BACKEND ERROR:", text);

            return NextResponse.json(
                { error: "Backend failed", details: text },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();

        console.log("API SUCCESS DATA LENGTH:", data.length);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("API ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}