"use server";

import { cookies } from "next/headers";

const BASE_URL = "https://bnpapp.traxion.in";

export async function fetchGanttScript() {
    const cookieStore = await cookies();
    const token =  cookieStore.get("token")?.value;

    const res = await fetch(`${BASE_URL}/Web/dashboard/gantt/script`, {
        headers: {
            Authorization: token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }

    // ⚠️ Crucial difference: returning text(), not json()
    return res.text(); 
}