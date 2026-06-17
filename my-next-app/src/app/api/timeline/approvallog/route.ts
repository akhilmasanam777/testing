// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// import { BASE_URL } from "@/config/api";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);

//   const TaskProgressId = searchParams.get("TaskProgressId");

//    const cookieStore = await cookies();
//     const token = cookieStore.get("token")?.value;

//   if (!token)
//     return NextResponse.json({ error: "No token" }, { status: 401 });

//   const res = await fetch(
//     `${BASE_URL}/Web/timeline/approvallog?TaskProgressId=${TaskProgressId}`,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//       cache: "no-store",
//     }
//   );

//   const html = await res.text();
//   return new NextResponse(html, {
//     headers: { "Content-Type": "text/html" },
//   });
// }

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("TaskProgressId");

        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        const res = await fetch(
            `${BASE_URL}/Web/Timeline/GetApprovalLog?TaskProgressId=${id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const data = await res.text(); // IMPORTANT → text()

        return new NextResponse(data, {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    } catch (err) {
        return NextResponse.json({ error: "API failed" }, { status: 500 });
    }
}