import { cookies } from "next/headers";

export async function fetchWithAuth(url: string, options: any = {}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const res = await fetch(`http://localhost:5001${url}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
    });

    if (res.status === 401) {
        throw new Error("Unauthorized");
    }

    return res.json();
}