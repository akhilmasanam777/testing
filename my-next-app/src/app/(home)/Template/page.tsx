"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X, Settings } from "lucide-react";
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

export default function ProcessTemplatePage() {
    // ================= STATES =================
    const [data, setData] = useState<any[]>([]);
    
    // Template Modal States
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [id, setId] = useState(0);

    // Task Config Modal States
    const [configOpen, setConfigOpen] = useState(false);
    const [configTasks, setConfigTasks] = useState<any[]>([]);
    const [savingConfig, setSavingConfig] = useState(false);

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

    // ================= INIT =================
    useEffect(() => {
        loadPermissions();
        loadData();
    }, []);

    async function loadPermissions() {
        try {
            const res = await fetch(
                "/api/permissions?controller=Template&action=Index"
            );
            const data = await res.json();
            setPermissions({
                CanRead: data.CanRead,
                CanUpdate: data.CanUpdate,
                CanDelete: data.CanDelete,
            });
        } catch (error) {
            console.error("Failed to load permissions", error);
        }
    }

    async function loadData() {
        try {
            // Adjust endpoint to match your actual Next.js API route
            const res = await fetch("/api/processtemplate");
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch (error) {
            console.error("Failed to load data", error);
        }
    }

    // ================= CRUD: PROCESS TEMPLATE =================
    async function handleDelete(deleteId: number) {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            await fetch(`/api/processtemplate?id=${deleteId}`, {
                method: "DELETE",
            });
            loadData();
        } catch (error) {
            console.error("Delete failed", error);
        }
    }

    async function handleEdit(item: any) {
        try {
            const res = await fetch(`/api/processtemplate?id=${item.Id}`);
            const json = await res.json();

            setId(json.Id || json.id);
            setName(json.Name);
            setOpen(true);
        } catch (error) {
            console.error("Failed to fetch template details", error);
        }
    }

    function handleAdd() {
        setId(0);
        setName("");
        setOpen(true);
    }

    async function handleSave() {
        if (!name.trim()) {
            alert("Template Name required");
            return;
        }

        try {
            await fetch("/api/processtemplate", {
                method: "POST",
                body: JSON.stringify({
                    Id: id,
                    Name: name,
                }),
            });

            setOpen(false);
            loadData();
        } catch (error) {
            console.error("Save failed", error);
        }
    }

    // ================= TASK CONFIGURATION =================
    async function openTaskConfig(templateId: number) {
        try {
            const res = await fetch(`/api/processtemplate/tasks?id=${templateId}`);
            const json = await res.json();
            
            // Expected to return array of tasks with Selected, TaskId, TaskName, TemplateId, TemplateIdConfig
            setConfigTasks(Array.isArray(json) ? json : []);
            setConfigOpen(true);
        } catch (error) {
            console.error("Failed to load task config", error);
        }
    }

    function toggleTaskSelection(index: number, checked: boolean) {
        const updatedTasks = [...configTasks];
        updatedTasks[index].Selected = checked;
        setConfigTasks(updatedTasks);
    }

    async function saveTaskConfig() {
        setSavingConfig(true);
        try {
            // Prepares payload exactly how the old jQuery script did
            const payload = configTasks.map((task) => ({
                TemplateId: task.TemplateId,
                TaskId: task.TaskId,
                TemplateIdConfig: task.TemplateIdConfig || null,
                Selected: task.Selected,
            }));

            await fetch("/api/processtemplate/updatetasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            setConfigOpen(false);
            loadData(); // Refresh the main table to update the "Task List" column
        } catch (error) {
            console.error("Failed to save task configuration", error);
        } finally {
            setSavingConfig(false);
        }
    }

    // ================= SEARCH, SORT, PAGINATION =================
    const columns = useMemo(() => ["Name", "TaskList"], []);

    const filteredData = useMemo(() => {
        return data.filter((row) =>
            columns.some((col) =>
                String(row[col] || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            )
        );
    }, [data, search, columns]);

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
        XLSX.utils.book_append_sheet(wb, ws, "Process_Templates");
        XLSX.writeFile(wb, "ProcessTemplates.xlsx");
    };

    // ================= RENDER =================
    if (!permissions.CanRead) {
        return <p className="text-red-500">Access Denied</p>;
    }

    return (
        <div className="page-container">
            {/* HEADER */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">Process Template</h1>

                {permissions.CanUpdate && (
                    <button onClick={handleAdd} className="btn-primary-export">
                        <span className="text-lg">+</span> Add Process Template
                    </button>
                )}
            </div>

            {/* TOP BAR */}
            <div className="flex justify-between mb-3">
                <button onClick={exportExcel} className="btn-primary-export">
                    Excel
                </button>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-dark dark:text-white">
                            Search:
                        </label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="card-container">
                <Table className="table-main">
                    <TableHeader className="border-b">
                        <TableRow className="table-header-row">
                            {/* <TableHead className="table-head">S.No</TableHead> */}
                            
                            {/* TASK CONFIG */}
                            <TableHead className="table-head">Task Config</TableHead>

                            {/* ACTION */}
                            <TableHead className="table-head text-center">Action</TableHead>

                            {/* NAME */}
                            <TableHead
                                className="table-head cursor-pointer"
                                onClick={() =>
                                    setSortConfig((prev) => ({
                                        key: "Name",
                                        direction: prev.key === "Name" && prev.direction === "asc" ? "desc" : "asc",
                                    }))
                                }
                            >
                                <div className="flex items-center gap-1">
                                    <span>Name</span>
                                    {sortConfig.key !== "Name" && <FaSort className="text-gray-400" size={12} />}
                                    {sortConfig.key === "Name" && sortConfig.direction === "asc" && <FaSortUp className="text-primary" size={12} />}
                                    {sortConfig.key === "Name" && sortConfig.direction === "desc" && <FaSortDown className="text-primary" size={12} />}
                                </div>
                            </TableHead>

                            {/* TASK LIST */}
                            <TableHead className="table-head w-2/5">Task List</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, index) => (
                                <TableRow key={item.Id || item.id}>
                                    {/* <TableCell>{(currentPage - 1) * rowsPerPage + index + 1}</TableCell> */}
                                    
                                    {/* TASK CONFIG */}
                                    <TableCell>
                                        <button
                                            onClick={() => openTaskConfig(item.Id || item.id)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-primary text-sm font-medium"
                                        >
                                           Config <Settings size={16} /> 
                                        </button>
                                    </TableCell>

                                    {/* ACTION */}
                                    <TableCell className="text-center space-x-4">
                                        {permissions.CanUpdate && (
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="text-gray-500 hover:text-blue-600 inline-block"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}
                                        {permissions.CanDelete && (
                                            <button
                                                onClick={() => handleDelete(item.Id || item.id)}
                                                className="text-gray-500 hover:text-red-600 inline-block"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </TableCell>

                                    {/* NAME */}
                                    <TableCell>{item.Name}</TableCell>

                                    {/* TASK LIST */}
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {(item.TaskList || "").split(",").filter((t: string) => t.trim()).map((task: string, i: number) => (
                                                <span key={i} className="bg-gray-100 dark:bg-dark-3 text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-dark-4">
                                                    {task.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6">
                                    No Data Found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* PAGINATION */}
                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
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
                                    className={`px-3 py-1 border rounded-md text-sm ${
                                        currentPage === page ? "bg-primary text-white" : "hover:bg-primary hover:text-white"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage((p) => (p < totalPages ? p + 1 : p))}
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: ADD / EDIT TEMPLATE */}
            {open && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Manage Template</h2>
                            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium">Column Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-box w-full"
                                placeholder="Template Name"
                            />
                        </div>

                        <div className="btn-group flex justify-end gap-2">
                            <button onClick={() => setOpen(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn-primary">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: TASK CONFIGURATION */}
            {configOpen && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Task Configuration</h2>
                            <button onClick={() => setConfigOpen(false)} className="text-gray-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto mb-6 pr-2">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 px-2 w-16">Check</th>
                                        <th className="py-2 px-2">Task</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {configTasks.length > 0 ? (
                                        configTasks.map((task, index) => (
                                            <tr key={task.TaskId} className="border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-dark-3">
                                                <td className="py-2 px-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={task.Selected || false}
                                                        onChange={(e) => toggleTaskSelection(index, e.target.checked)}
                                                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 font-medium">{task.TaskName}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="text-center py-4 text-gray-500">
                                                No Tasks Available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="btn-group flex justify-end gap-2">
                            <button onClick={() => setConfigOpen(false)} className="btn-secondary" disabled={savingConfig}>
                                Cancel
                            </button>
                            <button onClick={saveTaskConfig} className="btn-primary" disabled={savingConfig}>
                                {savingConfig ? "Saving..." : "Save Configuration"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}