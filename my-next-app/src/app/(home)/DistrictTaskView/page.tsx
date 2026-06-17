"use client";


import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { toTitleCase } from "@/lib/text";
import { DrilldownTable } from "../TaskDahboard/_components/drilldown-table";

function DistrictTaskViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const zoneId = searchParams.get("zoneId");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!zoneId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`/api/taskdashboard/districttasks?id=${encodeURIComponent(zoneId)}`)
            .then((res) => res.json())
            .then((res) => setData(Array.isArray(res) ? res : []))
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [zoneId]);

    const tasks = useMemo(() => [...new Set(data.map((x) => x.TaskName))], [data]);

    const rows = useMemo(() => {
        const districtIds = [...new Set(data.map((x) => x.DistrictId))];

        return districtIds.map((districtId) => {
            const districtRows = data.filter((x) => x.DistrictId === districtId);
            const base = districtRows[0] || {};
            const row: any = {
                __key: districtId,
                ZoneName: base.ZoneName,
                DistrictId: base.DistrictId,
                District: `${base.DistrictCode || ""} / ${base.DistrictName || ""}`,
                Total: districtRows.reduce((sum, item) => sum + Number(item.Target || 0), 0),
            };

            tasks.forEach((taskName) => {
                const item = districtRows.find((x) => x.TaskName === taskName);
                row[`Completed_${taskName}`] = item?.TotalProgress ?? "-";
                row[`Approved_${taskName}`] = item?.TodayProgress ?? "-";
            });

            return row;
        });
    }, [data, tasks]);

    const columns = useMemo(() => {
        return [
            // zone
            {
                key: "ZoneName",
                label: "Zone",
                render: (row: any) => (
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {row.ZoneName}
                    </button>
                ),
            },
            // district
            {
                key: "District",
                label: "District",
                render: (row: any) => (
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/LinkTaskView?DistrictId=${encodeURIComponent(String(row.DistrictId))}`,
                            )
                        }
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {row.District}
                    </button>
                ),
            },
            // estimated

            { key: "Total", label: "Estimated" },
            ...tasks.flatMap((taskName) => [
    {
        key: `Completed_${taskName}`,
        label: "Completed",
        render: (row: any) => {
            const item = data.find(
                (x) =>
                    x.DistrictId === row.DistrictId &&
                    x.TaskName === taskName,
            );

            if (!item) {
                return "-";
            }

            return (
                <button
                    type="button"
                    onClick={() =>
                     router.push(
                         `/TaskList?taskId=${encodeURIComponent(String(item.TaskId ?? ""))}&Link=${encodeURIComponent(String(item.LinkId ?? ""))}&Sublink=${encodeURIComponent(String(item.SublinkId ?? ""))}`,
)
                        
                    }
                    className="text-primary underline-offset-2 hover:underline"
                >
                    {item.TotalProgress}
                </button>
            );
        },
    },
    {
        key: `Approved_${taskName}`,
        label: "Approved",
    },
]),
        ];
    }, [tasks, router]);

    const groups = useMemo(() => tasks.map((t) => ({ label: t, span: 2 })), [tasks]);

    return (
        <DrilldownTable
            title="District Details"
            rows={rows}
            columns={columns}
            groups={groups}
            exportFileName="district-details.xlsx"
            loading={loading}
        />
    );
}

export default function DistrictTaskViewPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <DistrictTaskViewContent />
        </Suspense>
    );
}
