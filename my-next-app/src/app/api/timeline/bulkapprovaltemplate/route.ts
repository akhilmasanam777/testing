import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const BulkApproveId = searchParams.get("BulkApproveId");
    const ApprovalTypeId = searchParams.get("ApprovalTypeId");

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
        return NextResponse.json({ error: "No token" }, { status: 401 });

    const res = await fetch(
        `${BASE_URL}/Web/timeline/bulkapprovaltemplate?BulkApproveId=${BulkApproveId}&ApprovalTypeId=${ApprovalTypeId}`,
        {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        }
    );

    const html = await res.text();
    return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
    });
}