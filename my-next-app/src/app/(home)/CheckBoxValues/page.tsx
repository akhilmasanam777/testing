"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import * as XLSX from "xlsx";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

export default function TaskListPage() {
    const [data, setData] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [id, setId] = useState(0);

    const [permissions, setPermissions] = useState({
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
    });

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({
        key: "",
        direction: "asc",
    });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => {
        loadPermissions();
        loadData();
    }, []);

    async function loadPermissions() {
        const res = await fetch(
            "/api/permissions?controller=CheckBoxValues&action=Index"
        );

        const data = await res.json();

        setPermissions({
            CanRead: data.CanRead,
            CanUpdate: data.CanUpdate,
            CanDelete: data.CanDelete,
        });
    }

    async function loadData() {
        const res = await fetch("/api/checkboxvalues");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
    }

    // ================= CRUD =================
    async function handleDelete(id: number) {
        if (!confirm("Are you sure?")) return;

        await fetch(`/api/checkboxvalues?id=${id}`, {
            method: "DELETE",
        });

        loadData();
    }

    async function handleEdit(item: any) {
        const res = await fetch(`/api/checkboxvalues?id=${item.Id}`);
        const json = await res.json();

        setId(json.Id);
        setName(json.Name);
        setOpen(true);
    }

    function handleAdd() {
        setId(0);
        setName("");
        setOpen(true);
    }

    async function handleSave() {
        await fetch("/api/checkboxvalues", {
            method: "POST",
            body: JSON.stringify({
                Id: id,
                Name: name,
            }),
        });

        setOpen(false);
        loadData();
    }

    // ================= DYNAMIC COLUMNS =================
    const columns = useMemo(() => {
        if (data.length === 0) return [];

        return ["Name"];
    }, [data]);

    // ================= SEARCH =================
    const filteredData = useMemo(() => {
        return data.filter((row) =>
            columns.some((col) =>
                String(row[col] || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            )
        );
    }, [data, search, columns]);

    // ================= SORT =================
    const sortedData = useMemo(() => {
        let arr = [...filteredData];

        if (sortConfig.key) {
            arr.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                if (!aVal) return 1;
                if (!bVal) return -1;

                return sortConfig.direction === "asc"
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }

        return arr;
    }, [filteredData, sortConfig]);

    // ================= PAGINATION =================
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
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "data.xlsx");
    };

    if (!permissions.CanRead) {
        return <p className="text-red-500">Access Denied</p>;
    }

    return (
        <div className="page-container">

            <div className="all-pages-header">

                {/* LEFT SIDE */}
                <h1 className="dashboard-title-light">
                    Check Box Values
                </h1>

                {/* RIGHT SIDE BUTTON */}
                {permissions.CanUpdate && (
                    <button
                        onClick={handleAdd}
                        className="btn-primary-export"
                    >
                        <span className="text-lg">+</span>
                        Add
                    </button>
                )}

            </div>

            {/* TOP */}
            <div className="flex justify-between mb-3">
                <button onClick={exportExcel} className="btn-primary-export">
                    Excel
                </button>


                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-dark dark:text-white">Search:</label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm
                                focus:border-primary focus:outline-none
                                dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="card-container">

                <Table className="table-main">

                    {/* HEADER */}
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead className="table-head">S.No</TableHead>
                            {/* NAME COLUMN */}
                            <TableHead
                                className="table-head cursor-pointer"
                                onClick={() =>
                                    setSortConfig((prev) => ({
                                        key: "Name",
                                        direction:
                                            prev.key === "Name" && prev.direction === "asc"
                                                ? "desc"
                                                : "asc",
                                    }))
                                }
                            >
                                <div className="flex items-center gap-1">
                                    <span>Name</span>

                                    {sortConfig.key !== "Name" && (
                                        <FaSort className="text-gray-400" size={12} />
                                    )}

                                    {sortConfig.key === "Name" &&
                                        sortConfig.direction === "asc" && (
                                            <FaSortUp className="text-primary" size={12} />
                                        )}

                                    {sortConfig.key === "Name" &&
                                        sortConfig.direction === "desc" && (
                                            <FaSortDown className="text-primary" size={12} />
                                        )}
                                </div>
                            </TableHead>

                            {/* ACTION COLUMN */}
                            <TableHead className="table-head text-right pr-6">
                                Action
                            </TableHead>

                        </TableRow>
                    </TableHeader>

                    {/* BODY */}
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, index) => (
                                <TableRow key={item.Id}>
                                    <TableCell>
                                        {(currentPage - 1) * rowsPerPage + index + 1}
                                    </TableCell>
                                    {/* NAME */}
                                    <TableCell>{item.Name}</TableCell>

                                    {/* ACTION */}
                                    <TableCell className="text-right space-x-4 pr-6">

                                        {permissions.CanUpdate && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-gray-500 hover:text-blue-600"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {permissions.CanDelete && (
                                            <button
                                                onClick={() => handleDelete(item.Id)}
                                                className="text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}

                                    </TableCell>

                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center">
                                    No Data Found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                </Table>

                {/* PAGINATION (Same as your old design) */}
                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">

                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedData.length)} of{" "}
                            {sortedData.length} entries
                        </p>

                        <div className="flex items-center gap-1">

                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Previous
                            </button>

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

                            <button
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        p < totalPages ? p + 1 : p
                                    )
                                }
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Next
                            </button>

                        </div>
                    </div>
                )}

            </div>

            {/* MODAL */}
            {open && (
                <div className="modal-overlay">

                    <div className="modal-box">


                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">
                                Check Box Value
                            </h2>

                            <button onClick={() => setOpen(false)}>
                                <X />
                            </button>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium">
                                Check Box Value
                            </label>

                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-box"
                                placeholder="Check Box Value"
                            />
                        </div>


                        <div className="btn-group">
                            <button
                                onClick={() => setOpen(false)}
                                className="btn-secondary"

                            >
                                Go To CheckBox Values
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"

                                >
                                    Submit Details
                                </button>

                                <button
                                    onClick={() => setName("")}
                                    className="btn-secondary"

                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}