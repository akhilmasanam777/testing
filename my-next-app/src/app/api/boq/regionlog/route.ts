import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        // Get token from cookies
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;


        if (!token) {
            return NextResponse.json(
                { error: "No token found" },
                { status: 401 }
            );
        }

        // Get requestId from query
        const { searchParams } = new URL(req.url);
        const requestId = searchParams.get("requestId");

        if (!requestId) {
            return NextResponse.json(
                { error: "Missing requestId" },
                { status: 400 }
            );
        }

        //  Call backend API
        const res = await fetch(
            `${BASE_URL}/Web/boq/regionlog?requestId=${requestId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            }
        );

        if (!res.ok) {
            return NextResponse.json(
                { error: "Failed to fetch log data" },
                { status: res.status }
            );
        }

        const data = await res.json();

        // Return response
        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Region Log API Error:", error);

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}