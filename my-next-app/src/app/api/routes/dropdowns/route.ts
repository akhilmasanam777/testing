import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
              const cookiestore = await cookies();
        const token =  cookiestore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        let endpoint = "";
        
        if (id === "1005") {
            endpoint = "/api/dropdowns/GetUsersByPackageId?code=1005";
        } else if (id === "103") {
            endpoint = "/api/dropdowns/GetLookUp?code=103";
        } else {
            endpoint = `/api/dropdowns/GetLookUp?code=${id}`;
        }

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}