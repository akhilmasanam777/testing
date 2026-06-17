"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, X, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";

//  Types ─

type User = any;

interface DropdownItem {
    Value: string;
    Text: string;
}

interface FormState {
    Id: number | string;
    Name: string;
    Email: string;
    UserName: string;
    Phone: string;
    RoleId: string;
    agency: string;
    Location: string;
    IsEnabled: boolean;
    PackageId: string;
}

//  Constants 

const INITIAL_FORM: FormState = {
    Id: 0,
    Name: "",
    Email: "",
    UserName: "",
    Phone: "",
    RoleId: "",
    agency: "",
    Location: "",
    IsEnabled: true,
    PackageId: "",
};

const VISIBLE_COLUMNS = [
    "Name", "Role", "Email", "Phone", "UserName",
    "Password", "IMEI", "agency",
    "AppVersion", "MobileName", "MobileVersion",
];


const ROWS_PER_PAGE = 10;

//  Component 

export default function UsersPage() {

    // ── Table state ──
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

    // ── Modal state ──
    const [isOpen, setIsOpen] = useState(false);
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // ── Dropdown state ──
    const [roles, setRoles] = useState<DropdownItem[]>([]);
    const [agencies, setAgencies] = useState<DropdownItem[]>([]);
    const [packages, setPackages] = useState<DropdownItem[]>([]);
    const [ddlLoading, setDdlLoading] = useState(false);


    const loadDropdowns = useCallback(async () => {
        setDdlLoading(true);
        try {
            const [rRes, aRes, pRes] = await Promise.all([
                fetch("/api/users?type=roles", { cache: "no-store" }),
                fetch("/api/users?type=agencies", { cache: "no-store" }),
                fetch("/api/users?type=packages", { cache: "no-store" }),
            ]);

            const [rData, aData, pData] = await Promise.all([
                rRes.json(),
                aRes.json(),
                pRes.json(),
            ]);

            setRoles(Array.isArray(rData) ? rData : []);
            setAgencies(Array.isArray(aData) ? aData : []);
            setPackages(Array.isArray(pData) ? pData : []);
        } catch (err) {
            console.error("Dropdown load failed:", err);
        } finally {
            setDdlLoading(false);
        }
    }, []);

    // ── Fetch users ──
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users", { cache: "no-store" });
            const json = await res.json();
            setUsers(Array.isArray(json.data) ? json.data : []);
        } catch (err) {
            console.error("fetchUsers failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleResetPassword = async (user: any) => {
        if (!confirm("Are you sure you want to reset this Password?")) return;

        await fetch(
            `/api/users?action=resetPassword&Id=${user.Id}&UserName=${encodeURIComponent(user.UserName)}&RoleId=${user.RoleId}`
        );

        alert("Password reset successfully");
    };

    const handleResetIMEI = async (user: any) => {
        if (!confirm("Are you sure you want to reset IMEI?")) return;

        await fetch(`/api/users?action=resetIMEI&Id=${user.Id}`);
        alert("IMEI reset successfully");
    };

    const handleUnblock = async (user: any) => {
        if (!confirm("Are you sure you want to Unblock this User?")) return;

        await fetch(
            `/api/users?action=unblock&Id=${user.Id}&UserName=${encodeURIComponent(user.UserName)}&RoleId=${user.RoleId}`
        );

        alert("Unblocked successfully");
    };

    const handleUnAssign = async (user: any) => {
        if (!confirm("Are you sure you want to UnAssign this User?")) return;

        await fetch(
            `/api/users?action=unassign&Id=${user.Id}&UserName=${encodeURIComponent(user.UserName)}&RoleId=${user.RoleId}`
        );

        alert("Unassigned successfully");
    };

    // ── Reset form 
    const resetForm = () => setForm(INITIAL_FORM);

    // ── Open modal 
    const openModal = async (user?: any) => {
        setFormError(null);
        resetForm();

        await loadDropdowns();

        if (user?.Id) {
            try {
                const res = await fetch(`/api/users?id=${user.Id}`, { cache: "no-store" });
                const data = await res.json();

                setForm({
                    Id: data.Id ?? 0,
                    Name: data.Name ?? "",
                    Email: data.Email ?? "",
                    UserName: data.UserName ?? "",
                    Phone: data.Phone ?? "",
                    RoleId: String(data.RoleId ?? ""),
                    agency: String(data.agency ?? ""),
                    Location: data.Location ?? "",
                    IsEnabled: data.IsEnabled ?? true,
                    PackageId: String(data.PackageId ?? ""),
                });
            } catch (err) {
                console.error("Load user failed:", err);
            }
        }

        setIsOpen(true);
    };

    // ── Close modal ──
    const closeModal = () => {
        setIsOpen(false);
        resetForm();
        setFormError(null);
    };

    // ── Field change ─
    const handleChange = (key: keyof FormState, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    // ── Save ──
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                Id: Number(form.Id) || 0,
                Name: form.Name.trim(),
                Email: form.Email.trim(),
                UserName: form.UserName.trim(),
                Phone: form.Phone.trim(),
                Location: form.Location.trim(),
                IsEnabled: String(form.IsEnabled),
                RoleId: Number(form.RoleId) || 0,
                PackageId: Number(form.PackageId) || 0,
                agency: form.agency,
            };

            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Save failed. Please try again.");
                return;
            }

            closeModal();
            await fetchUsers();

        } catch (err: any) {
            setFormError(err.message || "Unexpected error.");
        } finally {
            setSaving(false);
        }
    };

    // ── Delete 
    const handleDelete = async (id: number) => {
        if (!confirm("Delete this user?")) return;
        try {
            await fetch(`/api/users?id=${id}`, { method: "DELETE" });
            setUsers(prev => prev.filter(u => u.Id !== id));
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    // ── Filter / sort / paginate ─
    const filteredData = useMemo(() =>
        users.filter(row =>
            VISIBLE_COLUMNS.some(col =>
                String(row[col] ?? "").toLowerCase().includes(search.toLowerCase())
            )
        ),
        [users, search]);

    const sortedData = useMemo(() => {
        if (!sortConfig.key) return filteredData;
        return [...filteredData].sort((a, b) => {
            const av = String(a[sortConfig.key] ?? "");
            const bv = String(b[sortConfig.key] ?? "");
            return sortConfig.direction === "asc"
                ? av.localeCompare(bv)
                : bv.localeCompare(av);
        });
    }, [filteredData, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return sortedData.slice(start, start + ROWS_PER_PAGE);
    }, [sortedData, currentPage]);

    useEffect(() => { setCurrentPage(1); }, [search]);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    // ── Exports 
    const exportCSV = () => {
        const csv = users.map(r => Object.values(r).join(",")).join("\n");
        saveAs(new Blob([csv]), "gp-data.csv");
    };
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(users);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "gp-data.xlsx");
    };
    const exportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(users[0] || {})],
            body: users.map(r => Object.values(r)),
        });
        doc.save("gp-data.pdf");
    };
    const copyData = () => {
        navigator.clipboard.writeText(JSON.stringify(users, null, 2));
        alert("Copied!");
    };

    // Render

    if (loading) return <p className="p-4">Loading...</p>;

    return (
        <div className="page-container">

            {/* ── Header ── */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">Users</h1>

                <button onClick={() => openModal()} className="btn-primary-export">
                    <span className="text-lg">+</span> Add User
                </button>
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "Copy", action: copyData },
                        { label: "CSV", action: exportCSV },
                        { label: "Excel", action: exportExcel },
                        { label: "PDF", action: exportPDF },
                        { label: "Print", action: () => window.print() },
                    ].map(btn => (
                        <button key={btn.label} onClick={btn.action} className="btn-primary-export">
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-dark dark:text-white">Search:</label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm
                                       focus:border-primary focus:outline-none
                                       dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="card-container">
               
                <Table className="table-main">
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead className="table-head">S.No</TableHead>

                            {VISIBLE_COLUMNS.map(col => (
                                <TableHead
                                    key={col}
                                    className="table-head cursor-pointer"
                                    onClick={() =>
                                        setSortConfig(prev => ({
                                            key: col,
                                            direction:
                                                prev.key === col && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }))
                                    }
                                >
                                    <div className="flex items-center gap-1">
                                        {col}
                                        {sortConfig.key !== col && (
                                            <FaSort className="text-gray-400" size={12} />
                                        )}
                                        {sortConfig.key === col && sortConfig.direction === "asc" && (
                                            <FaSortUp className="text-primary" size={12} />
                                        )}
                                        {sortConfig.key === col && sortConfig.direction === "desc" && (
                                            <FaSortDown className="text-primary" size={12} />
                                        )}
                                    </div>
                                </TableHead>
                            ))}

                            {/* Extra Columns */}
                            <TableHead className="table-head">Action</TableHead>
                            <TableHead className="table-head">Unblock</TableHead>
                            <TableHead className="table-head">UnAssign Device</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedData.map((user, index) => (
                            <TableRow key={user.Id}>
                                {/* S.No */}
                                <TableCell>
                                    {(currentPage - 1) * ROWS_PER_PAGE + index + 1}
                                </TableCell>

                                {/* Dynamic Columns */}
                                {VISIBLE_COLUMNS.map((col) => (
                                    <TableCell key={col}>
                                        {/* PASSWORD COLUMN */}
                                        {col === "Password" ? (
                                            <span
                                                style={{ color: "red", cursor: "pointer" }}
                                                onClick={() => handleResetPassword(user)}
                                            >
                                                Click to reset
                                            </span>

                                        ) : col === "IMEI" ? (
                                            user.IMEI ? (
                                                <>
                                                    {user.IMEI}
                                                    <br />
                                                    <span
                                                        style={{ color: "red", cursor: "pointer" }}
                                                        onClick={() => handleResetIMEI(user)}
                                                    >
                                                        Click to reset
                                                    </span>
                                                </>
                                            ) : ""
                                        ) : (
                                            user[col] ?? ""
                                        )}
                                    </TableCell>
                                ))}

                                {/* ACTION COLUMN */}
                                <TableCell>
                                    <button onClick={() => openModal(user)}>
                                        <Pencil size={16} />
                                    </button>
                                    &nbsp;&nbsp;&nbsp;&nbsp;
                                    <button
                                        onClick={() => handleDelete(user.Id)}
                                        className="ml-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </TableCell>

                                {/* UNBLOCK COLUMN */}
                                <TableCell>
                                    {(user.SessionId === 1 || user.Islocked === 1) && (
                                        <span
                                            style={{ color: "red", cursor: "pointer" }}
                                            onClick={() => handleUnblock(user)}
                                        >
                                            Click to reset
                                        </span>
                                    )}
                                </TableCell>

                                {/* UNASSIGN DEVICE COLUMN */}
                                <TableCell>
                                    {user.UniqueNumber && (
                                        <span
                                            style={{ color: "red", cursor: "pointer" }}
                                            onClick={() => handleUnAssign(user)}
                                        >
                                            Click to reset
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Pagination */}
                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{" "}
                            {Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of{" "}
                            {sortedData.length} entries
                        </p>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Previous
                            </button>

                            {getPageNumbers().map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 border rounded-md text-sm ${currentPage === page
                                        ? "bg-primary text-white"
                                        : "hover:bg-primary hover:text-white"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => p < totalPages ? p + 1 : p)}
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/*Modal */}
            {isOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">

                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold mb-4">User Management</h2>
                            <button onClick={closeModal}><X /></button>
                        </div>
                        {/* Name + Email */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm mb-1">Name</label>
                                <input
                                    value={form.Name}
                                    onChange={e => handleChange("Name", e.target.value)}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Email</label>
                                <input
                                    value={form.Email}
                                    onChange={e => handleChange("Email", e.target.value)}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="mt-3">
                            <label className="block text-sm mb-1">User Name</label>
                            <input
                                value={form.UserName}
                                onChange={e => handleChange("UserName", e.target.value)}
                                className="border p-2 w-full rounded"
                            />
                        </div>

                        {/* Phone + Role */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="block text-sm mb-1">Phone</label>
                                <input
                                    value={form.Phone}
                                    onChange={e => {
                                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                        handleChange("Phone", val);
                                    }}
                                    maxLength={10}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Role</label>
                                <select
                                    value={form.RoleId}
                                    onChange={e => handleChange("RoleId", e.target.value)}
                                    className="border p-2 w-full rounded"
                                    disabled={ddlLoading}
                                >
                                    <option value="">-- Select --</option>

                                    {roles.map((r, index) => (
                                        <option key={`${r.Value}-${index}`} value={String(r.Value)}>
                                            {r.Text}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Agency + Location */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="block text-sm mb-1">Agency</label>
                                <select
                                    value={form.agency}
                                    onChange={e => handleChange("agency", e.target.value)}
                                    className="border p-2 w-full rounded"
                                    disabled={ddlLoading}
                                >
                                    <option value="">Select Agency</option>
                                    {agencies.map((a, index) => (
                                        <option key={`${a.Value}-${index}`} value={String(a.Value)}>
                                            {a.Text}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm mb-1">Location</label>
                                <input
                                    value={form.Location}
                                    onChange={e => handleChange("Location", e.target.value)}
                                    className="border p-2 w-full rounded"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="mt-3">
                            <label className="block text-sm mb-1">Status</label>
                            <label className="mr-4">
                                <input
                                    type="radio"
                                    checked={form.IsEnabled === true}
                                    onChange={() => handleChange("IsEnabled", true)}
                                />{" "}Enabled
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    checked={form.IsEnabled === false}
                                    onChange={() => handleChange("IsEnabled", false)}
                                />{" "}Disabled
                            </label>
                        </div>

                        {/* Package */}
                        <div className="mt-3">
                            <label className="block text-sm mb-1">Package</label>
                            <select
                                value={form.PackageId}
                                onChange={e => handleChange("PackageId", e.target.value)}
                                className="border p-2 w-full rounded"
                                disabled={ddlLoading}
                            >
                                <option value="">Select Package</option>
                                {packages.map((p, index) => (
                                    <option key={`${p.Value}-${index}`} value={String(p.Value)}>
                                        {p.Text}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Buttons — exact btn-group structure from your code */}
                        <div className="btn-group">
                            <button onClick={closeModal} className="btn-secondary">
                                Go To List
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="btn-primary"
                                >
                                    Submit Details
                                </button>

                                <button onClick={resetForm} className="btn-secondary">
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