"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toTitleCase } from "@/utils/text";
import { useEffect, useState, Fragment } from "react";

type LengthData = {
    LinkId: number;
    LinkName: string;
    SublinkId: number;
    SublinkName: string;
    TaskName: string;
    LengthInMeters: number;
};

export default function LengthsPage() {
    const [data, setData] = useState<LengthData[]>([]);
    const [expandedLinks, setExpandedLinks] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/lengths");
            const result = await res.json();

            if (Array.isArray(result)) setData(result);
            else if (Array.isArray(result?.data)) setData(result.data);
            else setData([]);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const allTaskNames = [...new Set(data.map((x) => x.TaskName))];

    const groupedLinks = Object.values(
        data.reduce((acc: any, item) => {
            const key = `${item.LinkId}|${item.LinkName}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {})
    );

    const toggleLink = (linkId: number) => {
        setExpandedLinks((prev) =>
            prev.includes(linkId)
                ? prev.filter((id) => id !== linkId)
                : [...prev, linkId]
        );
    };

    const totals: any = {};
    data.forEach((x) => {
        totals[x.TaskName] = (totals[x.TaskName] || 0) + x.LengthInMeters;
    });

    const handleDownload = () => {
        window.open("/api/lengths/export", "_blank");
    };

    if (loading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container">

            {/* HEADER */}
            <div className="all-pages-header">
       
                <h1 className="dashboard-title-light">
                    {toTitleCase("📏 BLOCK / SPAN LENGTH DETAILS (KM)")}  
                </h1>

                <div className="dashboard-links">
                    <button onClick={handleDownload} className="btn-primary">
                        ⬇️ Download CSV
                    </button>
                </div>
            </div>

            {/* CARD */}
            <div className="card-container">

                <div className="table-wrapper">
                    <Table className="table-main">

                        {/* HEADER */}
                        <TableHeader>
                            <TableRow className="table-header-row">
                                <TableHead className="table-head">S.No</TableHead>
                                <TableHead className="table-head">Name</TableHead>

                                {allTaskNames.map((t) => (
                                    <TableHead key={t} className="table-head table-cell-right">
                                        {t}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        {/* BODY */}
                        <TableBody>
                            {groupedLinks.map((linkRows: any, index) => {
                                const link = linkRows[0];

                                const linkTotals: any = {};
                                linkRows.forEach((r: any) => {
                                    linkTotals[r.TaskName] =
                                        (linkTotals[r.TaskName] || 0) + r.LengthInMeters;
                                });

                                const sublinks = Object.values(
                                    linkRows.reduce((acc: any, item: any) => {
                                        const key = `${item.SublinkId}|${item.SublinkName}`;
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(item);
                                        return acc;
                                    }, {})
                                );

                                const isExpanded = expandedLinks.includes(link.LinkId);

                                return (
                                    <Fragment key={link.LinkId}>
                                        {/* LINK */}
                                        <TableRow
                                            className="table-row"
                                            onClick={() => toggleLink(link.LinkId)}
                                        >
                                            <TableCell>{index + 1}</TableCell>

                                            <TableCell>
                                                {isExpanded ? "▼" : "▶"} 🔗{" "}
                                                <strong>{link.LinkName}</strong>
                                            </TableCell>

                                            {allTaskNames.map((t) => (
                                                <TableCell key={t} className="table-cell-right">
                                                    {linkTotals[t]?.toFixed(2) || "-"}
                                                </TableCell>
                                            ))}
                                        </TableRow>

                                        {/* SUBLINK */}
                                        {isExpanded &&
                                            sublinks.map((subRows: any, i) => {
                                                const sub = subRows[0];

                                                const subTotals: any = {};
                                                subRows.forEach((r: any) => {
                                                    subTotals[r.TaskName] =
                                                        (subTotals[r.TaskName] || 0) +
                                                        r.LengthInMeters;
                                                });

                                                return (
                                                    <TableRow
                                                        key={`${link.LinkId}-${i}`}
                                                        className="table-subrow"
                                                    >
                                                        <TableCell></TableCell>

                                                        <TableCell className="pl-8">
                                                            {i + 1} 📄 {sub.SublinkName}
                                                        </TableCell>

                                                        {allTaskNames.map((t) => (
                                                            <TableCell key={t} className="table-cell-right">
                                                                {subTotals[t]?.toFixed(2) || "-"}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                );
                                            })}
                                    </Fragment>
                                );
                            })}

                            {/* TOTAL */}
                            <TableRow className="table-total-row">
                                <TableCell></TableCell>
                                <TableCell>Totals</TableCell>

                                {allTaskNames.map((t) => (
                                    <TableCell key={t} className="table-cell-right">
                                        {totals[t]?.toFixed(2) || "-"}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>

                    </Table>
                </div>
            </div>
        </div>
    );
}