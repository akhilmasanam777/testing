import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function POST(req: Request) {
    try {
        const cookiestore = await cookies();
        const token = cookiestore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const formData = await req.formData(); 

        const res = await fetch(`${BASE_URL}/Web/spanconfiguration/uploadkml`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        const text = await res.text();
        let data;
        try { 
            data = JSON.parse(text); 
        } catch { 
            data = { message: text }; 
        }

        return NextResponse.json(data, { status: res.status });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}