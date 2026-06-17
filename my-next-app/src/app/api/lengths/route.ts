import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function GET() {
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "No token" },
                { status: 401 }
            );
        }

        const apiRes = await fetch(
            `${BASE_URL}/Web/dashboard/executive/lengths/tree`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        if (!apiRes.ok) {
            const text = await apiRes.text(); // debug
            console.error("BACKEND ERROR:", text);

            return NextResponse.json(
                { error: "Backend API failed" },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("LENGTHS API ERROR:", error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}