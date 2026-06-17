import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "No token" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const apiRes = await fetch(
            `${BASE_URL}/Web/dashboard/addupdatetaskconfig`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            }
        );

        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error("TASKCONFIG POST ERROR:", text);

            return NextResponse.json(
                { error: "Backend API failed" },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("TASKCONFIG POST API ERROR:", error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}