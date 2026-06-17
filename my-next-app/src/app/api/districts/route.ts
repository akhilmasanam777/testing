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
        `${BASE_URL}/Web/permissions/page?controller=Districts&action=Index`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    return res.json();
}

// ================= GET =================
export async function GET(req: Request) {
    try {
        const token = await getToken();

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const perms = await getPermissions(token);

        // ✅ FIXED
        if (!perms.CanRead) {
            return NextResponse.json({ error: "No Access" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        const url = id
            ? `${BASE_URL}/Web/masterdata/getdistrictbyid/${id}`
            : `${BASE_URL}/Web/masterdata/getdistrict`;

        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        const data = await res.json();

        if (id) return NextResponse.json(data);

        return NextResponse.json(
            Array.isArray(data) ? data : data.data || []
        );

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ================= POST =================
export async function POST(req: Request) {
    try {
        const token = await getToken();

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const perms = await getPermissions(token);

        if (!perms.CanUpdate) {
            return NextResponse.json({ error: "No Permission" }, { status: 403 });
        }

        const body = await req.json();

        const res = await fetch(
            `${BASE_URL}/Web/masterdata/savedistrict`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        const data = await res.json();
        return NextResponse.json(data);

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ================= DELETE =================
export async function DELETE(req: Request) {
    try {
        const token = await getToken();

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const perms = await getPermissions(token);

        if (!perms.CanDelete) {
            return NextResponse.json({ error: "No Permission" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        await fetch(
            `${BASE_URL}/Web/masterdata/deletedistrict/${id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}