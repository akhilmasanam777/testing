"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DrilldownTable } from "../TaskDahboard/_components/drilldown-table";

function ZoneTaskViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const packId = searchParams.get("packId");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!packId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`/api/taskdashboard/zonetasks?id=${encodeURIComponent(packId)}`)
            .then((res) => res.json())
            .then((res) => setData(Array.isArray(res) ? res : []))
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [packId]);

    const zones = useMemo(() => {
        return Array.from(
            new Map(
                data.map((x) => [
                    x.ZoneId,
                    {
                        ZoneId: x.ZoneId,
                        ZoneName: x.ZoneName,
                    },
                ]),
            ).values(),
        );
    }, [data]);

    const rows = useMemo(() => {
        const tasks = [...new Set(data.map((x) => x.TaskName))];

        return tasks.map((taskName) => {
            const taskRows = data.filter((x) => x.TaskName === taskName);
            const base = taskRows[0] || {};
            const row: any = {
                __key: taskName,
                PackageName: base.PackageName,
                TaskName: base.TaskName,
                UOM: base.UOM,
                Total: taskRows.reduce((sum, item) => sum + Number(item.Target || 0), 0),
            };

            zones.forEach((zone: any) => {
                const item = taskRows.find((x) => x.ZoneId === zone.ZoneId);
                row[`Completed_${zone.ZoneId}`] = item?.TotalProgress ?? "-";
                row[`Approved_${zone.ZoneId}`] = item?.TodayProgress ?? "-";
            });

            return row;
        });
    }, [data, zones]);

    const columns = useMemo(() => {
        return [
            // {
            //     key: "PackageName",
            //     label: "Package",
            //     render: (row: any) => (
            //         <button
            //             type="button"
            //             onClick={() => router.back()}
            //             className="text-primary underline-offset-2 hover:underline"
            //         >
            //             {row.PackageName}
            //         </button>
            //     ),
            // },
            { key: "TaskName", label: "Zone" },
            { key: "UOM", label: "UOM" },
            { key: "Total", label: "Estimated" },
            ...zones.flatMap((zone: any) => [
                {
                    key: `Completed_${zone.ZoneId}`,
                    label: `Completed`,
                    render: (row: any) => <span>{row[`Completed_${zone.ZoneId}`]}</span>,
                },
                {
                    key: `Approved_${zone.ZoneId}`,
                    label: `Approved`,
                },
            ]),
        ];
    }, [zones, router]);

    const groups = useMemo(() =>
        zones.map((zone: any) => ({
            label: (
                <button
                    type="button"
                    onClick={(event: any) => {
                        event.stopPropagation();
                        router.push(
                            `/DistrictTaskView?zoneId=${encodeURIComponent(String(zone.ZoneId))}`,
                        );
                    }}
                    className="text-left text-primary underline-offset-2 hover:underline"
                >
                    {zone.ZoneName}
                </button>
            ),
            span: 2,
        })),
    [zones, router]);

    return (
        <>
        <DrilldownTable
            title="Zone Details"
            rows={rows}
            columns={columns}
            groups={groups}
            exportFileName="zone-details.xlsx"
            loading={loading}
            
        />
    
        </>
    );
}

export default function ZoneTaskViewPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <ZoneTaskViewContent />
        </Suspense>
    );
}
