import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

// ================= TOKEN =================
async function getToken() {
    const cookieStore = await cookies();
    return cookieStore.get("token")?.value;
}

// ================= PERMISSIONS =================
async function getPermissions(token: string) {
    const res = await fetch(
        `${BASE_URL}/Web/permissions/page?controller=User&action=Index`,
        {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        }
    );
    return res.json();
}


export async function GET(req: Request) {
    try {
        const token = await getToken();

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");

        const id = searchParams.get("id");
        const type = searchParams.get("type");
       

        // ✅ RESET PASSWORD
        if (action === "resetPassword") {
            const Id = searchParams.get("Id");
            const UserName = searchParams.get("UserName");
            const RoleId = searchParams.get("RoleId");

            await fetch(
                `${BASE_URL}/Web/masterdata/resetpassword?Id=${Id}&UserName=${UserName}&RoleId=${RoleId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            return NextResponse.json({ success: true });
        }

        // ✅ UNBLOCK
        if (action === "unblock") {
            const Id = searchParams.get("Id");
            const UserName = searchParams.get("UserName");
            const RoleId = searchParams.get("RoleId");

            await fetch(
                `${BASE_URL}/Web/masterdata/resetsession?Id=${Id}&UserName=${UserName}&RoleId=${RoleId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            return NextResponse.json({ success: true });
        }

        // ✅ UNASSIGN
        if (action === "unassign") {
            const Id = searchParams.get("Id");
            const UserName = searchParams.get("UserName");
            const RoleId = searchParams.get("RoleId");

            await fetch(
                `${BASE_URL}/Web/masterdata/unassignuser?Id=${Id}&UserName=${UserName}&RoleId=${RoleId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            return NextResponse.json({ success: true });
        }

        // ✅ DROPDOWNS
        if (type === "roles") {
            const res = await fetch(
                `${BASE_URL}/api/dropdowns/GetRolesByPackage`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return NextResponse.json(await res.json());
        }

        if (type === "agencies") {
            const res = await fetch(
                `${BASE_URL}/api/dropdowns/GetAgencyData`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return NextResponse.json(await res.json());
        }

        if (type === "packages") {
            const res = await fetch(
                `${BASE_URL}/api/dropdowns/GetPackages?id=1`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return NextResponse.json(await res.json());
        }

        // ✅ USERS LIST
        const perms = await getPermissions(token);

        if (!perms.CanRead) {
            return NextResponse.json({ error: "No Access" }, { status: 403 });
        }

        if (id) {
            const res = await fetch(
                `${BASE_URL}/Web/masterdata/getuserbyid/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return NextResponse.json(await res.json());
        }

        const res = await fetch(
            `${BASE_URL}/Web/masterdata/getusers`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();

        return NextResponse.json({
            data: Array.isArray(data) ? data : data.data || [],
            permissions: perms,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ================= POST (ADD / UPDATE) =================
export async function POST(req: Request) {
    try {
        const token = await getToken();

        if (!token) {
            return NextResponse.json({ error: "No token" }, { status: 401 });
        }

        const perms = await getPermissions(token);

        if (!perms.CanUpdate && !perms.CanCreate) {
            return NextResponse.json({ error: "No Permission" }, { status: 403 });
        }

        const body = await req.json();

        const res = await fetch(`${BASE_URL}/Web/masterdata/saveuser`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

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

        await fetch(`${BASE_URL}/Web/masterdata/deleteuser/${id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        });

        return NextResponse.json({ success: true });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}