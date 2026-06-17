import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

// TOKEN
async function getToken() {
    const cookieStore = await cookies();
    return cookieStore.get("token")?.value;
}

// PERMISSIONS
async function getPermissions(token: string) {
    const res = await fetch(
        `${BASE_URL}/Web/permissions/page?controller=GPNames&action=Index`,
        {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        }
    );
    return res.json();
}

// SUMMARY
async function getSummary(token: string) {
    const res = await fetch(`${BASE_URL}/Web/masterdata/getgpssummary`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

// ================= GET =================
export async function GET(req: Request) {
    try {
        const token = await getToken();
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

        const perms = await getPermissions(token);
        if (!perms?.CanRead)
            return NextResponse.json({ error: "No Access" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        // SWITCH URL BASED ON ID
        if (id) {
            const res = await fetch(
                `${BASE_URL}/Web/masterdata/getgpbyid/${id}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const data = await res.json();
            return NextResponse.json(data);
        }

        // GET ALL
        const [dataRes, summary] = await Promise.all([
            fetch(`${BASE_URL}/Web/masterdata/getgps`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
            getSummary(token),
        ]);

        const data = await dataRes.json();

        return NextResponse.json({
            data: Array.isArray(data) ? data : [],
            summary,
            permissions: perms,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ================= POST =================
export async function POST(req: Request) {
    try {
        const token = await getToken();
        const body = await req.json();

        const res = await fetch(`${BASE_URL}/Web/masterdata/savegp`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        return NextResponse.json(await res.json());

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ================= DELETE =================
export async function DELETE(req: Request) {
    try {
        const token = await getToken();
        const perms = await getPermissions(token);

        if (!perms?.CanDelete)
            return NextResponse.json({ error: "No Permission" }, { status: 403 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        await fetch(`${BASE_URL}/Web/masterdata/deletegp/${id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}