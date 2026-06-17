import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TaskDashboard from "./dashboard";

export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        redirect("/auth/sign-in");
    }

    const baseUrl = "https://bnpapp.traxion.in";

    const res = await fetch(`${baseUrl}/Web/dashboard/packagewise`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
    });

    const data = await res.json();

    return <TaskDashboard data={data} />;
}