import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { BASE_URL } from "@/config/api";

export class BackendError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value;
}

export async function fetchBackend(path: string, init: RequestInit = {}) {
  const token = await getAuthToken();

  if (!token) {
    throw new BackendError("No token found. Please log in again.", 401);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  const data = parseJson(text);

  if (!res.ok) {
    const backendMessage = getBackendMessage(data);
    throw new BackendError(
      formatBackendError(path, res.status, backendMessage),
      res.status,
      data ?? text,
    );
  }

  return data;
}

export function normalizeArray(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof BackendError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}

function parseJson(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getBackendMessage(data: any) {
  if (!data) return "";
  if (typeof data === "string") return data;
  return (
    data.error ||
    data.Error ||
    data.message ||
    data.Message ||
    data.ExceptionMessage ||
    data.exceptionMessage ||
    ""
  );
}

function formatBackendError(path: string, status: number, message: string) {
  const fallback = `Backend request failed with status ${status}`;

  if (!message) {
    return `${fallback}: ${path}`;
  }

  if (message === "An error has occurred.") {
    return `${message} Backend endpoint: ${path} (status ${status})`;
  }

  return message;
}
