import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET() {
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const apiRes = await fetch(`${BASE_URL}/api/dropdowns/GetTaskLevel`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!apiRes.ok) {
            return NextResponse.json({ error: "Failed" }, { status: apiRes.status });
        }

        const data = await apiRes.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}