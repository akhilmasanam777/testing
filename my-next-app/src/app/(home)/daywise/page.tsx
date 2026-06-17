"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import DatePickerOne from "@/components/FormElements/DatePicker/DatePickerOne";

type ReportData = {
    columns: string[];
    rows: any[][];
};

export default function DayWisePage() {
    const today = new Date().toISOString().split("T")[0];

    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!fromDate || !toDate) {
            alert("Select Date");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(
                `/api/taskwise?fromDate=${fromDate}&toDate=${toDate}`
            );

            const result = await res.json();
            setData(result);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {/* TITLE */}

            <div className="all-pages-header">
                <h1 className="dashboard-title-light">
                    Task Wise Report
                </h1>
            </div>

            {/* DATE FILTER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                {/* START DATE */}
                <DatePickerOne
                    label="Start Date"
                    value={fromDate}
                    onChange={setFromDate}
                />

                {/* END DATE */}
                <DatePickerOne
                    label="End Date"
                    value={toDate}
                    onChange={setToDate}
                />

                {/* BUTTON */}
                <div className="flex items-end">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-primary text-white py-3 rounded-[7px] hover:bg-opacity-90"
                    >
                        Submit
                    </button>
                </div>
            </div>

            {/* LOADING */}
            {loading && (
                <div className="text-center py-6 font-medium">
                    Loading Please Wait...
                </div>
            )}

            {/* TABLE */}
            {!loading && data && data.rows?.length > 0 && (
                <div className="card-container">

                    <Table className="table-main">

                        {/* HEADER */}
                        <TableHeader>
                            <TableRow className="table-header-row">
                                {data.columns.map((col, index) => {
                                    if (col.includes("Survey (Nos)")) {
                                        col = col.replace(
                                            "Survey (Nos)",
                                            "Physical Survey (Nos)"
                                        );
                                    }
                                    return <TableHead key={index}>{col}</TableHead>;
                                })}
                            </TableRow>
                        </TableHeader>

                        {/* BODY */}
                        <TableBody>
                            {data.rows.map((row, i) => {
                                const isTotalRow =
                                    String(row[0]).toUpperCase() === "TOTAL";

                                return (
                                    <TableRow
                                        key={i}
                                        className={
                                            isTotalRow
                                                ? "font-bold bg-[#F7F9FC] dark:bg-dark-2 dark:text-white"
                                                : ""
                                        }
                                    >
                                        {row.map((cell: any, j: number) => (
                                            <TableCell key={j}>
                                                {cell ?? ""}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                </div>
            )}

            {/* NO DATA */}
            {!loading && data && data.rows?.length === 0 && (
                <p>No records found.</p>
            )}
        </div>
    );
}