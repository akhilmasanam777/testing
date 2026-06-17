"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Settings, X } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function RouteProcessPage() {
    const searchParams = useSearchParams();

    // Dropdown Filtering States
    const [spanTypes, setSpanTypes] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [selectedSpanType, setSelectedSpanType] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("");

    // Main Table Dataset
    const [routes, setRoutes] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>({ RoleName: "Admin" });

    // Modal 1: Assign Process Template
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [routeForm, setRouteForm] = useState({ routeId: 0, routeProcessTemplateId: 0, templateId: "" });

    // Modal 2: Individual Step Config Task Forms
    const [taskConfigModalOpen, setTaskConfigModalOpen] = useState(false);
    const [modalTasksList, setModalTasksList] = useState<any[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState("");
    const [activeTaskForm, setActiveTaskForm] = useState<any>(null);

    // Modal 3: Bulk Admin Matrix configuration
    const [multiConfigModalOpen, setMultiConfigModalOpen] = useState(false);
    const [multiTasks, setMultiTasks] = useState<any[]>([]);
    const [multiUsers, setMultiUsers] = useState<any[]>([]);

    // Pagination Configurations
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    // ─── HOOK INITIALIZATIONS ──────────────────────────────────────
    useEffect(() => {
        initPageSetup();
    }, []);

    async function initPageSetup() {
        try {
            const res = await fetch("/api/routeprocess?action=getTaskLevels");
            const data = await res.json();
            setSpanTypes(data);

            const paramStateId = searchParams.get("StateId");
            const paramRegionId = searchParams.get("RegionId");

            if (paramStateId && paramRegionId) {
                setSelectedSpanType(paramStateId);
                await updateLevelOptions(paramStateId);
                setSelectedLevel(paramRegionId);
                fetchRouteListTable(paramRegionId, paramStateId);
            } else if (data.length > 0) {
                setSelectedSpanType(data[0].Value);
                updateLevelOptions(data[0].Value);
            }
        } catch (e) {
            console.error("Initialization failed", e);
        }
    }

    async function updateLevelOptions(typeId: string) {
        if (!typeId) return;
        const res = await fetch(`/api/routeprocess?action=getRegionDropdown&type=${typeId}`);
        const data = await res.json();
        setLevels(data);
        if (data.length > 0) setSelectedLevel(data[0].Value);
    }

    async function fetchRouteListTable(region?: string, type?: string) {
        const targetRegion = region || selectedLevel;
        const targetType = type || selectedSpanType;
        if (!targetRegion || !targetType) return;

        const res = await fetch(`/api/routeprocess?action=getRouteDetails&regionId=${targetRegion}&spanType=${targetType}`);
        const data = await res.json();
        setRoutes(Array.isArray(data) ? data : []);
        setCurrentPage(1);
    }

    function formatDate(dateStr: any) {
        if (!dateStr) return "";
        return new Date(dateStr).toISOString().split("T")[0];
    }

    // ─── MODAL 1 ACTIONS: ASSIGN PROCESS TEMPLATE ──────────────────
    async function openTemplateAssignment(id: number) {
        const tRes = await fetch("/api/routeprocess?action=getTemplates");
        setTemplatesList(await tRes.json());

        const dataRes = await fetch(`/api/routeprocess?action=getRouteProcessTemplate&id=${id}`);
        const assignData = await dataRes.json();

        setRouteForm({
            routeId: assignData.RouteId || id,
            routeProcessTemplateId: assignData.RouteProcessTemplateId || 0,
            templateId: String(assignData.TemplateId || ""),
        });
        setTemplateModalOpen(true);
    }

    async function saveTemplateAssignment() {
        if (!routeForm.templateId) return alert("Please select Process Template");
        await fetch("/api/routeprocess", {
            method: "POST",
            body: JSON.stringify({
                action: "saveRoute",
                data: {
                    RouteId: Number(routeForm.routeId),
                    RouteProcessTemplateId: Number(routeForm.routeProcessTemplateId),
                    TemplateId: Number(routeForm.templateId)
                }
            })
        });
        setTemplateModalOpen(false);
        fetchRouteListTable();
    }

    // ─── MODAL 2 ACTIONS: INDIVIDUAL STEP METRICS FORM ─────────────
    async function openConfigTasks(templateId: number, routeId: number) {
        const res = await fetch(`/api/routeprocess?action=getTasks&templateId=${templateId}&routeId=${routeId}`);
        const tasks = await res.json();
        setModalTasksList(tasks);

        if (tasks.length > 0) {
            setSelectedTaskId(tasks[0].Value);
            fetchSingleTaskForm(tasks[0].Value);
        }
        setTaskConfigModalOpen(true);
    }

    async function fetchSingleTaskForm(taskId: string) {
        if (!taskId) return;
        const res = await fetch(`/api/routeprocess?action=getSpanProcessById&id=${taskId}`);
        setActiveTaskForm(await res.json());
    }

    async function saveSingleTaskForm() {
        if (!activeTaskForm) return;
        await fetch("/api/routeprocess", {
            method: "POST",
            body: JSON.stringify({
                action: "updateSpanProcess",
                data: {
                    Id: selectedTaskId,
                    StartDate: activeTaskForm.StartDate,
                    EndDate: activeTaskForm.EndDate,
                    Target: Number(activeTaskForm.Target),
                    weightage: Number(activeTaskForm.weightage),
                    taskUsers: activeTaskForm.taskUsers
                }
            })
        });
        setTaskConfigModalOpen(false);
        fetchRouteListTable();
    }

    // ─── MODAL 3 ACTIONS: BUNDLED INLINE MASS CONFIGURATION ────────
    async function openMultiConfigMatrix(templateId: number, routeId: number) {
        const res = await fetch(`/api/routeprocess?action=getMultiConfig&templateId=${templateId}&routeId=${routeId}`);
        const bundle = await res.json();
        setMultiTasks(bundle.configTasksList || []);
        setMultiUsers(bundle.taskUsers || []);
        setMultiConfigModalOpen(true);
    }

    async function saveMultiConfigMatrix() {
        await fetch("/api/routeprocess", {
            method: "POST",
            body: JSON.stringify({
                action: "saveSpanProcessNew",
                data: {
                    configTasksList: multiTasks,
                    taskUsers: multiUsers
                }
            })
        });
        setMultiConfigModalOpen(false);
        fetchRouteListTable();
    }

    // ─── CLIENT PAGINATION UTILITY MATRIX ───────────────────────────
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return routes.slice(start, start + rowsPerPage);
    }, [routes, currentPage]);

    const totalPages = Math.ceil(routes.length / rowsPerPage);

    return (
        <div className="page-container space-y-6 p-6">
            {/* SEARCH CRITERIA BLOCK */}
            <div className="card-container p-6 bg-white dark:bg-dark-2 shadow-1 rounded-sm">
                <h3 className="text-base font-bold mb-4 border-b pb-2  dark:text-white">Filter</h3>
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col gap-2 min-w-[240px]">
                        <label className="text-sm font-semibold  dark:text-white">Span Type</label>
                        <select
                            value={selectedSpanType}
                            onChange={(e) => { setSelectedSpanType(e.target.value); updateLevelOptions(e.target.value); }}
                            className="w-full rounded border border-stroke bg-gray px-4 py-2.5 outline-none focus:border-primary dark:border-stroke-dark dark:bg-dark-3"
                        >
                            {spanTypes.map((t) => <option key={t.Value} value={t.Value}>{t.Text}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[240px]">
                        <label className="text-sm font-semibold dark:text-white">Level</label>
                        <select
                            value={selectedLevel}
                            onChange={(e) => setSelectedLevel(e.target.value)}
                            className="w-full rounded border border-stroke bg-gray px-4 py-2.5 outline-none focus:border-primary dark:border-stroke-dark dark:bg-dark-3"
                        >
                            {levels.map((l) => <option key={l.Value} value={l.Value}>{l.Text}</option>)}
                        </select>
                    </div>
                    <button onClick={() => fetchRouteListTable()} className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90 transition-all h-[46px]">
                        Submit
                    </button>
                </div>
            </div>

            {/* ROUTE RECORDS DATA TABLE */}
            <div className="card-container bg-white dark:bg-dark-2 shadow-1 rounded-sm overflow-hidden">
                <div className="p-4 border-b border-stroke dark:border-stroke-dark">
                    <h3 className="text-base font-bold dark:text-white">SubLink Details</h3>
                </div>
                <Table className="table-main w-full">
                    <TableHeader className="bg-gray-2 dark:bg-dark-3">
    <TableRow className="table-header-row border-b border-stroke dark:border-stroke-dark bg-gray-2 dark:bg-dark-3">
        <TableHead className="table-head p-4 font-semibold  dark:text-white text-left">Name</TableHead>
        <TableHead className="table-head p-4 font-semibold  dark:text-white text-left">Code</TableHead>
        <TableHead className="table-head p-4 font-semibold  dark:text-white text-left">Process Template</TableHead>
        <TableHead className="table-head p-4 font-semibold  dark:text-white text-left">Task Config</TableHead>
        <TableHead className="table-head p-4 font-semibold  dark:text-white text-center">Action</TableHead>
    </TableRow>
</TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item) => (
                                <TableRow key={item.Id} className="border-b border-stroke dark:border-stroke-dark hover:bg-gray-2 dark:hover:bg-dark-3">
                                    <TableCell className="p-4 font-medium text-black dark:text-white">{item.Name}</TableCell>
                                    <TableCell className="p-4">{item.Code}</TableCell>
                                    <TableCell className="p-4">
                                        {item.TemplateName ? (
                                            <span className=" font-medium">{item.TemplateName}</span>
                                        ) : (
                                            <span className="font-medium">Process Template Not Assigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4">
                                        {item.TemplateId && (
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => openConfigTasks(item.TemplateId, item.Id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition font-medium">
                                                    <Settings size={15} /> Config
                                                </button>
                                                {currentUser?.RoleName === "Admin" && (
                                                    <button onClick={() => openMultiConfigMatrix(item.TemplateId, item.Id)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition font-medium">
                                                        <Settings size={15} /> MultiConfig
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        <button onClick={() => openTemplateAssignment(item.Id)} className="text-gray-500 hover:text-primary transition">
                                            <Pencil size={16} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-400">No data found</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {/* PAGINATION LAYOUT CONTAINER */}
                {routes.length > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-stroke dark:border-stroke-dark text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, routes.length)} of {routes.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1.5 border rounded-md disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-dark-3">
                                Previous
                            </button>
                            <span className="font-medium px-2">Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1.5 border rounded-md disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-dark-3">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: TEMPLATE DISPATCH POPUP */}
            {templateModalOpen && (
                <div className="modal-overlay fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="modal-box bg-white dark:bg-dark-2 p-6 rounded-sm shadow-2 w-full max-w-md border border-stroke dark:border-stroke-dark">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-black dark:text-white">Process Template</h2>
                            <button onClick={() => setTemplateModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="mb-6 flex flex-col gap-2">
                            <label className="text-sm font-semibold text-black dark:text-white">Name</label>
                            <select
                                value={routeForm.templateId}
                                onChange={(e) => setRouteForm({ ...routeForm, templateId: e.target.value })}
                                className="w-full rounded border border-stroke p-2.5 bg-transparent outline-none focus:border-primary dark:border-stroke-dark"
                            >
                                <option value="">-- Choose Template --</option>
                                {templatesList.map((t) => <option key={t.Value} value={t.Value}>{t.Text}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setTemplateModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-3">Cancel</button>
                            <button onClick={saveTemplateAssignment} className="px-5 py-2 rounded bg-primary text-white hover:bg-opacity-90">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: TASK ATTRIBUTE METRICS CONFIGURATION POPUP */}
            {taskConfigModalOpen && (
                <div className="modal-overlay fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="modal-box bg-white dark:bg-dark-2 p-6 rounded-sm shadow-2 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-stroke dark:border-stroke-dark">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-black dark:text-white">Process Template Config</h2>
                            <button onClick={() => setTaskConfigModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="mb-4 flex flex-col gap-2">
                            <label className="text-sm font-semibold text-black dark:text-white">Selected Active Task</label>
                            <select
                                value={selectedTaskId}
                                onChange={(e) => { setSelectedTaskId(e.target.value); fetchSingleTaskForm(e.target.value); }}
                                className="w-full rounded border border-stroke p-2.5 bg-transparent outline-none focus:border-primary dark:border-stroke-dark"
                            >
                                {modalTasksList.map((t) => <option key={t.Value} value={t.Value}>{t.Text}</option>)}
                            </select>
                        </div>

                        {activeTaskForm && (
                            <div className="border border-stroke dark:border-stroke-dark p-4 rounded bg-gray-2 dark:bg-dark-3 space-y-4">
                                <h4 className="font-bold text-green-600 border-b border-stroke dark:border-stroke-dark pb-1 text-sm">{activeTaskForm.TaskName}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-black dark:text-white">Start Date</label>
                                        <input type="date" value={formatDate(activeTaskForm.StartDate)} onChange={(e) => setActiveTaskForm({ ...activeTaskForm, StartDate: e.target.value })} className="w-full rounded border border-stroke p-2 bg-white dark:bg-dark-2 outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-black dark:text-white">End Date</label>
                                        <input type="date" value={formatDate(activeTaskForm.EndDate)} onChange={(e) => setActiveTaskForm({ ...activeTaskForm, EndDate: e.target.value })} className="w-full rounded border border-stroke p-2 bg-white dark:bg-dark-2 outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-black dark:text-white">Estimated Quantity</label>
                                        <input type="number" value={activeTaskForm.Target || 0} onChange={(e) => setActiveTaskForm({ ...activeTaskForm, Target: e.target.value })} className="w-full rounded border border-stroke p-2 bg-white dark:bg-dark-2 outline-none" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-bold text-black dark:text-white">Weightage</label>
                                        <input type="number" value={activeTaskForm.weightage || 0} onChange={(e) => setActiveTaskForm({ ...activeTaskForm, weightage: e.target.value })} className="w-full rounded border border-stroke p-2 bg-white dark:bg-dark-2 outline-none" />
                                    </div>
                                </div>
                                <div className="max-h-56 overflow-y-auto border border-stroke dark:border-stroke-dark rounded bg-white dark:bg-dark-2">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-stroke dark:border-stroke-dark bg-gray-2 dark:bg-dark-3 text-left">
                                                <th className="p-2 w-16 text-center font-semibold text-black dark:text-white">Check</th>
                                                <th className="p-2 font-semibold text-black dark:text-white">Name</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeTaskForm.taskUsers?.map((u: any, idx: number) => (
                                                <tr key={u.UserId || idx} className="border-b border-stroke dark:border-stroke-dark last:border-0">
                                                    <td className="p-2 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={u.UserSelected || false}
                                                            onChange={(e) => {
                                                                const updated = [...activeTaskForm.taskUsers];
                                                                updated[idx].UserSelected = e.target.checked;
                                                                setActiveTaskForm({ ...activeTaskForm, taskUsers: updated });
                                                            }}
                                                            className="h-4 w-4 cursor-pointer text-primary border-stroke"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-black dark:text-white">{u.Name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setTaskConfigModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 dark:text-gray-300 bg-white dark:bg-dark-2 hover:bg-gray-100">Cancel</button>
                                    <button onClick={saveSingleTaskForm} className="px-5 py-2 rounded bg-primary text-white hover:bg-opacity-90">Save Data</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 3: BUNDLED INLINE MASS CONFIGURATION POPUP */}
            {multiConfigModalOpen && (
                <div className="modal-overlay fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="modal-box bg-white dark:bg-dark-2 p-6 rounded-sm shadow-2 w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-stroke dark:border-stroke-dark">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-black dark:text-white">Multi Config Management</h2>
                            <button onClick={() => setMultiConfigModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                        </div>
                        <div className="space-y-6">
                            <div className="overflow-x-auto border border-stroke dark:border-stroke-dark rounded">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-2 dark:bg-dark-3 border-b border-stroke dark:border-stroke-dark">
                                        <tr>
                                            <th className="p-3 font-semibold text-black dark:text-white">Task</th>
                                            <th className="p-3 font-semibold text-black dark:text-white">Start Date</th>
                                            <th className="p-3 font-semibold text-black dark:text-white">End Date</th>
                                            <th className="p-3 font-semibold text-black dark:text-white">Target</th>
                                            <th className="p-3 font-semibold text-black dark:text-white">Weightage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {multiTasks.map((t, idx) => (
                                            <tr key={t.Id || idx} className="border-b border-stroke dark:border-stroke-dark last:border-0 hover:bg-gray-2 dark:hover:bg-dark-3">
                                                <td className="p-3 font-medium text-black dark:text-white">{t.TaskName}</td>
                                                <td className="p-2">
                                                    <input type="date" value={formatDate(t.StartDate)} onChange={(e) => { const clone = [...multiTasks]; clone[idx].StartDate = e.target.value; setMultiTasks(clone); }} className="rounded border border-stroke p-1.5 bg-white dark:bg-dark-2 text-xs outline-none" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="date" value={formatDate(t.EndDate)} onChange={(e) => { const clone = [...multiTasks]; clone[idx].EndDate = e.target.value; setMultiTasks(clone); }} className="rounded border border-stroke p-1.5 bg-white dark:bg-dark-2 text-xs outline-none" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" value={t.Target || ""} onChange={(e) => { const clone = [...multiTasks]; clone[idx].Target = e.target.value; setMultiTasks(clone); }} className="rounded border border-stroke p-1.5 bg-white dark:bg-dark-2 text-xs outline-none w-24" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" value={t.weightage || ""} onChange={(e) => { const clone = [...multiTasks]; clone[idx].weightage = e.target.value; setMultiTasks(clone); }} className="rounded border border-stroke p-1.5 bg-white dark:bg-dark-2 text-xs outline-none w-24" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="max-h-56 overflow-y-auto border border-stroke dark:border-stroke-dark rounded">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-2 dark:bg-dark-3 border-b border-stroke dark:border-stroke-dark">
                                        <tr>
                                            <th className="p-3 w-16 text-center font-semibold text-black dark:text-white">Check</th>
                                            <th className="p-3 font-semibold text-black dark:text-white">Name</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {multiUsers.map((u, idx) => (
                                            <tr key={u.UserId || idx} className="border-b border-stroke dark:border-stroke-dark last:border-0 hover:bg-gray-2 dark:hover:bg-dark-3">
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={u.UserSelected || false}
                                                        onChange={(e) => {
                                                            const clone = [...multiUsers];
                                                            clone[idx].UserSelected = e.target.checked;
                                                            setMultiUsers(clone);
                                                        }}
                                                        className="h-4 w-4 cursor-pointer text-primary border-stroke"
                                                    />
                                                </td>
                                                <td className="p-3 text-black dark:text-white">{u.Name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setMultiConfigModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-3">Cancel</button>
                                <button onClick={saveMultiConfigMatrix} className="px-5 py-2 rounded bg-primary text-white hover:bg-opacity-90">Save Configuration</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}