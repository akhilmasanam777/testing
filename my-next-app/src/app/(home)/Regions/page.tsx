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



type Region = {
    RegionId: number;
    RegionName: string;
    Code: string;
    PackageName: string;
    PackageId: number;
    ZoneId: number;
    DistrictId: number;
    VideoUrl: string;
};

type Dropdown = {
    Value: string;
    Text: string;
};

export default function RegionsPage() {

    const [data, setData] = useState<Region[]>([]);
    const [open, setOpen] = useState(false);

    const [packages, setPackages] = useState<Dropdown[]>([]);
    const [zones, setZones] = useState<Dropdown[]>([]);
    const [districts, setDistricts] = useState<Dropdown[]>([]);

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState<
    { key: keyof Region | ""; direction: "asc" | "desc" }
    >({
        key: "",
        direction: "asc",
    });;

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;


    const [permissions, setPermissions] = useState({
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
    });

    const [form, setForm] = useState<Region>({
        RegionId: 0,
        RegionName: "",
        Code: "",
        PackageName: "",
        PackageId: 0,
        ZoneId: 0,
        DistrictId: 0,
        VideoUrl: "",
    });

    function resetForm() {
        setForm({
            RegionId: 0,
            RegionName: "",
            Code: "",
            PackageName: "",
            PackageId: 0,
            ZoneId: 0,
            DistrictId: 0,
            VideoUrl: "",
        });

        //clear dropdowns 
        setZones([]);
        setDistricts([]);
    }

    // ONLY SHOW THESE COLUMNS
    const columns:(keyof Region)[] = ["Code", "RegionName", "PackageName"];

    // ================= LOAD DATA =================
    async function loadData() {
        const res = await fetch("/api/block");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
    }

    async function loadPermissions() {
        const res = await fetch(
            "https://bnpapp.traxion.in/Web/permissions/page?controller=Regions&action=Index"
        );
        const json = await res.json();

        setPermissions({
            CanRead: json.CanRead,
            CanUpdate: json.CanUpdate,
            CanDelete: json.CanDelete,
        });
    }

    async function loadPackages() {
        const res = await fetch(
            "https://bnpapp.traxion.in/api/dropdowns/GetPackage"
        );
        setPackages(await res.json());
    }

    async function loadZones(packageId: number) {
        const res = await fetch(
            `https://bnpapp.traxion.in/api/dropdowns/GetZoneByPackage?id=${packageId}`
        );
        setZones(await res.json());
    }

    async function loadDistricts(zoneId: number) {
        const res = await fetch(
            `https://bnpapp.traxion.in/api/dropdowns/GetDistrictByZone?id=${zoneId}`
        );
        setDistricts(await res.json());
    }

    useEffect(() => {
        // loadPermissions();
        loadData();
        loadPackages();
    }, []);


    // ================= ADD =================
    function handleAdd() {
        setForm({
            RegionId: 0,
            RegionName: "",
            Code: "",
            PackageName: "",
            PackageId: 0,
            ZoneId: 0,
            DistrictId: 0,
            VideoUrl: "",
        });
        setOpen(true);
    }

    // ================= EDIT =================
    async function handleEdit(id: number) {
        const res = await fetch(`/api/block?id=${id}`);
        const d = await res.json();

        setForm(d);

        await loadZones(d.PackageId);
        await loadDistricts(d.ZoneId);

        setOpen(true);
    }

    // ================= DELETE =================
    async function handleDelete(id: number) {
        if (!confirm("Delete?")) return;

        await fetch(`/api/block?id=${id}`, { method: "DELETE" });
        loadData();
    }

    // ================= SAVE =================
    async function handleSave() {

        await fetch("/api/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        setOpen(false);
        loadData();
    }

    // ================= PERMISSION BLOCK =================
    if (!permissions.CanRead) {
        return <p className="text-red-500">Access Denied</p>;
    }

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
               const aVal =
    sortConfig.key !== ""
        ? a[sortConfig.key]
        : "";

const bVal =
    sortConfig.key !== ""
        ? b[sortConfig.key]
        : "";

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
                    BLOCK
                </h1>

                {/* RIGHT SIDE BUTTON */}
                {permissions.CanUpdate && (
                    <button
                        onClick={handleAdd}
                        className="btn-primary-export"
                    >
                        <span className="text-lg">+</span>
                        Add Block
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
                                        {col === "RegionName"
                                            ? "Name"
                                            : col === "PackageName"
                                                ? "Package"
                                                : col}

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
                                <TableRow key={row.RegionId}>
                                    <TableCell>{index + 1}</TableCell>

                                    {columns.map((col) => (
                                        <TableCell key={col}>
                                            {String(row[col as keyof Region])}
                                        </TableCell>
                                    ))}

                                    <TableCell>
                                        {permissions.CanUpdate && (
                                            <button
                                                onClick={() =>
                                                    handleEdit(row.RegionId)
                                                }
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}

                                        {permissions.CanDelete && (
                                            <button
                                                onClick={() =>
                                                    handleDelete(row.RegionId)
                                                }
                                                className="ml-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
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
                                Mandal Management
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
                                value={form.RegionName}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        RegionName: e.target.value,
                                    })
                                }
                                className="border p-2 w-full mb-2"
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
                                className="border p-2 w-full mb-2"
                            />
                            <label className="block mb-1 text-sm font-medium">
                                Package
                            </label>
                            {/* PACKAGE */}
                            <select
                                value={form.PackageId}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setForm({ ...form, PackageId: val });
                                    loadZones(val);
                                }}
                                className="border p-2 w-full mb-2"
                            >
                                <option value="">Select Package</option>
                                {packages.map((p) => (
                                    <option key={p.Value} value={p.Value}>
                                        {p.Text}
                                    </option>
                                ))}
                            </select>

                            {/* ZONE */}
                            <label className="block mb-1 text-sm font-medium">
                                Zone
                            </label>
                            <select
                                value={form.ZoneId}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setForm({ ...form, ZoneId: val });
                                    loadDistricts(val);
                                }}
                                className="border p-2 w-full mb-2"
                            >
                                <option value="">Select Zone</option>
                                {zones.map((z) => (
                                    <option key={z.Value} value={z.Value}>
                                        {z.Text}
                                    </option>
                                ))}
                            </select>

                            {/* DISTRICT */}
                            <label className="block mb-1 text-sm font-medium">
                                District
                            </label>
                            <select
                                value={form.DistrictId}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        DistrictId: Number(e.target.value),
                                    })
                                }
                                className="border p-2 w-full mb-2"
                            >
                                <option value="">Select District</option>
                                {districts.map((d) => (
                                    <option key={d.Value} value={d.Value}>
                                        {d.Text}
                                    </option>
                                ))}
                            </select>

                            <label className="block mb-1 text-sm font-medium">
                                URL
                            </label>
                            <input
                                placeholder="URL"
                                value={form.VideoUrl || ""}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        VideoUrl: e.target.value,
                                    })
                                }
                                className="border p-2 w-full mb-3"
                            />
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