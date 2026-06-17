import { NextResponse } from "next/server";

import { apiErrorResponse, fetchBackend, normalizeArray } from "@/lib/traxion-backend";

async function getDynamicColumnPermissions() {
  return fetchBackend("/Web/permissions/page?controller=DynamicColumns&action=Index");
}

function canRead(perms: any) {
  return Boolean(perms?.CanRead ?? perms?.canRead);
}

function canWrite(perms: any) {
  return Boolean(perms?.CanUpdate ?? perms?.canUpdate ?? perms?.CanCreate ?? perms?.canCreate);
}

function canDelete(perms: any) {
  return Boolean(perms?.CanDelete ?? perms?.canDelete);
}

export async function GET(req: Request) {
  try {
    const perms = await getDynamicColumnPermissions();
    if (!canRead(perms)) {
      return NextResponse.json({ error: "No Access" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const data = await fetchBackend(
      id
        ? `/Web/taskattributes/dynamiccolumnbyid/${id}`
        : "/Web/taskattributes/dynamiccolumn",
    );
                                                          
    return NextResponse.json(id ? data : normalizeArray(data));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const perms = await getDynamicColumnPermissions();
    if (!canWrite(perms)) {
      return NextResponse.json({ error: "No Permission" }, { status: 403 });
    }

    const body = await req.json();
    const data = await fetchBackend("/Web/taskattributes/savedynamiccolumn", {
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
    const perms = await getDynamicColumnPermissions();
    if (!canDelete(perms)) {
      return NextResponse.json({ error: "No Permission" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const data = await fetchBackend(`/Web/taskattributes/deletedynamiccolumn/${id}`, {
      method: "GET",
    });

    return NextResponse.json(data ?? { success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
