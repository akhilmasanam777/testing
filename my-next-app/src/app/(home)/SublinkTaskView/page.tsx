"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DrilldownTable } from "../TaskDahboard/_components/drilldown-table";

function SublinkTaskViewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const linkId = searchParams.get("linkId");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!linkId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`/api/taskdashboard/sublinktasks?id=${encodeURIComponent(linkId)}`)
            .then((res) => res.json())
            .then((res) => setData(Array.isArray(res) ? res : []))
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [linkId]);

    const tasks = useMemo(() => [...new Set(data.map((x) => x.TaskName))], [data]);

    const rows = useMemo(() => {
        const sublinkIds = [...new Set(data.map((x) => x.SublinkId))];

        return sublinkIds.map((sublinkId) => {
            const sublinkRows = data.filter((x) => x.SublinkId === sublinkId);
            const base = sublinkRows[0] || {};
            const row: any = {
                __key: sublinkId,
                LinkName: base.LinkName,
                SublinkId: base.SublinkId,
                SubLink: `${base.SubLinkCode || ""} / ${base.SublinkName || ""}`,
                Total: sublinkRows.reduce((sum, item) => sum + Number(item.Target || 0), 0),
            };

            tasks.forEach((taskName) => {
                const item = sublinkRows.find((x) => x.TaskName === taskName);
                row[`Completed_${taskName}`] = item?.TotalProgress ?? "-";
                row[`Approved_${taskName}`] = item?.TodayProgress ?? "-";
            });

            return row;
        });
    }, [data, tasks]);

    const columns = useMemo(() => {
        return [
            { key: "LinkName", label: "Link" },
            {
                key: "SubLink",
                label: "SubLink",
                render: (row: any) => (
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                `/TaskList?taskId=0&Link=0&Sublink=${encodeURIComponent(String(row.SublinkId))}`,
                            )
                        }
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {row.SubLink}
                    </button>
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
            title="SubLink Task Details"
            rows={rows}
            columns={columns}
            groups={groups}
            exportFileName="sublink-task-details.xlsx"
            loading={loading}
        />
    );
}

export default function SublinkTaskViewPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <SublinkTaskViewContent />
        </Suspense>
    );
}
