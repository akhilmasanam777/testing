import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized - No token found" }, { status: 401 });
        }

        const formData = await req.formData();
        const FolderId = formData.get('FolderId');
        const isvirtual = formData.get('isvirtual');
        const virtualtype = formData.get('virtualtype');
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const endpoint = `${BASE_URL}/Web/dms/file/upload`;

        const uploadFormData = new FormData();
        uploadFormData.append('FolderId', FolderId as string);
        uploadFormData.append('isvirtual', isvirtual as string);
        uploadFormData.append('virtualtype', virtualtype as string);
        uploadFormData.append('file', file);

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: uploadFormData
        });

        if (!res.ok) {
            const errorData = await res.text();
            return NextResponse.json(
                { error: `Failed to upload file. Status: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("[DMS File Upload API] Error:", errorMessage);
        return NextResponse.json(
            { error: `Internal server error: ${errorMessage}` },
            { status: 500 }
        );
    }
}