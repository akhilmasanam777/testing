"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";



function TaskListContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
const taskId = searchParams.get("taskId");
const link = searchParams.get("Link") || "0";
const sublink = searchParams.get("Sublink") || "0";


    const [data, setData] = useState<any[]>([]);
    const [columns, setColumns] = useState<any[]>([]);

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({
        key: "CompletedPercentage",
        direction: "desc",
    });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const filteredData = useMemo(() => {
        return data.filter((row) =>
            Object.values(row)
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase())
        );
    }, [data, search]);

    // SORT
    const sortedData = useMemo(() => {
        let arr = [...filteredData];

        if (sortConfig.key) {
            arr.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (aVal === null || aVal === undefined || aVal === "") return 1;
                if (bVal === null || bVal === undefined || bVal === "") return -1;

                const aNumber = Number(aVal);
                const bNumber = Number(bVal);
                const bothNumeric = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);

                if (bothNumeric) {
                    return sortConfig.direction === "asc"
                        ? aNumber - bNumber
                        : bNumber - aNumber;
                }

                if (typeof aVal === "string") {
                    return sortConfig.direction === "asc"
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                return 0;
            });
        }

        return arr;
    }, [filteredData, sortConfig]);

    // PAGINATION
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return sortedData.slice(start, start + rowsPerPage);
    }, [sortedData, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) pages.push(i);

        return pages;
    };


    // Only these columns will be shown
    const allowedColumns = [
        "PackageName",
        "LinkCode",
        "LinkName",
        "SubLinkCode",
        "SublinkName",
        "TaskName",
        "Name",
        "UOMName",
        "Target",
        "TotalProgress",
        "TodayProgress",
        "CompletedPercentage",
    ];

    useEffect(() => {
        if (!taskId) return;

        fetch(`/api/tasklist?taskId=${taskId}&Link=${link}&Sublink=${sublink}`)
            .then((res) => res.json())
            .then((res) => {
               console.log("this is the response", res);
                if (res && res.length > 0) {
                    // Filter only required columns
                    const dynamicCols = allowedColumns
                        .filter((key) => key in res[0] || key === "User") 
                        .map((key) => ({
                            key,
                            label: formatHeader(key),

                            isProgress: key === "CompletedPercentage",
                            isHighlight: key === "TaskName",


                            isEmpty: false,
                        }));

                    setColumns(dynamicCols);
                }

                setData(res || []);
            });
    }, [taskId, link, sublink]);

    // Format Header Names
    const formatHeader = (key: string) => {
        const customNames: any = {
            PackageName: "Package",
            LinkCode: "Block Code",
            LinkName: "Block",
            SubLinkCode: "Span Code",
            SublinkName: "Span Name",
            TaskName: "Task",
            Name: "User",
            UOMName: "UOM",
            Target: "Estimated",
            TotalProgress: "Completed",
            TodayProgress: "Approved",
            CompletedPercentage: "%",
        };

        return customNames[key] || key;
    };

    // ================= EXCEL =================
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "data.xlsx");
    };

    return (
        <div className="p-6">
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">
                    Task Details
                </h1>
            </div>

            {/* TOP */}
            <div className="flex justify-between mb-3">
                <button onClick={exportExcel} className="bg-primary text-white px-3 py-1 rounded">
                    Excel
                </button>

                <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border px-2 py-1 rounded"
                />
            </div>

            <div className="card-container">
                <Table className="table-main">
                    {/* Headers */}
                    <TableHeader>
                        <TableRow className="table-header-row">
                            {columns.map((col, index) => (
                                <TableHead
                                    onClick={() => {
                                        setSortConfig((prev) => ({
                                            key: col.key,
                                            direction:
                                                prev.key === col.key && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }));
                                    }}
                                    className="table-head cursor-pointer"
                                    key={index}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>{col.label}</span>

                                        {/* DEFAULT ICON */}
                                        {sortConfig.key !== col.key && (
                                            <FaSort className="text-gray-400" size={12} />
                                        )}

                                        {/* ASC */}
                                        {sortConfig.key === col.key && sortConfig.direction === "asc" && (
                                            <FaSortUp className="text-primary" size={12} />
                                        )}

                                        {/* DESC */}
                                        {sortConfig.key === col.key && sortConfig.direction === "desc" && (
                                            <FaSortDown className="text-primary" size={12} />
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    {/* Rows */}
                    <TableBody>
                        {sortedData.length > 0 ? (
                            paginatedData.map((item, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {columns.map((col, colIndex) => {
                                        let value = item[col.key];

                                        // Force empty for User & UOM
                                        if (col.isEmpty) {
                                            return <TableCell key={colIndex}></TableCell>;
                                        }

                                        // Progress
                                        if (col.isProgress) {
                                            const percent = value || 0;

                                            return (
                                                <TableCell key={colIndex}>
                                                    <div className="w-[90px]">
                                                        <div className="bg-gray-200 h-2 rounded">
                                                            <div
                                                                className="bg-yellow-500 h-2 rounded"
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                        <p className="text-[11px] mt-1 whitespace-nowrap">
                                                            {percent}% Completed
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        // Highlight Task
                                        if (col.isHighlight) {
                                            return (
                                                <TableCell key={colIndex}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/Timeline?Id=${encodeURIComponent(String(item.Id))}&SpanType=${encodeURIComponent(String(item.SpanType))}`
                                                            )
                                                        }
                                                        className="text-primary font-medium underline-offset-2 hover:underline"
                                                    >
                                                        {value}
                                                    </button>
                                                </TableCell>
                                            );
                                        }

                                        return <TableCell key={colIndex}>{value ?? "-"}</TableCell>;
                                    })}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={Math.max(columns.length, 1)} className="text-center">
                                    No Data Found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* PAGINATION */}
                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">

                        {/* LEFT TEXT */}
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedData.length)} of{" "}
                            {sortedData.length} entries
                        </p>

                        {/* RIGHT SIDE */}
                        <div className="flex items-center gap-1">

                            {/* PREVIOUS */}
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                className="px-3 py-1 border rounded-md text-sm 
  bg-white text-gray-700 
  hover:bg-primary hover:text-white 
  dark:bg-dark-2 dark:text-white dark:border-dark-3 
  dark:hover:bg-primary dark:hover:text-white"
                                disabled={currentPage === 1}
                            >
                                Previous
                            </button>

                            {/* FIRST PAGE */}
                            {currentPage > 3 && (
                                <>
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        className="px-3 py-1 border rounded-md text-sm"
                                    >
                                        1
                                    </button>
                                    <span className="px-2">...</span>
                                </>
                            )}

                            {/* MIDDLE PAGES */}
                            {getPageNumbers().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 border rounded-md text-sm
          ${currentPage === page
                                            ? "bg-primary text-white"
                                            : "hover:bg-primary hover:text-white"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            {/* LAST PAGE */}
                            {currentPage < totalPages - 2 && (
                                <>
                                    <span className="px-2">...</span>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="px-3 py-1 border rounded-md text-sm"
                                    >
                                        {totalPages}
                                    </button>
                                </>
                            )}

                            {/* NEXT */}
                            <button
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        p < totalPages ? p + 1 : p
                                    )
                                }
                                className="px-3 py-1 border rounded-md text-sm 
  bg-white text-gray-700 
  hover:bg-primary hover:text-white 
  dark:bg-dark-2 dark:text-white dark:border-dark-3 
  dark:hover:bg-primary dark:hover:text-white"
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </button>


                        </div>
                    </div>
                )}

            </div>

        </div>
    );
}

export default function TaskListPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <TaskListContent />
        </Suspense>
    );
}
