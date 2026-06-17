import {NextResponse} from "next/server";
import {cookies} from "next/headers";   
import {BASE_URL} from "@/config/api";

export async function GET(){

    try{
  const cookieStore= await cookies();
  const token= cookieStore.get("token")?.value;


    if(!token){
        return NextResponse.json({error:"No token"},{status:401})
    }

      const apiRes= await fetch(`${BASE_URL}/Web/taskattributes/template`, {
            method:"GET",
            headers:{
                "Content-Type":"application/json",
                Authorization: `Bearer ${token}`,
            }

      });

      if(!apiRes.ok)throw new Error("Backend Api failed");
     const data= await apiRes.json();
     return NextResponse.json(data);
    }catch(error:any){
        return NextResponse.json({error:error.message}, {status:500})
    }
    
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

        const body = await req.json();

        const apiRes = await fetch(`${BASE_URL}/Web/taskattributes/savetemplate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!apiRes.ok) throw new Error("Backend API failed");
        const data = await apiRes.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE TEMPLATE
export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;

        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        // Original jQuery script used GET for deletion: /Web/taskattributes/deletetemplate/{id}
        const apiRes = await fetch(`${BASE_URL}/Web/taskattributes/deletetemplate/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });

        if (!apiRes.ok) throw new Error("Backend API failed");
        
        // Sometimes delete endpoints return plain text instead of JSON
        const text = await apiRes.text();
        return NextResponse.json({ success: true, message: text });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}