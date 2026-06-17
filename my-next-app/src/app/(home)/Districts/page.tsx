"use client";

import { useEffect, useMemo, useState } from "react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { Pencil, Trash2, X } from "lucide-react";

type Zone = {
    DistrictId: number;
    DistrictName: string;
    DistrictCode: string;
    ZoneName: string;
    ZoneId: number;
    PackageName: string
};

type Package = {
    Value: string;
    Text: string;
};

export default function DistrictsPage() {
    const [districts, setDistricts] = useState<Zone[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [permissions, setPermissions] = useState({
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
    });

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{
       key: keyof Zone | "";
       direction: "asc" | "desc";
    } >({
        key: "",
        direction: "asc",
    });

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;


    const [form, setForm] = useState({
        Id: 0,
        Name: "",
        Code: "",
        ZoneId: "",
    });

    function resetForm() {
        setForm({
            Id: 0,
            Name: "",
            Code: "",
            ZoneId: "",
        });
    }

    // ================= LOAD =================
    async function loadDistricts() {
        try {
            setLoading(true);

            const res = await fetch("/api/districts");

            if (!res.ok) {
                console.error("API Error:", res.status);
                return;
            }

            const data = await res.json();
            setDistricts(Array.isArray(data) ? data : []);

        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadPackages() {
        const res = await fetch(
            "https://bnpapp.traxion.in/api/dropdowns/GetZones?id=0&id2=0"
        );
        const data = await res.json();
        setPackages(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        loadDistricts();
        loadPackages();

    }, []);

    // ================= ADD =================
    function handleAdd() {
        setForm({ Id: 0, Name: "", Code: "", ZoneId: "" });
        setOpen(true);
    }

    // ================= EDIT =================
    async function handleEdit(id: number) {
        const res = await fetch(`/api/districts?id=${id}`);
        const data = await res.json();

        setForm({
            Id: data.DistrictId,
            Name: data.DistrictName,
            Code: data.DistrictCode,
            ZoneId: String(data.ZoneId),
        });
        setOpen(true);
    }

    // ================= DELETE =================
    async function handleDelete(id: number) {
        if (!confirm("Delete this item?")) return;

        const res = await fetch(`/api/districts?id=${id}`, {
            method: "DELETE",
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Delete failed");
            return;
        }

        loadDistricts();
    }

    // ================= SAVE =================
    async function handleSave() {
        await fetch("/api/districts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                DistrictId: form.Id,
                DistrictName: form.Name,
                DistrictCode: form.Code,
                ZoneId: Number(form.ZoneId),
            }),
        });

        setOpen(false);
        loadDistricts();
    }

    if (!permissions.CanRead) {
        return <p className="text-red-500">Access Denied</p>;
    }

    const columns =
        districts.length > 0
            ? (Object.keys(districts[0]) as (keyof Zone)[]).filter(
                (key) =>
                    key !== "ZoneId" &&
                    key !== "DistrictId" && key != "PackageName"
            )
            : [];


    const filteredData = useMemo(() => {
        return districts.filter((row) =>
            columns.some((col) =>
                String(row[col as keyof Zone] || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            )
        );
    }, [districts, search, columns]);

    // ================= SORT =================
    const sortedData = useMemo(() => {
        let arr = [...filteredData];
  
        if (sortConfig.key) {
            arr.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof Zone];
                const bVal = b[sortConfig.key as keyof Zone];

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

    // ─── Exports ──────────────────────────────────────────────────────────────

    const exportCSV = () => {
        const csv = districts.map((row) => Object.values(row).join(",")).join("\n");
        saveAs(new Blob([csv]), "gp-data.csv");
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(districts);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "gp-data.xlsx");
    };

    const exportPDF = () => {
        const doc = new jsPDF();

        autoTable(doc, {
            head: [Object.keys(districts[0] || {})],
            body: districts.map((row) => Object.values(row)),
        });

        doc.save("gp-data.pdf");
    };

    const copyData = () => {
        navigator.clipboard.writeText(JSON.stringify(districts, null, 2));
        alert("Copied!");
    };

    return (
        <div className="page-container">

            <div className="all-pages-header">

                {/* LEFT SIDE */}
                <h1 className="dashboard-title-light">
                    Districts
                </h1>

                {/* RIGHT SIDE BUTTON */}
                {permissions.CanUpdate && (
                    <button
                        onClick={handleAdd}
                        className="btn-primary-export"
                    >
                        <span className="text-lg">+</span>
                        Add District
                    </button>
                )}
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "Copy", action: copyData },
                        { label: "CSV", action: exportCSV },
                        { label: "Excel", action: exportExcel },
                        { label: "PDF", action: exportPDF },
                        { label: "Print", action: () => window.print() },
                    ].map((btn) => (
                        <button
                            key={btn.label}
                            onClick={btn.action}
                            className="btn-primary-export"
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Right: Search + Add */}
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
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead className="table-head">S.No</TableHead>
                            {columns.map((col) => (
                                <TableHead
                                    className="table-head cursor-pointer"
                                    key={col}
                                    onClick={() => {
                                        setSortConfig((prev) => ({
                                            key: col,
                                            direction:
                                                prev.key === col && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }));
                                    }}
                                >

                                    <div className="flex items-center gap-1">
                                        {col}

                                        {sortConfig.key !== col && (
                                            <FaSort className="text-gray-400" size={12} />
                                        )}

                                        {sortConfig.key === col &&
                                            sortConfig.direction === "asc" && (
                                                <FaSortUp className="text-primary" size={12} />
                                            )}

                                        {sortConfig.key === col &&
                                            sortConfig.direction === "desc" && (
                                                <FaSortDown className="text-primary" size={12} />
                                            )}
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="table-head">Action</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, index) => (
                                <TableRow key={row.DistrictId}>
                                    <TableCell>
                                        {(currentPage - 1) * rowsPerPage + index + 1}
                                    </TableCell>
                                    {columns.map((col) => (
                                        <TableCell key={col}>
                                            {String(row[col as keyof Zone])}
                                        </TableCell>
                                    ))}

                                    <TableCell>

                                        {permissions.CanUpdate && (
                                            <button
                                                onClick={() => handleEdit(row.DistrictId)}
                                                className="text-gray-500 hover:text-blue-600"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}&nbsp;&nbsp;&nbsp;&nbsp;

                                        {permissions.CanDelete && (
                                            <button
                                                onClick={() => handleDelete(row.DistrictId)}
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
                                <TableCell colSpan={columns.length + 1} className="text-center">
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

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold mb-4">
                                Zone Management
                            </h2>

                            <button onClick={() => setOpen(false)}>
                                <X />
                            </button>
                        </div>


                        <div>
                            <label className="block mb-1 text-sm font-medium">
                                Name
                            </label>

                            <input
                                placeholder="Name"
                                value={form.Name}
                                onChange={(e) =>
                                    setForm({ ...form, Name: e.target.value })
                                }
                                className="border p-2 w-full mb-3"
                            />

                            <label className="block mb-1 text-sm font-medium">
                                Code
                            </label>
                            <input
                                placeholder="Code"
                                value={form.Code}
                                onChange={(e) =>
                                    setForm({ ...form, Code: e.target.value })
                                }
                                className="border p-2 w-full mb-3"
                            />
                            <label className="block mb-1 text-sm font-medium">
                                Package
                            </label>
                            <select
                                value={form.ZoneId}
                                onChange={(e) =>
                                    setForm({ ...form, ZoneId: e.target.value })
                                }
                                className="border p-2 w-full mb-4"
                            >
                                {packages.map((p, index) => (
                                    <option key={`${p.Value}-${index}`} value={p.Value}>
                                        {p.Text}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="btn-group">
                            <button
                                onClick={() => setOpen(false)}
                                className="btn-secondary"

                            >
                                Go To List
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"

                                >
                                    Submit Details
                                </button>

                                <button
                                    onClick={resetForm}
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
