import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function DELETE(req: Request) {
    try {
         const cookiestore = await cookies();
        const token = cookiestore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        // Calling legacy C# GET endpoint to execute deletion
        const res = await fetch(`${BASE_URL}/Web/spanconfiguration/deletespanroute/${id}`, {
            method: "GET", 
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}