import { NextResponse } from "next/server";

import { apiErrorResponse, fetchBackend } from "@/lib/traxion-backend";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const controller = searchParams.get("controller");
    const action = searchParams.get("action") || "Index";

    if (!controller) {
      return NextResponse.json({ error: "controller is required" }, { status: 400 });
    }

    const data = await fetchBackend(
      `/Web/permissions/page?controller=${encodeURIComponent(controller)}&action=${encodeURIComponent(action)}`,
    );

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
