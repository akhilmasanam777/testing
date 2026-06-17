import { cookies } from "next/headers";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        const controller = req.headers.get("x-controller");
        const action = req.headers.get("x-action");

        if (!token) {
            return Response.json({ error: "No token" }, { status: 401 });
        }

        const res = await fetch("https://bnpapp.traxion.in/api/common/breadcrumb", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Controller": controller || "",
                "X-Action": action || "",
            },
        });

        const data = await res.json();
        return Response.json(data);

    } catch (err) {
        return Response.json({ error: "Breadcrumb API failed" }, { status: 500 });
    }
}