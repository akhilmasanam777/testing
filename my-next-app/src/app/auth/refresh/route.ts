import {NextResponse} from "next/server";
import jwt, {JwtPayload} from "jsonwebtoken";


export async function POST(req:Request){
   const refreshToken= req.headers.get("cookie")?.match(/refreshToken=([^;]+)/)?.[1];

  if(!refreshToken){
    return NextResponse.json({error:"No refresh token"}, {status:401});
  }

 try{
     const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET!) as JwtPayload & {userId: string};

       const newAccessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "15m" }
    );
    const res = NextResponse.json({ success: true });
    res.cookies.set("token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }
}

    


