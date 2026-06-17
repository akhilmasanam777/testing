import { BASE_URL } from "@/config/api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 401 });
    }

    const apiRes = await fetch(`${BASE_URL}/Web/dashboard/hierarchyconfig`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      console.error("HIERARCHYCONFIG GET ERROR:", text);

      return NextResponse.json(
        { error: "Backend API failed" },
        { status: apiRes.status },
      );
    }

    const data = await apiRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("HIERARCHYCONFIG API ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 },
    );
  }
}
