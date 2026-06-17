import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized - No token found" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const progressId = searchParams.get("progressId");
        const folderName = searchParams.get("folderName");

        if (!progressId || !folderName) {
            return NextResponse.json({ error: "progressId and folderName are required" }, { status: 400 });
        }

        const endpoint = `${BASE_URL}/Web/dms/downloadall/download?progressId=${progressId}&folderName=${encodeURIComponent(folderName)}`;

        const res = await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            const errorData = await res.text();
            return NextResponse.json(
                { error: `Failed to download file. Status: ${res.status}` },
                { status: res.status }
            );
        }

        // Get the response as a blob and return it
        const blob = await res.blob();
        const headers = new Headers();

        // Copy relevant headers from the backend response
        const contentType = res.headers.get('content-type');
        const contentDisposition = res.headers.get('content-disposition');

        if (contentType) headers.set('content-type', contentType);
        if (contentDisposition) headers.set('content-disposition', contentDisposition);

        return new NextResponse(blob, { headers });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[DMS Download File API] Error:", errorMessage);
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}