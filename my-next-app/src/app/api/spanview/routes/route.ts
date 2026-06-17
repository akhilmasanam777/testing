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
        const regionId = searchParams.get("regionId");
        const spanType = searchParams.get("spanType");

        console.log("regionId:", regionId);
        console.log("spanType:", spanType);

        const apiRes = await fetch(
            `${BASE_URL}/Web/spanconfiguration/routesbyspan?regionId=${regionId}&spanType=${spanType}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        if (!apiRes.ok) {
            const text = await apiRes.text();
            console.error("ROUTES ERROR:", text);

            return NextResponse.json(
                { error: "Backend failed" },
                { status: apiRes.status }
            );
        }

        const data = await apiRes.json();

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}