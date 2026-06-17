import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");

        // SAME AS WORKING API
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "No token" },
                { status: 401 }
            );
        }

        const apiRes = await fetch(
            `${BASE_URL}/Web/dashboard/executive/taskwise?fromDate=${fromDate}&toDate=${toDate}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        const data = await apiRes.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error("API ERROR:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}