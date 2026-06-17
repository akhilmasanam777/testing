import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return Response.json({ error: "No token" }, { status: 401 });
        }

        const res = await fetch("https://bnpapp.traxion.in/api/auth/me", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        console.log("Me :", data)
        return Response.json(data);
    } catch (err) {
        console.error(err);
        return Response.json({ error: "User API failed" }, { status: 500 });
    }
}