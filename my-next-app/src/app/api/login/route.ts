import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
const res = await fetch("https://bnpapp.traxion.in/Web/Login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        Email: body.email || body.Email || body.username,
        Password: body.password || body.Password,
    }),
});

        const data = await res.json();

        const token =
            data?.token ||
            data?.accessToken ||
            data?.Token;

        if (!token) {
            return NextResponse.json(
                { error: "No token received" },
                { status: 401 }
            );
        }

        const response = NextResponse.json({
            success: true,
            user: data,
            loginTime: data.LoginTime || new Date().toISOString(),
        });

        response.cookies.set("token", token, {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
        });

        return response;
    } catch (error) {
        return NextResponse.json(
            { error: "Login failed" },
            { status: 500 }
        );
    }
}










// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();

//         const res = await fetch("https://bnpapp.traxion.in/Web/Login", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//             },
//             body: JSON.stringify(body),
//         });

//         const data = await res.json();

//         const token =
//             data?.token ||
//             data?.accessToken ||
//             data?.Token;

//         if (!token) {
//             return NextResponse.json(
//                 { error: "No token received" },
//                 { status: 401 }
//             );
//         }

//         const response = NextResponse.json({
//             success: true,
//             user: data,
//             loginTime: data.LoginTime || new Date().toISOString(),
//         });

//         response.cookies.set("token", token, {
//             httpOnly: false,
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             path: "/",
//         });

//         return response;
//     } catch (error) {
//         return NextResponse.json(
//             { error: "Login failed" },
//             { status: 500 }
//         );
//     }
// }