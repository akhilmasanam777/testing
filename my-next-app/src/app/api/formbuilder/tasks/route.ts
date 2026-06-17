import { NextResponse } from "next/server";

import { apiErrorResponse, fetchBackend, normalizeArray } from "@/lib/traxion-backend";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = await fetchBackend(
      id ? `/Web/taskattributes/taskbyid/${id}` : "/Web/taskattributes/task",
    );

    return NextResponse.json(id ? data : normalizeArray(data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await fetchBackend("/Web/taskattributes/savetask", {
      method: "POST",
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data = await fetchBackend(`/Web/taskattributes/deletetask/${id}`, {
      method: "GET",
    });

    return NextResponse.json(data ?? { success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
