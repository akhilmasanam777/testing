"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Pencil, Trash2, X, } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { GpNamesCard } from "../_components/overview-cards/card";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

//  Types ─

interface DropdownItem {
    Value: string;
    Text: string;
}

interface GPFormState {
    Id: number | string;
    Name: string;
    GPCode: string;
    Lat: string;
    Lang: string;
    PackageId: string;
    ZoneId: string;
    DistrictId: string;
    RegionId: string;
}

const emptyForm: GPFormState = {
    Id: 0,
    Name: "",
    GPCode: "",
    Lat: "",
    Lang: "",
    PackageId: "",
    ZoneId: "",
    DistrictId: "",
    RegionId: "",
};

//  Component 

export default function GPPage() {
    // ── Table state ──
    const [data, setData] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>({});

    // ── Modal state ──
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<GPFormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    // ── Dropdown data ──
    const [packages, setPackages] = useState<DropdownItem[]>([]);
    const [zones, setZones] = useState<DropdownItem[]>([]);
    const [districts, setDistricts] = useState<DropdownItem[]>([]);
    const [blocks, setBlocks] = useState<DropdownItem[]>([]);

    const [loadingZones, setLoadingZones] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [loadingBlocks, setLoadingBlocks] = useState(false);

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({
        key: "",
        direction: "asc",
    });;

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;



    // TEMP: remove this after backend permissions are fixed
    const [permissions, setPermissions] = useState<any>({
        CanRead: true,
        CanUpdate: true,
        CanDelete: true,
        CanCreate: true,
    });

    //  Load page data 

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const res = await fetch("/api/gpnames");
        const json = await res.json();
        setData(json.data || []);
        setSummary(json.summary || {});
        // setPermissions(json.permissions || {});
    }

    //  Dropdown loaders 

    async function loadPackages(): Promise<DropdownItem[]> {
        const res = await fetch("https://bnpapp.traxion.in/api/dropdowns/GetPackage");
        return res.json();
    }

    async function loadZonesByPackage(packageId: string): Promise<DropdownItem[]> {
        if (!packageId) return [];
        setLoadingZones(true);
        try {
            const res = await fetch(`https://bnpapp.traxion.in/api/dropdowns/GetZoneByPackage?id=${packageId}`);
            return await res.json();
        } finally {
            setLoadingZones(false);
        }
    }

    async function loadDistrictsByZone(zoneId: string): Promise<DropdownItem[]> {
        if (!zoneId) return [];
        setLoadingDistricts(true);
        try {
            const res = await fetch(`https://bnpapp.traxion.in/api/dropdowns/GetDistrictByZone?id=${zoneId}`);
            return await res.json();
        } finally {
            setLoadingDistricts(false);
        }
    }

    async function loadBlocksByDistrict(districtId: string): Promise<DropdownItem[]> {
        if (!districtId) return [];
        setLoadingBlocks(true);
        try {
            const res = await fetch(`https://bnpapp.traxion.in/api/dropdowns/GetMandalByDistrict?id=${districtId}`);
            return await res.json();
        } finally {
            setLoadingBlocks(false);
        }
    }

    //  Open modal (Add or Edit) 

    async function openModal(item?: any) {
        resetForm();
        setModalOpen(true);

        setZones([]);
        setDistricts([]);
        setBlocks([]);

        const pkgs = await loadPackages();
        setPackages(pkgs);

        if (item) {
            const res = await fetch(`/api/gpnames?id=${item.Id}`);
            const gp = await res.json();

            // LOAD dropdowns FIRST
            const zns = await loadZonesByPackage(String(gp.PackageId));
            const dsts = await loadDistrictsByZone(String(gp.ZoneId));
            const blks = await loadBlocksByDistrict(String(gp.DistrictId));

            setZones(zns);
            setDistricts(dsts);
            setBlocks(blks);

            // THEN set form (very important)
            setForm({
                Id: gp.Id,
                Name: gp.Name,
                GPCode: gp.GPCode,
                Lat: gp.Lat,
                Lang: gp.Lang,
                PackageId: String(gp.PackageId),
                ZoneId: String(gp.ZoneId),
                DistrictId: String(gp.DistrictId),
                RegionId: String(gp.RegionId),
            });
        }
    }


    function closeModal() {
        setModalOpen(false);
        resetForm();
    }

    //  Cascading change handlers ──

    async function handlePackageChange(packageId: string) {
        setForm((f) => ({ ...f, PackageId: packageId, ZoneId: "", DistrictId: "", RegionId: "" }));
        setZones([]);
        setDistricts([]);
        setBlocks([]);

        const zns = await loadZonesByPackage(packageId);
        setZones(zns);
    }

    async function handleZoneChange(zoneId: string) {
        setForm((f) => ({ ...f, ZoneId: zoneId, DistrictId: "", RegionId: "" }));
        setDistricts([]);
        setBlocks([]);

        const dsts = await loadDistrictsByZone(zoneId);
        setDistricts(dsts);
    }

    async function handleDistrictChange(districtId: string) {
        setForm((f) => ({ ...f, DistrictId: districtId, RegionId: "" }));
        setBlocks([]);

        const blks = await loadBlocksByDistrict(districtId);
        setBlocks(blks);
    }

    function resetForm() {
        setForm(emptyForm);
        setZones([]);
        setDistricts([]);
        setBlocks([]);
    }

    //  Save (Create / Update) ──

    async function saveGP() {
        setSaving(true);
        try {
            await fetch("/api/gpnames", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            closeModal();
            loadData();
        } finally {
            setSaving(false);
        }
    }

    //  Delete ──

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to delete this item?")) return;
        await fetch(`/api/gpnames?id=${id}`, { method: "DELETE" });
        loadData();
    }

    //  Column config ─

    const columnOrder = ["Name", "GPStatus", "RegionName", "DistrictName", "ZoneName", "PackageName"];

    const hiddenColumns = [
        "Id", "RegionId", "DistrictId", "PackageId", "ZoneId",
        "CreatedDate", "CreatedBy", "UpdatedDate", "UpdatedBy",
        "Lat", "Lang", "GPCode", "GPStatusNE",
    ];

    const columnLabels: Record<string, string> = {
        Name: "GP Name",
        GPStatus: "Status",
        RegionName: "Block",
        DistrictName: "District",
        ZoneName: "Zone",
        PackageName: "Package",
    };

    const columns = useMemo(() => {
        if (!data.length) return [];
        const dynamic = Object.keys(data[0]).filter((k) => !hiddenColumns.includes(k));
        return columnOrder.filter((col) => dynamic.includes(col));
    }, [data]);

    //  Search & pagination ──

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


    //  Exports ─

    const exportCSV = () => {
        const csv = data.map((row) => Object.values(row).join(",")).join("\n");
        saveAs(new Blob([csv]), "gp-data.csv");
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "gp-data.xlsx");
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(data[0] || {})],
            body: data.map((row) => Object.values(row)),
        });
        doc.save("gp-data.pdf");
    };

    const copyData = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        alert("Copied!");
    };

    //  Access guard ──

    // if (!permissions?.CanRead) {
    //     return <p className="text-red-500 p-4">Access Denied</p>;
    // }

    //  Render ──

    return (
        <div className="page-container">

            <div className="all-pages-header">

                {/* LEFT SIDE */}
                <h1 className="dashboard-title-light">
                    GPS
                </h1>

                {/* RIGHT SIDE BUTTON */}
                {/* {permissions.CanCreate || permissions.CanUpdate ? ( */}
                <button
                    onClick={() => openModal()}
                    className="btn-primary-export"
                >
                    <span className="text-lg">+</span>
                    Add GP
                </button>
                {/* ):null} */}

            </div>


            {/* ── SUMMARY CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <GpNamesCard label="No Of Gps" value={summary?.NoOfGPs || 0} />
                <GpNamesCard label="Completed" value={summary?.CompletedGPs || 0} />
                <GpNamesCard label="Pending" value={summary?.PendingGPs || 0} />
                <GpNamesCard label="Not Started" value={summary?.NotStartedGPs || 0} />
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
                        // className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-opacity-90"
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

            {/* ── TABLE ── */}
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
                                        {columnLabels[col] || col}

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
                            paginatedData.map((item, index) => (
                                <TableRow key={item.Id}>
                                    <TableCell>
                                        {(currentPage - 1) * rowsPerPage + index + 1}
                                    </TableCell>

                                    {columns.map((col) => (
                                        <TableCell key={col}>{item[col] ?? "-"}</TableCell>
                                    ))}
                                    <TableCell >
                                        {/* {permissions.CanUpdate && ( */}
                                        <button
                                            onClick={() => openModal(item)}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {/* )} */}&nbsp;&nbsp;&nbsp;&nbsp;
                                        {/* {permissions.CanDelete && ( */}
                                        <button
                                            onClick={() => handleDelete(item.Id)}
                                            className="ml-2"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        {/* )} */}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} className="text-center py-6 text-muted-foreground">
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
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold mb-4">
                                GPS Management
                            </h2>

                            <button onClick={closeModal}>
                                <X />
                            </button>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium">
                                Name
                            </label>
                            <input
                                type="text"
                                value={form.Name}
                                onChange={(e) => setForm({ ...form, Name: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                                placeholder="Name"
                            />

                            <label className="block text-sm font-medium">State</label>
                            <select
                                value={form.PackageId || ""}
                                onChange={(e) => handlePackageChange(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">--Select Package--</option>
                                {packages.map((p) => (
                                    <option key={p.Value} value={p.Value}>
                                        {p.Text}
                                    </option>
                                ))}
                            </select>

                            <label className="block text-sm font-medium">Zone</label>
                            <select
                                value={form.ZoneId || ""}
                                onChange={(e) => handleZoneChange(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">--Select Zone--</option>
                                {zones.map((z) => (
                                    <option key={z.Value} value={z.Value}>
                                        {z.Text}
                                    </option>
                                ))}
                            </select>


                            {/* ZONE */}
                            <label className="block text-sm font-medium">District</label>
                            <select
                                value={form.DistrictId || ""}
                                onChange={(e) => handleDistrictChange(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">--Select District--</option>
                                {districts.map((d) => (
                                    <option key={d.Value} value={d.Value}>
                                        {d.Text}
                                    </option>
                                ))}
                            </select>


                            {/* DISTRICT */}
                            <label className="block text-sm font-medium">Block</label>
                            <select
                                value={form.RegionId || ""}
                                onChange={(e) => setForm({ ...form, RegionId: e.target.value })}
                                className="w-full border rounded px-3 py-2"
                            >
                                <option value="">--Select Block--</option>
                                {blocks.map((b) => (
                                    <option key={b.Value} value={b.Value}>
                                        {b.Text}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="btn-group">
                            <button
                                onClick={closeModal}
                                className="btn-secondary"
                            >
                                Go To List
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={saveGP}
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