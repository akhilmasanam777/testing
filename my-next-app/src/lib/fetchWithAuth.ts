
import { cookies } from "next/headers";

export async function fetchWithAuth(url: string, options: any = {}) {
    const token = cookies().get("token")?.value;

    const res = await fetch(`https://bnpapp.traxion.in${url}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: token ? `Bearer ${token}` : "",
        },
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
    }

    return res.json();
}