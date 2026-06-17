import { NextResponse } from "next/server";

import { apiErrorResponse, fetchBackend, normalizeArray } from "@/lib/traxion-backend";

const OPTION_ENDPOINTS: Record<string, string> = {
  dropdown: "getdropdownvalues",
  radio: "getradiobuttonvalues",
  checkbox: "getcheckboxvalues",
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const id = searchParams.get("id") || "0";
    const endpoint = OPTION_ENDPOINTS[type];

    if (!endpoint) {
      return NextResponse.json({ error: "Unknown option type" }, { status: 400 });
    }

    const data = await fetchBackend(`/Web/taskattributes/${endpoint}/${id}`);

    return NextResponse.json(normalizeArray(data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
