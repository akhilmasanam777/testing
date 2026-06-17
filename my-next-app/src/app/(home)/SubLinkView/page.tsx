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

import {
    FaTasks,
    FaMapMarkedAlt,
    FaFileAlt,
    FaSort,
    FaSortUp,
    FaSortDown,
    FaFile,
} from "react-icons/fa";
import { X } from "lucide-react";


// TYPES
type DropdownItem = {
    value: string;
    text: string;
};

type RouteItem = {
    RouteId: number;
    LinkName: string;
    SublinkName: string;
    TemplateName: string;
    PercentageValue: number;
    SpanType: string;
    KMLFilePath: string;
    RegionId: number;
    SublinkCode?: string;
    LinkCode?: string;
    Folder?: string;
};

type TaskItem = {
    Id: number;
    TaskName: string;
    MarkerPath?: string;
    SpanType?: string;
    Completed?: number;
    Name?: string;
    UOMName?: string;
    LengthValue?: number;
    Target?: number;
    progress?: number;
    fullyapproved?: number;
    Days?: number;
    StartDate?: string;
    EndDate?: string;
};


// HELPERS

function formatDate(value?: string | null): string {
    if (!value || value.trim() === "") return "";
    const datePart = value.trim().split(" ")[0];
    return datePart || "";
}

function formatDays(days?: number | null): string {
    if (days === null || days === undefined || days <= 0) return "";
    return `${days} Days`;
}


function resolveMarkerUrl(path?: string): string | null {
    if (!path) return null;

    // already full URL
    if (path.startsWith("http")) return path;

    // handle svg or content paths
    return `https://bnpapp.traxion.in${path}`;
}


// COMPONENT

export default function SpanViewPage() {
    const [spanTypes, setSpanTypes] = useState<DropdownItem[]>([]);
    const [regions, setRegions] = useState<DropdownItem[]>([]);
    const [routes, setRoutes] = useState<RouteItem[]>([]);

    const [selectedSpan, setSelectedSpan] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [loading, setLoading] = useState(false);

    const [selectedRow, setSelectedRow] = useState<RouteItem | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [open, setOpen] = useState(false);

    const [isMapOpen, setIsMapOpen] = useState(false);
    const [mapPath, setMapPath] = useState<string | null>(null);

    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskData, setTaskData] = useState<TaskItem[]>([]);
    const [taskLoading, setTaskLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    useEffect(() => { loadSpanTypes(); }, []);

    const loadSpanTypes = async () => {
        try {
            const res = await fetch("/api/spanview/dropdowns/task-level");
            console.log("Test")
            console.log(`response: ${res}`)
            const data = await res.json();
            // console.log("API response:", data);
            const formatted: DropdownItem[] = data.map((item: any) => ({
                value: item.Value,
                text: item.Text,
            }));
            setSpanTypes(formatted);
            if (formatted.length > 0) {
                setSelectedSpan(formatted[0].value);
                loadRegions(formatted[0].value);
            }
        } catch (err) {
            console.error("Span type error:", err);
        }
    };

    const loadRegions = async (spanType: string) => {
        try {
            const typeMap: Record<string, string> = {
                "1": "package", "2": "zone", "3": "district",
                "4": "region", "5": "parent-gp", "6": "child-gp", "7": "gi",
            };
            const type = typeMap[spanType];
            if (!type) return;

            const res = await fetch(`/api/spanview/dropdowns/${type}`);
            if (!res.ok) { setRegions([]); return; }

            const data = await res.json();
            const formatted: DropdownItem[] = data.map((item: any) => ({
                value: item.Value,
                text: item.Text,
            }));
            setRegions(formatted);
            if (formatted.length > 0) setSelectedRegion(formatted[0].value);
        } catch (err) {
            console.error("Region error:", err);
        }
    };

    // const loadMap = async (path: string) => {
    //     await loadGoogleMaps();

    //     const map = new google.maps.Map(document.getElementById("map") as HTMLElement, {
    //         center: { lat: 17.385, lng: 78.4867 },
    //         zoom: 10,
    //     });

    //     new google.maps.KmlLayer({
    //         url: `https://bnpapp.traxion.in${path}`,
    //         map: map,
    //     });
    // };

    // const loadGoogleMaps = () => {
    //     return new Promise((resolve) => {
    //         if (window.google) return resolve(true);

    //         const script = document.createElement("script");
    //         script.src = "https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_KEY";
    //         script.async = true;
    //         script.onload = () => resolve(true);

    //         document.body.appendChild(script);
    //     });
    // };



    const handleSpanChange = (value: string) => {
        setSelectedSpan(value);
        setRoutes([]);
        loadRegions(value);
    };

    const handleSubmit = async () => {
        if (!selectedRegion || !selectedSpan) return;
        try {
            setLoading(true);
            const res = await fetch(
                `/api/spanview/routes?regionId=${selectedRegion}&spanType=${selectedSpan}`
            );
            const data = await res.json();
            setRoutes(data);
        } catch (err) {
            console.error("Routes error:", err);
        } finally {
            setLoading(false);
        }
    };

    const columns = ["LinkName", "SublinkName", "SpanId", "RingId", "TemplateName", "PercentageValue"];

    const columnLabels: Record<string, string> = {
        LinkName: "Name",
        SublinkName: "Span Name",
        SpanId: "SpanId",
        RingId: "RingId",
        TemplateName: "Template",
        PercentageValue: "Status",
    };

    const filteredData = useMemo(() => {
        return routes.filter((row) =>
            columns.some((col) =>
                String(
                    col === "SpanId" ? row.SublinkCode
                        : col === "RingId" ? row.LinkCode
                            : row[col as keyof RouteItem] || ""
                ).toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [routes, search]);

    const sortedData = useMemo(() => {
        const arr = [...filteredData];
        if (sortConfig.key) {
            arr.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof RouteItem];
                const bVal = b[sortConfig.key as keyof RouteItem];
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

    useEffect(() => { setCurrentPage(1); }, [search]);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    // ── TASK CLICK ──

    const handleTaskClick = async (row: RouteItem) => {
        console.log("Task Click → routeId:", row.RouteId, "spanType:", row.SpanType);
        setIsTaskModalOpen(true);
        setTaskData([]);
        setTaskLoading(true);
        try {
            const res = await fetch(
                `/api/spanview/tasks?routeId=${row.RouteId}&spanType=${row.SpanType}`
            );
            const data = await res.json();
            setTaskData(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Task fetch error:", err);
            setTaskData([]);
        } finally {
            setTaskLoading(false);
        }
    };

    const handleMapClick = (row: RouteItem) => {
        setMapPath(row.KMLFilePath);
        setIsMapOpen(true);

        // setTimeout(() => {
        //     loadMap(row.KMLFilePath);
        // }, 300);
    };

    return (
        <div className="p-6 text-gray-900 dark:text-white">

            {/* ── FILTER ── */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">Filter</h1>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow mb-6">
                <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <select value={selectedSpan} onChange={(e) => handleSpanChange(e.target.value)} className="w-full border p-2 rounded">
                            {spanTypes.map((item) => <option key={item.value} value={item.value}>{item.text}</option>)}
                        </select>
                    </div>
                    <div className="col-span-4">
                        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full border p-2 rounded">
                            {regions.map((item) => <option key={item.value} value={item.value}>{item.text}</option>)}
                        </select>
                    </div>
                    <div className="col-span-4">
                        <button onClick={handleSubmit} className="btn-primary">Submit</button>
                    </div>
                </div>
            </div>

            {/* ── TABLE ── */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">Span Details</h1>
            </div>
            <div className="mb-2 flex justify-end">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Search:</label>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        className="rounded-md border px-3 py-1.5 text-sm focus:outline-none dark:bg-dark-2 dark:text-white"
                    />
                </div>
            </div>

            <div className="card-container">
                <Table className="table-main">
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead className="table-head">S.No</TableHead>
                            {columns.map((col) => (
                                <TableHead key={col} className="table-head cursor-pointer"
                                    onClick={() => setSortConfig((prev) => ({ key: col, direction: prev.key === col && prev.direction === "asc" ? "desc" : "asc" }))}>
                                    <div className="flex items-center gap-1">
                                        {columnLabels[col]}
                                        {sortConfig.key !== col && <FaSort className="text-gray-400" size={12} />}
                                        {sortConfig.key === col && sortConfig.direction === "asc" && <FaSortUp className="text-primary" size={12} />}
                                        {sortConfig.key === col && sortConfig.direction === "desc" && <FaSortDown className="text-primary" size={12} />}
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead className="table-head">Tasks</TableHead>
                            <TableHead className="table-head">Map</TableHead>
                            <TableHead className="table-head">ABD</TableHead>
                            <TableHead className="table-head">MB</TableHead>
                            <TableHead className="table-head">Certificate</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow><TableCell colSpan={columns.length + 6} className="text-center py-6">Loading...</TableCell></TableRow>
                        )}
                        {!loading && routes.length === 0 && (
                            <TableRow><TableCell colSpan={columns.length + 6} className="text-center py-6">No data found</TableCell></TableRow>
                        )}
                        {paginatedData.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{(currentPage - 1) * rowsPerPage + index + 1}</TableCell>
                                {columns.map((col) => (
                                    <TableCell key={col}>
                                        {col === "PercentageValue" ? (item.PercentageValue ? "Started" : "Not Started")
                                            : col === "SpanId" ? item.SublinkCode ?? "NA"
                                                : col === "RingId" ? item.LinkCode ?? "NA"
                                                    : String(item[col as keyof RouteItem] ?? "NA")}
                                    </TableCell>
                                ))}
                                <TableCell>
                                    <FaTasks className="text-blue-600 mx-auto cursor-pointer hover:text-blue-800" size={16}
                                        title="View Tasks" onClick={() => handleTaskClick(item)} />
                                </TableCell>
                                <TableCell>
                                    <FaMapMarkedAlt
                                        className="text-blue-600 mx-auto cursor-pointer hover:text-blue-800"
                                        size={16}
                                        title="View Map"
                                        onClick={() => handleMapClick(item)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <a href={`/TaskWiseRecord/ABDData?Id=${item.RouteId}`} target="_blank" rel="noreferrer">
                                        <FaFileAlt className="text-blue-600 mx-auto" size={16} />
                                    </a>
                                </TableCell>
                                <TableCell>
                                    <a href={`/LinkView?Id=${item.RouteId}&RegionId=${item.RegionId}&From=TaskDetails`} target="_blank" rel="noreferrer">
                                        <FaFile className="text-blue-600 mx-auto" size={16} />
                                    </a>
                                </TableCell>
                                <TableCell>
                                    {item.Folder ? (
                                        <span className="text-green-600 cursor-pointer text-sm">View</span>
                                    ) : (
                                        <div className="flex items-center gap-1 justify-center cursor-pointer"
                                            onClick={() => { setSelectedRow(item); setOpen(true); }}>
                                            <FaFileAlt className="text-gray-400" size={13} />
                                            <span className="text-xs text-gray-600">No Files</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white">Previous</button>
                            {getPageNumbers().map((page) => (
                                <button key={page} onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 border rounded-md text-sm ${currentPage === page ? "bg-primary text-white" : "hover:bg-primary hover:text-white"}`}>
                                    {page}
                                </button>
                            ))}
                            <button onClick={() => setCurrentPage((p) => p < totalPages ? p + 1 : p)} className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white">Next</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── CERTIFICATE MODAL ── */}
            {open && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">UPLOAD PDF FILE</h2>
                            <button onClick={() => setOpen(false)}><X /></button>
                        </div>
                        <div className="mt-4">
                            <label className="block mb-2 text-sm">Select PDF File</label>
                            <input type="file" accept="application/pdf"
                                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                className="w-full border p-2 rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setOpen(false)} className="border px-3 py-1 rounded">Cancel</button>
                            <button className="btn-primary">OK</button>
                        </div>
                    </div>
                </div>
            )}

            {isTaskModalOpen && (
                <div className="modal-overlay">

                    <div className="modal-box w-[95%] max-w-6xl">

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Task Details</h2>
                            <button onClick={() => setIsTaskModalOpen(false)}><X /></button>
                        </div>


                        {/* BODY */}
                        <div className="overflow-auto max-h-[400px]">

                            {taskLoading ? (
                                <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                                    Loading tasks...
                                </div>
                            ) : (
                                <Table className="table-main">
                                    <TableHeader>
                                        <TableRow className="table-header-row">

                                            {["S.No", "Task", "Progress", "Assign", "UOM", "Length (Mts)", "Total", "Completed", "Approved", "Days", "Start Date", "Due Date"].map((h) => (
                                                <TableHead key={h} className="text-xs font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {h}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {taskData.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={12} className="text-center py-10 text-gray-400 text-sm">
                                                    No tasks found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            taskData.map((task, index) => {
                                                const iconUrl = resolveMarkerUrl(task.MarkerPath);
                                                const progressPct = task.Completed ?? 0;

                                                return (
                                                    <TableRow key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">

                                                        <TableCell>
                                                            {(currentPage - 1) * rowsPerPage + index + 1}
                                                        </TableCell>


                                                        {/* Task  icon (from MarkerPath) + link */}
                                                        <TableCell className="min-w-[180px]">
                                                            <div className="flex items-center gap-2">
                                                                {/* Task icon fetched from API via task.MarkerPath */}
                                                                {iconUrl ? (
                                                                    <img
                                                                        src={iconUrl}
                                                                        alt="task-icon"
                                                                        width={20}
                                                                        height={20}
                                                                        className="object-contain"
                                                                        onError={(e) => {
                                                                            console.error("Image failed:", iconUrl);
                                                                            (e.target as HTMLImageElement).style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-5 h-5 bg-gray-200 rounded" />
                                                                )}
                                                                <a
                                                                                href={`/Timeline?Id=${task.Id}&SpanType=${task.SpanType}`}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-blue-600 hover:underline text-sm whitespace-nowrap"
                                                                >
                                                                    {task.TaskName}
                                                                </a>
                                                            </div>
                                                        </TableCell>

                                                        {/* Progress */}
                                                        <TableCell className="min-w-[140px]">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden flex-shrink-0">
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${Math.min(progressPct, 100)}%`,
                                                                            backgroundColor:
                                                                                progressPct > 100 ? "#f59e0b"
                                                                                    : progressPct > 0 ? "#22c55e"
                                                                                        : "#d1d5db",
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                                                    {progressPct}%
                                                                </span>
                                                            </div>
                                                        </TableCell>

                                                        {/* Assign */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.Name || ""}
                                                        </TableCell>

                                                        {/* UOM */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.UOMName || ""}
                                                        </TableCell>

                                                        {/* Length */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.LengthValue ?? 0}
                                                        </TableCell>

                                                        {/* Total */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.Target ?? 0}
                                                        </TableCell>

                                                        {/* Completed count */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.progress ?? 0}
                                                        </TableCell>

                                                        {/* Approved */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {task.fullyapproved ?? 0}
                                                        </TableCell>

                                                        {/* Days  "" for null/0/negative */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                                                            {formatDays(task.Days)}
                                                        </TableCell>

                                                        {/* Start Date  strips time part */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                            {formatDate(task.StartDate)}
                                                        </TableCell>

                                                        {/* Due Date  strips time part */}
                                                        <TableCell className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                            {formatDate(task.EndDate)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="flex justify-end px-5 py-3 border-t flex-shrink-0 bg-white dark:bg-gray-900">
                            <button
                                onClick={() => setIsTaskModalOpen(false)}
                                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {isMapOpen && (
                <div className="modal-overlay">

                    <div className="modal-box">

                        <div className="overflow-auto max-h-[400px]">
                            {/* HEADER */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">View Larger Map</h2>
                                <button onClick={() => setIsMapOpen(false)}><X /></button>
                            </div>


                            {/* MAP */}
                            <div className="flex-1">
                                <div id="map" className="w-full h-full"></div>
                            </div>

                            {/* FOOTER */}
                            <div className="flex justify-end p-3 border-t">
                                <button onClick={() => setIsMapOpen(false)} className="px-4 py-2 bg-gray-300 rounded">
                                    Close
                                </button>
                            </div>
                        </div>


                    </div>
                </div>
            )}
        </div>
    );
}
