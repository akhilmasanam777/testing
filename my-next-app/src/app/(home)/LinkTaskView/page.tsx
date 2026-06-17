"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DrilldownTable } from "../TaskDahboard/_components/drilldown-table";


function LinkTaskViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const districtId = searchParams.get("DistrictId");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!districtId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`/api/taskdashboard/linktasks?id=${encodeURIComponent(districtId)}`)
            .then((res) => res.json())
            .then((res) => setData(Array.isArray(res) ? res : []))
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [districtId]);

    const tasks = useMemo(() => [...new Set(data.map((x) => x.TaskName))], [data]);

    const rows = useMemo(() => {
        const linkIds = [...new Set(data.map((x) => x.LinkId))];

        return linkIds.map((linkId) => {
            const linkRows = data.filter((x) => x.LinkId === linkId);
            const base = linkRows[0] || {};
            const row: any = {
                __key: linkId,
                DistrictName: base.DistrictName,
                LinkId: base.LinkId,
                Block: `${base.LinkCode || ""} / ${base.LinkName || ""}`,
                Total: linkRows.reduce((sum, item) => sum + Number(item.Target || 0), 0),
            };

            tasks.forEach((taskName) => {
                const item = linkRows.find((x) => x.TaskName === taskName);
                row[`Completed_${taskName}`] = item?.TotalProgress ?? "-";
                row[`Approved_${taskName}`] = item?.TodayProgress ?? "-";
            });

            return row;
        });
    }, [data, tasks]);

    const columns = useMemo(() => {
        return [
            {
                key: "DistrictName",
                label: "District",
                render: (row: any) => (
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {row.DistrictName}
                    </button>
                ),
            },
            {
                key: "Block",
                label: "Block",
                render: (row: any) => (
                    <>
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/SublinkTaskView?linkId=${encodeURIComponent(String(row.LinkId))}`,
                            )
                        }
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {row.Block}
                    </button>
                    </>
                ),
            },
            { key: "Total", label: "Total" },
            ...tasks.flatMap((taskName) => [
                { key: `Completed_${taskName}`, label: `Completed` },
                { key: `Approved_${taskName}`, label: `Approved` },
            ]),
        ];
    }, [tasks, router]);

    const groups = useMemo(() => tasks.map((t) => ({ label: t, span: 2 })), [tasks]);

    return (
        <DrilldownTable
            title="Block"
            rows={rows}
            columns={columns}
            groups={groups}
            exportFileName="block-task-details.xlsx"
            loading={loading}
        />
    );
}

export default function LinkTaskViewPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <LinkTaskViewContent />
        </Suspense>
    );
}
