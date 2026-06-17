"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type SortConfig = {
    key: string;
    direction: "asc" | "desc";
};

type DrilldownColumn = {
    key: string;
    label: React.ReactNode;
    sortable?: boolean;
    className?: string;
    render?: (row: any) => React.ReactNode;
};

type DrilldownTableProps = {
    title: string;
    rows: any[];
    columns: DrilldownColumn[];
    exportFileName: string;
    loading?: boolean;
    initialSort?: SortConfig;
    groups?: { label: React.ReactNode; span: number }[];
};

function compareValues(aVal: any, bVal: any, direction: "asc" | "desc") {
    if (aVal === null || aVal === undefined || aVal === "") return 1;
    if (bVal === null || bVal === undefined || bVal === "") return -1;

    const aNumber = Number(aVal);
    const bNumber = Number(bVal);
    const bothNumeric = !Number.isNaN(aNumber) && !Number.isNaN(bNumber);

    if (bothNumeric) {
        return direction === "asc" ? aNumber - bNumber : bNumber - aNumber;
    }

    return direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
}

export function DrilldownTable({
    title,
    rows,
    columns,
    exportFileName,
    loading = false,
    initialSort = { key: "", direction: "asc" },
    groups = [],
}: DrilldownTableProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);
    const rowsPerPage = 10;

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase();
        return rows.filter((row) =>
            Object.values(row).join(" ").toLowerCase().includes(q),
        );
    }, [rows, search]);

    const sortedRows = useMemo(() => {
        const nextRows = [...filteredRows];

        if (sortConfig.key) {
            nextRows.sort((a, b) =>
                compareValues(a[sortConfig.key], b[sortConfig.key], sortConfig.direction),
            );
        }

        return nextRows;
    }, [filteredRows, sortConfig]);

    const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
    const paginatedRows = sortedRows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage,
    );

    const pageNumbers = useMemo(() => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i += 1) pages.push(i);
        return pages;
    }, [currentPage, totalPages]);

    const onSearch = (value: string) => {
        setSearch(value);
        setCurrentPage(1);
    };

    const toggleSort = (key: string) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
        setCurrentPage(1);
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(sortedRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title);
        XLSX.writeFile(wb, exportFileName);
    };

    return (
        <div className="p-6">
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">{title}</h1>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded border px-3 py-1 text-sm text-dark hover:bg-gray-2 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                >
                    Back
                </button>
            </div>

            <div className="mb-3 flex justify-between gap-3">
                <button
                    type="button"
                    onClick={exportExcel}
                    className="rounded bg-primary px-3 py-1 text-white"
                    disabled={rows.length === 0}
                >
                    Excel
                </button>

                <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    className="rounded border px-2 py-1 dark:border-dark-3 dark:bg-dark-2"
                />
            </div>

            <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
                <div className="overflow-x-auto">
                    <Table className="min-w-max table-auto">
                        <TableHeader>
                            {groups && groups.length > 0 ? (
                                <>

                                <TableRow>
                                    <TableHead colSpan={3}></TableHead>
                                    {groups.map((g, i) => (
                                            <TableHead key={`group-${i}`} colSpan={g.span} className="text-left">
                                                {g.label}
                                            </TableHead>
                                        ))}
                                </TableRow>

                                    <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
                                        {/** first row: fixed columns with rowspan and group headers **/}
                                        {(() => {
                                            const totalGroupCols = groups.reduce((s, g) => s + g.span, 0);
                                            const fixedCount = Math.max(0, columns.length - totalGroupCols);
                                            return columns.slice(0, fixedCount).map((column) => (
                                 
                                                <TableHead
                                                    key={column.key}
                                                    rowSpan={2}
                                                    className={column.sortable === false ? "" : "cursor-pointer"}
                                                    onClick={() =>
                                                        column.sortable === false ? undefined : toggleSort(column.key)
                                                    }
                                                >
                                                    <div className="flex items-center gap-1">

                                                        {column.label}
                                                        {column.sortable !== false && (
                                                            <>
                                                                {sortConfig.key !== column.key && <FaSort size={12} />}
                                                                {sortConfig.key === column.key &&
                                                                    (sortConfig.direction === "asc" ? (
                                                                        <FaSortUp size={12} />
                                                                    ) : (
                                                                        <FaSortDown size={12} />
                                                                    ))}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableHead>
                                            ));
                                        })()}
                                            
                                        
                                    </TableRow>

                                    <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
                                        {/** second row: render the grouped sub-column headers **/}
                                        {(() => {
                                            const totalGroupCols = groups.reduce((s, g) => s + g.span, 0);
                                            const fixedCount = Math.max(0, columns.length - totalGroupCols);
                                            return columns.slice(fixedCount).map((column) => (
                                                <TableHead
                                                    key={column.key}
                                                    className={column.sortable === false ? "" : "cursor-pointer"}
                                                    onClick={() =>
                                                        column.sortable === false ? undefined : toggleSort(column.key)
                                                    }
                                                >
                                                    <div className="flex items-center gap-1 bg-white">
                                                        {column.label}
                                                        {column.sortable !== false && (
                                                            <>
                                                                {sortConfig.key !== column.key && <FaSort size={12} />}
                                                                {sortConfig.key === column.key &&
                                                                    (sortConfig.direction === "asc" ? (
                                                                        <FaSortUp size={12} />
                                                                    ) : (
                                                                        <FaSortDown size={12} />
                                                                    ))}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableHead>
                                            ));
                                        })()}
                                    </TableRow>
                                </>
                            ) : (
                                <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
                                    {columns.map((column) => (
                                        <TableHead
                                            key={column.key}
                                            className={column.sortable === false ? "" : "cursor-pointer"}
                                            onClick={() =>
                                                column.sortable === false ? undefined : toggleSort(column.key)
                                            }
                                        >
                                            <div className="flex items-center gap-1">
                                                {column.label}
                                                {column.sortable !== false && (
                                                    <>
                                                        {sortConfig.key !== column.key && <FaSort size={12} />}
                                                        {sortConfig.key === column.key &&
                                                            (sortConfig.direction === "asc" ? (
                                                                <FaSortUp size={12} />
                                                            ) : (
                                                                <FaSortDown size={12} />
                                                            ))}
                                                    </>
                                                )}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            )}
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : paginatedRows.length > 0 ? (
                                paginatedRows.map((row, rowIndex) => (
                                    <TableRow key={row.__key || rowIndex}>
                                        {columns.map((column) => (
                                            <TableCell key={column.key} className={column.className}>
                                                {column.render ? column.render(row) : row[column.key] ?? "-"}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="text-center">
                                        No Data Found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {sortedRows.length > 0 && (
                    <div className="mt-4 flex items-center justify-between px-2">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedRows.length)} of{" "}
                            {sortedRows.length} entries
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-md border bg-white px-3 py-1 text-sm text-gray-700 hover:bg-primary hover:text-white disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                            >
                                Previous
                            </button>

                            {pageNumbers.map((page) => (
                                <button
                                    type="button"
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`rounded-md border px-3 py-1 text-sm ${
                                        currentPage === page
                                            ? "bg-primary text-white"
                                            : "hover:bg-primary hover:text-white"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentPage((p) => (p < totalPages ? p + 1 : p))
                                }
                                disabled={currentPage === totalPages}
                                className="rounded-md border bg-white px-3 py-1 text-sm text-gray-700 hover:bg-primary hover:text-white disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
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

export function ProgressCell({ value }: { value: string | number }) {
    const percent = Math.max(0, Math.min(100, Number(value || 0)));

    return (
        <div className="w-[120px]">
            <div className="h-2 rounded bg-gray-200 dark:bg-dark-3">
                <div
                    className="h-2 rounded bg-yellow-500"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="mt-1 whitespace-nowrap text-[11px]">
                {String(value ?? 0).padStart(2, "0")} % Completed
            </p>
        </div>
    );
}
