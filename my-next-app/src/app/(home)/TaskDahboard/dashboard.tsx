"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import * as XLSX from "xlsx";
import { UsedDevicesChart } from "@/components/Charts/used-devices";
import { useRouter } from "next/navigation";
import { MonthwiseOverview } from "@/components/Charts/payments-overview";
import { BASE_URL } from "@/config/api";
import { Bell } from "lucide-react";
import { toTitleCase } from "@/utils/text";

type PackageWiseRow = {
    PackageId: string | number;
    PackageName: string;
    TaskId: string | number;
    TaskName: string;
    UOM: string;
    Target: string | number;
    TotalProgress: string | number;
    TodayProgress: string | number;
};

type DropdownOption = {
    Value: string | number;
    Text: string;
};

export default function TaskDashboard({ data }: { data: PackageWiseRow[] }) {

    const router = useRouter();

    const [taskId, setTaskId] = useState("");
    const [taskList, setTaskList] = useState<DropdownOption[]>([]);
    const [pendingCount, setPendingCount] = useState(0);

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const [sortConfig, setSortConfig] = useState({
        key: "TaskName",
        direction: "asc",
    });


    // ================= LOAD TASK DROPDOWN =================
    useEffect(() => {
        loadTasks();
        loadPendingCount();
    }, []);

    const getToken = () =>
        document.cookie
            .split("; ")
            .find((row) => row.startsWith("token="))
            ?.split("=")[1];

    const loadTasks = async () => {
        try {
            const token = getToken();

            const res = await fetch(`${BASE_URL}/api/dropdowns/GetTaskChart`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const json: DropdownOption[] = await res.json();
            const safeTasks = Array.isArray(json) ? json : [];

            setTaskList(safeTasks);

            if (safeTasks.length > 0) {
                setTaskId(String(safeTasks[0].Value));
            }
        } catch (error) {
            console.error("Failed to load task dropdown", error);
        }
    };

    const loadPendingCount = async () => {
        try {
            const token = getToken();

            const res = await fetch(`${BASE_URL}/Web/dashboard/pendingcount`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const count = await res.json();
            setPendingCount(Number(count ?? 0));
        } catch (error) {
            console.error("Failed to load pending count", error);
            setPendingCount(0);
        }
    };

    // ================= TABLE LOGIC =================
    const packages = [...new Set(data.map((x) => x.PackageId))];
    const tasks = [...new Set(data.map((x) => x.TaskName))];

    const tableData = useMemo(() => {
        return tasks.map((task) => {
            const rows = data.filter((x) => x.TaskName === task);
            const anyRow = rows[0];

            let row: any = {
                TaskName: task,
                UOM: anyRow?.UOM,
                TaskId: anyRow?.TaskId,
            };

            packages.forEach((pid) => {
                const item = data.find(
                    (x) => x.PackageId === pid && x.TaskName === task
                );

                row[`Target_${pid}`] = item?.Target ?? 0;
                row[`Progress_${pid}`] = item?.TotalProgress ?? 0;
                row[`Today_${pid}`] = item?.TodayProgress ?? 0;
            });

            row.TotalTarget = rows.reduce((a, b) => a + Number(b.Target || 0), 0);
            row.TotalProgress = rows.reduce((a, b) => a + Number(b.TotalProgress || 0), 0);
            row.TotalToday = rows.reduce((a, b) => a + Number(b.TodayProgress || 0), 0);

            return row;
        });
    }, [data]);

    const filteredData = useMemo(() => {
        return tableData.filter((row) =>
            Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase())
        );
    }, [tableData, search]);

    // SORT
    const sortedData = useMemo(() => {
        let arr = [...filteredData];

        if (sortConfig.key) {
            arr.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (aVal === null || aVal === undefined || aVal === "") return 1;
                if (bVal === null || bVal === undefined || bVal === "") return -1;

                if (typeof aVal === "string") {
                    return sortConfig.direction === "asc"
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                return sortConfig.direction === "asc"
                    ? aVal - bVal
                    : bVal - aVal;
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


    // ================= EXCEL =================
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tableData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Package Details");
        XLSX.writeFile(wb, "package-details.xlsx");
    };


    return (
        <div className="p-5">

            <div className="all-pages-header">
                <h1 className="dashboard-title-light">
                    Package Details
                </h1>

                <button
                    type="button"
                    onClick={() => router.push("/PendingAprovals")}
                    className="relative inline-flex size-11 items-center justify-center rounded-full border border-stroke bg-white text-dark shadow-sm hover:text-primary dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                    aria-label="Pending approvals"
                    title="Pending approvals"
                >
                    <Bell className="size-5" aria-hidden="true" />
                    <span className="absolute -right-1 -top-1 min-w-6 rounded-full bg-red-light px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                        {pendingCount}
                    </span>
                </button>
            </div>

            {/* TOP */}
            <div className="flex justify-between mb-3">
                <button onClick={exportExcel} className="bg-primary text-white px-3 py-1 rounded">
                    Excel
                </button>

                {/* <label >Search:</label> */}
                <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border px-2 py-1 rounded"
                />
            </div>

            {/* TABLE */}
            <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 
dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">

                <div className="overflow-x-auto w-full">
                    <Table className="min-w-max table-auto">

                        <TableHeader>

                            {/* HEADER 1 */}
                            {/* <TableRow className="!bg-[#2AAE95] text-white"> */}
                            <TableRow className="
        border-none 
        bg-[#F7F9FC] 
        dark:bg-dark-2 
        [&>th]:py-4 
        [&>th]:text-base 
        [&>th]:text-dark 
        [&>th]:dark:text-white
      ">
                                <TableHead
                                    rowSpan={2}
                                    onClick={() =>
                                        setSortConfig((prev) => ({
                                            key: "TaskName",
                                            direction:
                                                prev.key === "TaskName" && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }))
                                    }
                                // className="cursor-pointer !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                >
                                    <div className="flex items-center gap-1">
                                        Task Name
                                        {sortConfig.key !== "TaskName" && <FaSort size={12} />}
                                        {sortConfig.key === "TaskName" &&
                                            (sortConfig.direction === "asc" ? (
                                                <FaSortUp size={12} />
                                            ) : (
                                                <FaSortDown size={12} />
                                            ))}
                                    </div>
                                </TableHead>

                                <TableHead
                                    rowSpan={2}
                                    onClick={() =>
                                        setSortConfig((prev) => ({
                                            key: "UOM",
                                            direction:
                                                prev.key === "UOM" && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }))
                                    }
                                // className="cursor-pointer !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                >
                                    <div className="flex items-center gap-1">
                                        Uom
                                        {sortConfig.key !== "UOM" && <FaSort size={12} />}
                                        {sortConfig.key === "UOM" &&
                                            (sortConfig.direction === "asc" ? (
                                                <FaSortUp size={12} />
                                            ) : (
                                                <FaSortDown size={12} />
                                            ))}
                                    </div>
                                </TableHead>

                                {packages.map((pid) => {
                                    const pkg = data.find((x) => x.PackageId === pid);
                                    return (

                                        <TableHead
                                            key={pid}
                                            colSpan={3}
                                        // className="text-center !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(`/ZoneTaskView?packId=${encodeURIComponent(String(pid))}`)
                                                }
                                                className="text-left font-medium text-primary underline-offset-2 hover:underline"
                                            >
                                               {toTitleCase(pkg?.PackageName || "")}
                                            </button>
                                        </TableHead>
                                    );
                                })}

                                <TableHead
                                    colSpan={3}
                                // className="text-center !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                >
                                    Cumulative
                                </TableHead>

                            </TableRow>

                            {/* HEADER 2 */}
                            <TableRow
                            // className="!bg-[#2AAE95] text-white"
                            >

                                {packages.map((pid) => (
                                    <React.Fragment key={pid}>
                                        {[
                                            { key: `Target_${pid}`, label: "Estimated" },
                                            { key: `Progress_${pid}`, label: "Completed" },
                                            { key: `Today_${pid}`, label: "Approved" },
                                        ].map((col) => (
                                            <TableHead
                                                key={col.key}
                                                onClick={() =>
                                                    setSortConfig((prev) => ({
                                                        key: col.key,
                                                        direction:
                                                            prev.key === col.key && prev.direction === "asc"
                                                                ? "desc"
                                                                : "asc",
                                                    }))
                                                }
                                            // className="cursor-pointer !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    {sortConfig.key !== col.key && <FaSort size={12} />}
                                                    {sortConfig.key === col.key &&
                                                        (sortConfig.direction === "asc" ? (
                                                            <FaSortUp size={12} />
                                                        ) : (
                                                            <FaSortDown size={12} />
                                                        ))}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </React.Fragment>
                                ))}

                                {[
                                    { key: "TotalTarget", label: "Estimated" },
                                    { key: "TotalProgress", label: "Completed" },
                                    { key: "TotalToday", label: "Approved" },
                                ].map((col) => (
                                    <TableHead
                                        key={col.key}
                                        onClick={() =>
                                            setSortConfig((prev) => ({
                                                key: col.key,
                                                direction:
                                                    prev.key === col.key && prev.direction === "asc"
                                                        ? "desc"
                                                        : "asc",
                                            }))
                                        }
                                    // className="cursor-pointer !bg-[#2AAE95] hover:!bg-[#249e87] !text-white"
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortConfig.key !== col.key && <FaSort size={12} />}
                                            {sortConfig.key === col.key &&
                                                (sortConfig.direction === "asc" ? (
                                                    <FaSortUp size={12} />
                                                ) : (
                                                    <FaSortDown size={12} />
                                                ))}
                                        </div>
                                    </TableHead>
                                ))}

                            </TableRow>

                        </TableHeader>

                        <TableBody>
                            {paginatedData.length > 0 ? (
                                paginatedData.map((row, i) => (
                                    <TableRow key={row.TaskId || i}>
                                        <TableCell
                                            className="text-blue-600 cursor-pointer underline"
                                            onClick={() => {
                                                if (!row.TaskId) {
                                                    alert("TaskId missing");
                                                    return;
                                                }

                                                router.push(
                                                    `/TaskList?taskId=${encodeURIComponent(String(row.TaskId))}&Link=0&Sublink=0`
                                                );
                                            }}
                                        >
                                            {row.TaskName}
                                        </TableCell>

                                        <TableCell>{row.UOM}</TableCell>

                                        {packages.map((pid) => (
                                            <React.Fragment key={pid}>
                                                <TableCell>{row[`Target_${pid}`]}</TableCell>
                                                <TableCell>{row[`Progress_${pid}`]}</TableCell>
                                                <TableCell>{row[`Today_${pid}`]}</TableCell>
                                            </React.Fragment>
                                        ))}

                                        <TableCell>{row.TotalTarget}</TableCell>
                                        <TableCell>{row.TotalProgress}</TableCell>
                                        <TableCell>{row.TotalToday}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={packages.length * 3 + 5}
                                        className="text-center text-dark-5 dark:text-dark-6"
                                    >
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

            <div className="mt-6">
                <div className="grid grid-cols-12 gap-6 ">

                    {/* PIE CARD */}
                    <div className="col-span-12 xl:col-span-6 
    bg-white dark:bg-[#1f2937] 
    p-5 rounded-xl shadow 
    relative text-gray-900 dark:text-white">

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            {/* DROPDOWN INSIDE CARD */}
                            <select
                                value={taskId}
                                onChange={(e) => setTaskId(e.target.value)}
                                className="absolute right-5 border px-2 py-1 rounded 
               bg-white dark:bg-[#374151] 
               text-black dark:text-white"
                            >
                                <option value="">--- Select Task ---</option>
                                {taskList.map((t) => (
                                    <option key={t.Value} value={t.Value}>
                                        {t.Text}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* PIE CHART */}
                        <UsedDevicesChart
                            taskId={taskId}
                            taskName="Package Wise Report Last 30 Days"
                            className="col-span-12 xl:col-span-6"
                        />
                    </div>


                    {/* ================= LINE CARD ================= */}

                    <div className="col-span-12 xl:col-span-6 
    bg-white dark:bg-[#1f2937] 
    p-5 rounded-xl shadow 
    relative text-gray-900 dark:text-white">
                        <MonthwiseOverview
                            taskId={taskId}
                            taskName="Month Wise Progress"
                            className="col-span-12 xl:col-span-6"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
