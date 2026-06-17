import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("token")?.value;
    const isLoginPage = request.nextUrl.pathname.startsWith("/auth/sign-in");

    // If NOT logged in → go to login
    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL("/auth/sign-in", request.url));
    }

    if(token){
        try{
        jwt.verify(token, process.env.JWT_SECRET_KEY!);
        
        if(isLoginPage){
            return NextResponse.redirect(new URL("/", request.url));
        }} catch{
           const res = NextResponse.redirect(new URL("/auth/sign-in", request.url));
            res.cookies.delete("token");
            return res;
        }
    }
    // If already logged in → prevent going back to login
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|public|api).*)',
    ],
    runtime:'nodejs',
}




// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//     const token = request.cookies.get("token")?.value;

//     const isLoginPage = request.nextUrl.pathname.startsWith("/auth/sign-in");

//     // If NOT logged in → go to login
//     if (!token && !isLoginPage) {
//         return NextResponse.redirect(new URL("/auth/sign-in", request.url));
//     }

//     // If already logged in → prevent going back to login
//     if (token && isLoginPage) {
//         return NextResponse.redirect(new URL("/", request.url));
//     }

//     return NextResponse.next();
// }