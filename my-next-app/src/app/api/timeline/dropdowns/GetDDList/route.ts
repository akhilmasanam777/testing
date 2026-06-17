import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";


export async function GET(req: NextRequest) {
    try {
        // 🔹 Read query params
        const { searchParams } = new URL(req.url);

        const id = searchParams.get("id");
        const code = searchParams.get("code") || "";
        const id2 = searchParams.get("id2") || "";

        if (!id) {
            return NextResponse.json([], { status: 400 });
        }

        // 🔹 Get token from cookies (same as your other APIs)
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json([], { status: 401 });
        }

        // 🔹 Call backend API (IMPORTANT)
        const backendUrl = `${BASE_URL}/api/dropdowns/GetDDList?id=${id}&code=${code}&id2=${id2}`;

        const res = await fetch(backendUrl, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return NextResponse.json([], { status: res.status });
        }

        const data = await res.json();

        // 🔹 Return same format to frontend
        return NextResponse.json(data);

    } catch (error) {
        console.error("Dropdown API Error:", error);
        return NextResponse.json([], { status: 500 });
    }
}