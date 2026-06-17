import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BASE_URL } from "@/config/api";

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");

        // 1. Get Span Types Lookup
        if (action === "getTaskLevels") {
            const res = await fetch(`${BASE_URL}/api/dropdowns/GetTaskLevel`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 2. Get Dynamic Level Options based on Span Type selection
        if (action === "getRegionDropdown") {
            const type = searchParams.get("type");
            let endpoint = "GetPackageSpan";
            if (type === "2") endpoint = "GetZoneSpan";
            if (type === "3") endpoint = "GetDistrictSpan";
            if (type === "4") endpoint = "GetRegionsByUserIdAll";
            if (type === "5") endpoint = "GetParentGP";
            if (type === "6") endpoint = "GetChildGP";
            if (type === "7") endpoint = "GetGI";

            const res = await fetch(`${BASE_URL}/api/dropdowns/${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 3. Get Main Table Records
        if (action === "getRouteDetails") {
            const regionId = searchParams.get("regionId");
            const spanType = searchParams.get("spanType");
            const res = await fetch(`${BASE_URL}/Web/spanconfiguration/spanprocesslist?RegionId=${regionId}&SpanType=${spanType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 4. Get Templates Dropdown List
        if (action === "getTemplates") {
            const res = await fetch(`${BASE_URL}/api/dropdowns/GetTemplates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 5. Get Assigned Template Metadata for a Route
        if (action === "getRouteProcessTemplate") {
            const id = searchParams.get("id");
            const res = await fetch(`${BASE_URL}/Web/spanconfiguration/routeprocesstemplate/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 6. Get Tasks within Template and Route Scope
        if (action === "getTasks") {
            const templateId = searchParams.get("templateId");
            const routeId = searchParams.get("routeId");
            const res = await fetch(`${BASE_URL}/api/dropdowns/GetTasks?id=${templateId}&id2=${routeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 7. Get Configured Step Metrics by Step ID
        if (action === "getSpanProcessById") {
            const id = searchParams.get("id");
            const res = await fetch(`${BASE_URL}/Web/spanconfiguration/spanprocessbyid/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        // 8. Get Matrix Configurations for MultiConfig
        if (action === "getMultiConfig") {
            const templateId = searchParams.get("templateId");
            const routeId = searchParams.get("routeId");
            const res = await fetch(`${BASE_URL}/Web/spanconfiguration/spanprocessbytemplateroute/${templateId},${routeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return NextResponse.json(await res.json());
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

        const { action, data } = await req.json();

        let endpoint = "";
        if (action === "saveRoute") endpoint = "/Web/spanconfiguration/saveroute";
        if (action === "updateSpanProcess") endpoint = "/Web/spanconfiguration/updatespanprocess";
        if (action === "saveSpanProcessNew") endpoint = "/Web/spanconfiguration/savepanprocessnew";

        if (!endpoint) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

        const apiRes = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(data),
        });

        if (!apiRes.ok) throw new Error("Backend submission failed");
        return NextResponse.json(await apiRes.json());
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}