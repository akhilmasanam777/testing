import { NextResponse } from "next/server";

export async function POST() {
    const res = NextResponse.json({ success: true });

    //Delete cookie from server
    res.cookies.set("token", "", {
        maxAge: 0,
        path: "/",
    });

    return res;
}