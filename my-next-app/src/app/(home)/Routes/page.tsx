"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { FaEdit, FaTrash, FaUpload, FaPlus } from "react-icons/fa";
import { X } from "lucide-react";

// TYPES
type DropdownItem = {
    value: string;
    text: string;
};

type RouteItem = {
    Id: number;
    Code: string;
    Name: string;
    UserName: string;
    RegionId: number;
    SpanType: number;
    Distance?: number;
    RingId?: string;
    priority?: number;
    UserId?: number;
};

export default function RoutesPage() {
    // Filter States
    const [spanTypes, setSpanTypes] = useState<DropdownItem[]>([]);
    const [regions, setRegions] = useState<DropdownItem[]>([]);
    const [selectedSpan, setSelectedSpan] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");

    // Table Data State
    const [routes, setRoutes] = useState<RouteItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState<Partial<RouteItem>>({ Id: 0 });
    const [modalRegions, setModalRegions] = useState<DropdownItem[]>([]);
    const [users, setUsers] = useState<DropdownItem[]>([]);
    const [priorities, setPriorities] = useState<DropdownItem[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadRegionId, setUploadRegionId] = useState<number | null>(null);

    // Initial Load
    useEffect(() => {
        loadSpanTypes();
        loadDropdownData();
    }, []);

    // Automatically fetch data whenever a filter selection changes
useEffect(() => {
    if (selectedSpan && selectedRegion) {
        handleFilterSubmit();
    }
}, [ selectedRegion]);

    // API: Load Filter Span Types
    const loadSpanTypes = async () => {
        try {
            const res = await fetch("/api/spanview/dropdowns/task-level");
            const data = await res.json();
            const formatted = data.map((item: any) => ({
                value: item.Value,
                text: item.Text,
            }));
            setSpanTypes(formatted);
            if (formatted.length > 0) {
                setSelectedSpan(formatted[0].value);
                loadRegions(formatted[0].value, setRegions);
            }
        } catch (err) {
            console.error("Span type error:", err);
        }
    };

    // API: Load Regions (Used for both Filter and Modal)
    const loadRegions = async (spanValue: string, setter: React.Dispatch<React.SetStateAction<DropdownItem[]>>) => {
        try {
            const typeMap: Record<string, string> = {
                "1": "package", "2": "zone", "3": "district",
                "4": "region", "5": "parent-gp", "6": "child-gp", "7": "gi",
            };
            const type = typeMap[spanValue];
            if (!type) return;

            const res = await fetch(`/api/spanview/dropdowns/${type}`);
            if (!res.ok) { setter([]); return; }

            const data = await res.json();
            const formatted = data.map((item: any) => ({
                value: item.Value,
                text: item.Text,
            }));
            setter(formatted);
            
            // Auto-select first item for filters
            if (setter === setRegions && formatted.length > 0) {
                setSelectedRegion(formatted[0].value);
            }
        } catch (err) {
            console.error("Region error:", err);
        }
    };

    // API: Load Static Lookups (Users & Priorities)
    const loadDropdownData = async () => {
        try {
            // Adjust these endpoints to match your Next.js API routes
            const [usersRes, priorityRes] = await Promise.all([
                fetch("/api/dropdowns?id=1005"), // Adjust to your actual User Dropdown endpoint
                fetch("/api/dropdowns?id=103")   // Adjust to your actual Priority Lookup endpoint
            ]);

            if(usersRes.ok) {
                const uData = await usersRes.json();
                setUsers(uData.map((i: any) => ({ value: i.Value, text: i.Text })));
            }
            if(priorityRes.ok) {
                const pData = await priorityRes.json();
                setPriorities(pData.map((i: any) => ({ value: i.Value, text: i.Text })));
            }
        } catch (err) {
            console.error("Failed to load generic dropdowns:", err);
        }
    };

    const handleFilterSubmit = async () => {
        if (!selectedRegion || !selectedSpan) return;
        setLoading(true);
        try {
            // Note: Update this endpoint to match your Next.js backend migration route
            const res = await fetch(`/api/routes/getspanroutes?RegionId=${selectedRegion}&SpanType=${selectedSpan}`);
            if (res.ok) {
                const data = await res.json();
                setRoutes(data);
            } else {
                setRoutes([]);
            }
        } catch (err) {
            console.error("Fetch routes error:", err);
        } finally {
            setLoading(false);
        }
    };

    // MODAL HANDLERS
    const openManageRoute = (route?: RouteItem) => {
        if (route) {
            setFormData(route);
            loadRegions(String(route.SpanType), setModalRegions);
        } else {
            setFormData({ Id: 0, SpanType: Number(selectedSpan) || 1 });
            loadRegions(String(selectedSpan || 1), setModalRegions);
        }
        setIsRouteModalOpen(true);
    };

    const handleSaveRoute = async () => {
        try {
            // Note: Wire this up to your Next.js API POST endpoint
            const res = await fetch("/api/routes/savespanroute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, IsActive: true }),
            });

            if (res.ok) {
                setIsRouteModalOpen(false);
                handleFilterSubmit(); // Refresh data
                alert("Route saved successfully");
            } else {
                alert("Failed to save route");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            // Note: Wire this up to your Next.js API endpoint
            const res = await fetch(`/api/routes/deletespanroute?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setRoutes((prev) => prev.filter(r => r.Id !== id));
            } else {
                alert("Delete failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUploadKML = async () => {
        if (!uploadFile || !uploadRegionId) return;
        
        const form = new FormData();
        form.append("RegionId", String(uploadRegionId));
        form.append("zipfilePathfiles", uploadFile);

        try {
            // Note: Wire this up to your Next.js KML upload endpoint
            const res = await fetch("/api/routes/upload-kml", {
                method: "POST",
                body: form,
            });

            if (res.ok) {
                alert("File uploaded successfully");
                setIsUploadModalOpen(false);
                setUploadFile(null);
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6  dark:text-white">
            {/* ── FILTER HEADER ── */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">Filter</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow mb-6">
                <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-5">
                        <label className="block mb-1 font-bold text-sm">Span Type</label>
                        <select 
                            value={selectedSpan} 
                            onChange={(e) => {
                                setSelectedSpan(e.target.value);
                                loadRegions(e.target.value, setRegions);
                            }} 
                            className="w-full border p-2 rounded dark:bg-dark-2"
                        >
                            {spanTypes.map((item) => <option key={item.value} value={item.value}>{item.text}</option>)}
                        </select>
                    </div>
                    <div className="col-span-5">
                        <label className="block mb-1 font-bold text-sm">Level</label>
                        <select 
                            value={selectedRegion} 
                            onChange={(e) => setSelectedRegion(e.target.value)} 
                            className="w-full border p-2 rounded dark:bg-dark-2"
                        >
                            {regions.map((item) => <option key={item.value} value={item.value}>{item.text}</option>)}
                        </select>
                    </div>
                    {/* <div className="col-span-2">
                        <button onClick={handleFilterSubmit} className="btn-primary w-full py-2">
                            Submit
                        </button>
                    </div> */}
                </div>
            </div>

            {/* ── TABLE AREA ── */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Span Routes</h2>
                    <button onClick={() => openManageRoute()} className="btn-primary flex items-center gap-2">
                        <FaPlus size={12} /> Span
                    </button>
                </div>

                <div className="card-container overflow-x-auto">
                    <Table className="table-main w-full">
                        <TableHeader className="border-b">
                            <TableRow className="table-header-row">
                                <TableHead className="table-head">Code</TableHead>
                                <TableHead className="table-head">Name</TableHead>
                                <TableHead className="table-head">Link User</TableHead>
                                <TableHead className="table-head">Action</TableHead>
                                <TableHead className="table-head">Upload KML</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
                            ) : routes.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6">No data found</TableCell></TableRow>
                            ) : (
                                routes.map((item) => (
                                    <TableRow key={item.Id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <TableCell>{item.Code}</TableCell>
                                        <TableCell>{item.Name}</TableCell>
                                        <TableCell>{item.UserName}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-3 text-gray-500">
                                                <button onClick={() => openManageRoute(item)} title="Edit"><FaEdit className="hover:text-blue-600" /></button>
                                                <button onClick={() => handleDelete(item.Id)} title="Delete"><FaTrash className="hover:text-red-600" /></button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <button 
                                                onClick={() => { setUploadRegionId(item.Id); setIsUploadModalOpen(true); }}
                                                className="text-blue-500 hover:text-blue-700"
                                                title="Upload KML"
                                            >
                                                <FaUpload size={18} />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* ── SPAN MANAGEMENT MODAL ── */}
            {isRouteModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-2xl bg-white dark:bg-gray-800 rounded shadow-lg">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-lg font-bold">Span Management</h2>
                            <button onClick={() => setIsRouteModalOpen(false)} className="text-gray-500 hover:text-gray-800"><X /></button>
                        </div>
                        
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                  
                                    <label className="text-sm font-semibold  dark:text-white">Span Type</label>
                                    <select 
                                        value={formData.SpanType || ""} 
                                        onChange={(e) => {
                                            setFormData({ ...formData, SpanType: Number(e.target.value) });
                                            loadRegions(e.target.value, setModalRegions);
                                        }} 
                                        className="w-full border p-2 rounded dark:bg-dark-2"
                                    >
                                        {spanTypes.map(s => <option key={s.value} value={s.value}>{s.text}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Link</label>
                                    <select 
                                        value={formData.RegionId || ""} 
                                        onChange={(e) => setFormData({ ...formData, RegionId: Number(e.target.value) })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2"
                                    >
                                        <option value="">Select...</option>
                                        {modalRegions.map(r => <option key={r.value} value={r.value}>{r.text}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Code</label>
                                    <input 
                                        type="text" 
                                        value={formData.Code || ""} 
                                        onChange={(e) => setFormData({ ...formData, Code: e.target.value })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2" 
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.Name || ""} 
                                        onChange={(e) => setFormData({ ...formData, Name: e.target.value })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Link User</label>
                                    <select 
                                        value={formData.UserId || ""} 
                                        onChange={(e) => setFormData({ ...formData, UserId: Number(e.target.value) })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2"
                                    >
                                        <option value="">Select...</option>
                                        {users.map(u => <option key={u.value} value={u.value}>{u.text}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-sm">RingId</label>
                                    <input 
                                        type="text" 
                                        value={formData.RingId || ""} 
                                        onChange={(e) => setFormData({ ...formData, RingId: e.target.value })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Distance</label>
                                    <input 
                                        type="number" 
                                        value={formData.Distance || ""} 
                                        onChange={(e) => setFormData({ ...formData, Distance: Number(e.target.value) })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2" 
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 font-bold text-sm">Priority</label>
                                    <select 
                                        value={formData.priority || ""} 
                                        onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} 
                                        className="w-full border p-2 rounded dark:bg-dark-2"
                                    >
                                        <option value="">Select...</option>
                                        {priorities.map(p => <option key={p.value} value={p.value}>{p.text}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-3 p-4 border-t">
                            <button onClick={() => setIsRouteModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 dark:text-gray-300">Close</button>
                            <button onClick={handleSaveRoute} className="btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── UPLOAD ZIP/KML MODAL ── */}
            {isUploadModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box w-full max-w-md bg-white dark:bg-gray-800 rounded shadow-lg">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h5 className="font-bold">Upload Shape KML File</h5>
                            <button onClick={() => setIsUploadModalOpen(false)}><X className="text-gray-500 hover:text-gray-800" /></button>
                        </div>
                        <div className="p-4">
                            <label className="block mb-2 text-sm font-medium">Select KML File</label>
                            <input 
                                type="file" 
                                accept=".kml" 
                                onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)} 
                                className="w-full border p-2 rounded dark:bg-dark-2" 
                            />
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t">
                            <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 border rounded">Close</button>
                            <button onClick={handleUploadKML} className="btn-primary">Upload</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}