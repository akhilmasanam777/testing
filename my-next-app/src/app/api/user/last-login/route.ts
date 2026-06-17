import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies(); 
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return Response.json({ error: "No token" }, { status: 401 });
        }

        const res = await fetch("https://bnpapp.traxion.in/api/user/last-login", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        const data = await res.json();
        return Response.json(data);
    } catch (err) {
        return Response.json({ error: "LastLogin API failed" }, { status: 500 });
    }
}