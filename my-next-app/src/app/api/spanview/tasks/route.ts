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
        const routeId = searchParams.get("routeId");
        const spanType = searchParams.get("spanType");

        console.log("routeId:", routeId);
        console.log("spanType:", spanType);

        if (!routeId || !spanType) {
            return NextResponse.json({ error: "Missing params" }, { status: 400 });
        }

        const apiRes = await fetch(
            `${BASE_URL}/Web/spanconfiguration/tasksbyroute?routeId=${routeId}&spanType=${spanType}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error("TASK API ERROR:", text);
            return NextResponse.json(
                { error: "Backend failed", detail: text },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("TASKS ROUTE ERROR:", error.message);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}