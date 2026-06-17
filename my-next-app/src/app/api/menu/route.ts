import { cookies } from "next/headers";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return Response.json({ error: "No token" }, { status: 401 });
        }

        const baseUrl = "https://bnpapp.traxion.in";

        const [menuRes, categoryRes] = await Promise.all([
            fetch(`${baseUrl}/api/menu/list`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
            fetch(`${baseUrl}/api/menu/category`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            }),
        ]);

        if (!menuRes.ok || !categoryRes.ok) {
            return Response.json({ error: "Backend API failed" }, { status: 500 });
        }

        const menuList = await menuRes.json();
        const categoryList = await categoryRes.json();

        return Response.json({ menuList, categoryList });
    } catch (error) {
        console.error("MENU API ERROR:", error);
        return Response.json({ error: "Server error" }, { status: 500 });
    }
}