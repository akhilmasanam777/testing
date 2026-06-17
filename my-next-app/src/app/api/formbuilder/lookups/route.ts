import { NextResponse } from "next/server";

import { apiErrorResponse, fetchBackend, normalizeArray } from "@/lib/traxion-backend";

const LOOKUP_PATHS: Record<string, string> = {
  "control-types": "/api/dropdowns/GetControlsTypes",
  "loading-from": "/api/dropdowns/GetDropDownDataLoadFrom",
  "master-data": "/api/dropdowns/GetMasterDataList",
  uom: "/api/dropdowns/GetLookUp?code=109",
  "task-type": "/api/dropdowns/GetLookUp5?code=158", 
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "";
    const path = LOOKUP_PATHS[type];

    if (!path) {
      return NextResponse.json({ error: "Unknown lookup type" }, { status: 400 });
    }

    const data = await fetchBackend(path);

    return NextResponse.json(normalizeArray(data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
