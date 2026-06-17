import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { BASE_URL } from "@/config/api";

type Permissions = {
  CanRead?: boolean;
  CanCreate?: boolean;
  CanUpdate?: boolean;
  CanDelete?: boolean;
};

const DEFAULT_PERMISSIONS: Required<Permissions> = {
  CanRead: true,
  CanCreate: true,
  CanUpdate: true,
  CanDelete: true,
};

const LOOKUP_CODES: Record<string, string> = {
  classification: "180",
  invoiceType: "181",
  approvalStatus: "179",
};

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}

async function readPayload(res: Response) {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeArray(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.response)) return data.response;
  return [];
}

async function backendFetch(token: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

async function getPermissions(token: string): Promise<Required<Permissions>> {
  const res = await backendFetch(
    token,
    "/Web/permissions/page?controller=InvoiceModule&action=Index",
  );

  if (!res.ok) return DEFAULT_PERMISSIONS;

  const data = await readPayload(res);

  return {
    CanRead: data?.CanRead ?? DEFAULT_PERMISSIONS.CanRead,
    CanCreate: data?.CanCreate ?? DEFAULT_PERMISSIONS.CanCreate,
    CanUpdate: data?.CanUpdate ?? DEFAULT_PERMISSIONS.CanUpdate,
    CanDelete: data?.CanDelete ?? DEFAULT_PERMISSIONS.CanDelete,
  };
}

function unauthorized() {
  return NextResponse.json({ error: "No token" }, { status: 401 });
}

async function forwardResponse(res: Response) {
  const payload = await readPayload(res);
  return NextResponse.json(payload ?? {}, { status: res.ok ? 200 : res.status });
}

export async function GET(req: Request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");
    const logId = searchParams.get("logId");

    if (type) {
      const code = LOOKUP_CODES[type];
      if (!code) {
        return NextResponse.json({ error: "Invalid dropdown type" }, { status: 400 });
      }

      const res = await backendFetch(token, `/api/dropdowns/GetLookUp?code=${code}`);
      const data = await readPayload(res);
      return NextResponse.json(normalizeArray(data), { status: res.ok ? 200 : res.status });
    }

    const permissions = await getPermissions(token);
    if (!permissions.CanRead) {
      return NextResponse.json({ error: "No Access", permissions }, { status: 403 });
    }

    if (logId) {
      const res = await backendFetch(
        token,
        `/Web/invoicerow/GetInvoiceModuleLogbyId?Id=${encodeURIComponent(logId)}`,
      );
      return forwardResponse(res);
    }

    if (id) {
      const res = await backendFetch(
        token,
        `/Web/invoicerow/getinvoicemodulebyid/${encodeURIComponent(id)}`,
      );
      return forwardResponse(res);
    }

    const res = await backendFetch(token, "/Web/invoicerow/getinvoicemodule");
    const data = await readPayload(res);

    if (!res.ok) {
      return NextResponse.json(data ?? { error: "Backend failed" }, { status: res.status });
    }

    return NextResponse.json({
      data: normalizeArray(data),
      permissions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const permissions = await getPermissions(token);
    if (!permissions.CanUpdate && !permissions.CanCreate) {
      return NextResponse.json({ error: "No Permission" }, { status: 403 });
    }

    const formData = await req.formData();
    const res = await backendFetch(token, "/Web/invoicerow/saveInvoiceModule", {
      method: "POST",
      body: formData,
    });

    return forwardResponse(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const permissions = await getPermissions(token);
    if (!permissions.CanDelete) {
      return NextResponse.json({ error: "No Permission" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const res = await backendFetch(
      token,
      `/Web/invoicerow/deleteinvoicemodule/${encodeURIComponent(id)}`,
      { method: "GET" },
    );

    if (!res.ok) return forwardResponse(res);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
