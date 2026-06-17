import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    const res = await fetch(url!);
    const data = await res.text();

    return new NextResponse(data, {
        headers: { "Content-Type": "application/json" }
    });
}