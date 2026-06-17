"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import html2pdf from "html2pdf.js";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";
import * as XLSX from "xlsx";
import "../../../css/style.css";
// import html2pdf from "html2pdf.js";

// CanUpdate
// TYPES
// CanUpdate

interface TimelineHeader {
    Id: number;
    TaskName: string;
    Target: number;
    progress: number;
    fullyapproved: number;
    Name: string;
    SpanType: string;
    LinkName: string;
    LinkCode: string;
    SublinkCode: string;
    SublinkName: string;
    StartDate: string;
    EndDate: string;
    Days: number;
    Completed: number;
    VendorName: string;
    PackageName: string;
    Folder: string;
}

interface TableRowData {
    Id: number;
    TaskAssignId: number;
    DateString: string;
    Name: string;
    ChainFrom: string;
    ChainTo: string;
    ChainageDuplicate: number;
    StatusId: number;
    PrevApprovalName: string;
    NextApprovalName: string;
    Lat: string;
    Lang: string;
    Comment: string;
    Progress: number;
    AttributesValues: string;
    Path: string;
    LocationSource?: string;
    IsNetwork?: string;
    [key: string]: any;
}

interface ProgressDetail {
    Id: number;
    TaskAssignId: number;
    Progress: number;
    Comment: string;
    Lat: string;
    Lang: string;
    ChainFrom: string;
    ChainTo: string;
    Date: string;
    Attributes: AttributeValue[];
    AttributeValuesDto?: AttributeValue[];
}

interface AttributeValue {
    Id: number;
    TaskId: number;
    Name: string;
    ControlTypeId: number;
    Value: string;
}

interface MeasurementBookResponse {
    Header: {
        TaskName: string;
        VendorName: string;
        PackageName: string;
        SpanType: string;
        LinkName: string;
        SublinkCode: string;
        Target: number;
        StartLat?: string;
        StartLong?: string;
        EndLat?: string;
        EndLong?: string;
    };
    AttributeColumns: { Name: string; ControlTypeId: number }[];
    Rows: {
        Date: string;
        ChainFrom: string;
        ChainTo: string;
        Lat: string;
        Lang: string;
        Progress: number;
        Comment: string;
        Attributes: Record<string, string>;
    }[];
}

interface DownloadResponse {
    AttributeColumns: { Name: string }[];
    Rows: {
        Id: number;
        Date: string;
        Name: string;
        ChainFrom: string;
        ChainTo: string;
        Location: string;
        Progress: number;
        Comment: string;
        Images: string[];
        Attributes: Record<string, string>;
    }[];
}

interface DropdownOption {
    Value: string;
    Text: string;
    Selected: boolean;
}

interface ColDef {
    key: string;
    label: string;
    sortable?: boolean;
}

// CanUpdate
// FIX 1: Unified Permissions Interface
// Use consistent casing throughout (camelCase)
// CanUpdate

interface Permissions {
    canRead: boolean;
    canView: boolean;
    canUpdate: boolean;
    canDelete: boolean;
}

// CanUpdate
// TABLE COLUMN DEFINITIONS
// CanUpdate

const TABLE_COL_DEFS: ColDef[] = [
    { key: "Id", label: "ID", sortable: true },
    { key: "DateString", label: "Date", sortable: true },
    { key: "__checkbox__", label: "", sortable: false },
    { key: "Name", label: "User", sortable: true },
    { key: "ChainFrom", label: "From", sortable: true },
    { key: "ChainTo", label: "To", sortable: true },
    { key: "StatusId", label: "Status", sortable: true },
    { key: "Lat", label: "Location", sortable: false },
    { key: "LocationSource", label: "Location Source", sortable: true },
    { key: "IsNetwork", label: "Is Network", sortable: true },
    { key: "Comment", label: "Comment", sortable: true },
    { key: "Progress", label: "Progress", sortable: true },
    { key: "__actions__", label: "Actions", sortable: false },
    { key: "__details__", label: "Details", sortable: false },
];


// CanUpdate
// FETCH HELPERS
// CanUpdate

async function fetchTimelineHeader(id: string, spanType: string): Promise<TimelineHeader> {
    const res = await fetch(`/api/timeline/header?id=${id}&spanType=${spanType}`);
    if (!res.ok) throw new Error("Failed to load header");
    return res.json();
}

async function fetchTimelineDetails(params: Record<string, any>) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/timeline/details?${query}`);
    if (!res.ok) throw new Error("Failed to load details");
    return res.json();
}

// FIX 2: This fetches existing progress by progress record ID (for Edit)
async function fetchProgress(id: number): Promise<ProgressDetail> {
    const res = await fetch(`/api/timeline/progress/${id}`);
    if (!res.ok) throw new Error("Failed to load progress");
    return res.json();
}


async function saveProgress(payload: any) {
    const res = await fetch(`/api/timeline/progress/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json();
}

async function deleteProgressApi(id: number) {
    const res = await fetch(`/api/timeline/deleteprogress/${id}`);
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
}

async function bulkDeleteProgressApi(ids: number[]) {
    const res = await fetch(`/api/timeline/bulkprogressdelete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids),
    });
    if (!res.ok) throw new Error("Bulk delete failed");
    return res.json();
}

async function fetchMeasurementBook(id: string, spanType: string): Promise<MeasurementBookResponse> {
    const res = await fetch(`/api/timeline/measurementbook?id=${id}&spanType=${spanType}`);
    if (!res.ok) throw new Error("Failed");
    return res.json();
}

async function fetchDownload(id: string): Promise<DownloadResponse> {
    const res = await fetch(`/api/timeline/download?id=${id}`);
    if (!res.ok) throw new Error("Failed");
    return res.json();
}

async function fetchDropdownOptions(attrId: number, value: string, taskAssignId: number): Promise<DropdownOption[]> {
    const res = await fetch(`/api/dropdowns/GetDDList?id=${attrId}&code=${value}&id2=${taskAssignId}`);
    if (!res.ok) return [];
    return res.json();
}

async function fetchApprovalTemplate(taskProgressId: number, taskAssignId: string, approvalTypeId: number): Promise<string> {
    const res = await fetch(`/api/timeline/approvaltemplate?TaskProgressId=${taskProgressId}&TaskAssignId=${taskAssignId}&ApprovalTypeId=${approvalTypeId}`);
    if (!res.ok) throw new Error("Failed");
    return res.text();
}

async function fetchApprovalLog(taskProgressId: number): Promise<string> {
    const res = await fetch(`/api/timeline/approvallog?TaskProgressId=${taskProgressId}`);
    if (!res.ok) throw new Error("Failed");
    return res.text();
}

async function fetchBulkApprovalTemplate(ids: string, approvalTypeId: number): Promise<string> {
    const res = await fetch(`/api/timeline/bulkapprovaltemplate?BulkApproveId=${ids}&ApprovalTypeId=${approvalTypeId}`);
    if (!res.ok) throw new Error("Failed");
    return res.text();
}

// FIX 3: fetchPermissions now returns camelCase keys to match Permissions interface
async function fetchPermissions(): Promise<Permissions> {
    const res = await fetch(`/api/permissions/page?controller=Timeline&action=Index`);
    if (!res.ok) {
        // Return defaults if API is missing (404 etc.)
        return { canRead: true, canView: true, canUpdate: true, canDelete: true };
    }
    const data = await res.json();
    // Map PascalCase API response → camelCase interface
    return {
        canRead: data.CanRead ?? true,
        canView: data.CanView ?? true,
        canUpdate: data.CanUpdate ?? true,
        canDelete: data.CanDelete ?? true,
    };
}


// CanUpdate
// HELPERS
// CanUpdate

function spanLabel(spanType: string) {
    const map: Record<string, string> = {
        "1": "Package", "2": "Zone", "3": "District",
        "4": "Block", "5": "ParentGP", "6": "ChildGP", "7": "GI",
    };
    return map[spanType] ?? "Location";
}

function parseAttributesValues(json: string, path: string): string {
    try {
        const obj = JSON.parse(json) as any[];
        let html = "<table style='font-size:11px;border-collapse:collapse'>";
        for (const val of obj) {
            if (val.Name === "MainImage") continue;
            const v = val.value || val.Value || "";
            if (val.ControlTypeId == "5" && v) {
                html += `<tr><td style='padding:2px 6px;border-bottom:1px solid #eee'>${val.Name}</td><td style='padding:2px 6px;border-bottom:1px solid #eee'><a href="${v}" target="_blank">🖼</a></td></tr>`;
            } else if (val.ControlTypeId == "8" && v) {
                html += `<tr><td style='padding:2px 6px;border-bottom:1px solid #eee'>${val.Name}</td><td style='padding:2px 6px;border-bottom:1px solid #eee'><a href="${v}" target="_blank">🎥</a></td></tr>`;
            } else {
                html += `<tr><td style='padding:2px 6px;border-bottom:1px solid #eee'>${val.Name}</td><td style='padding:2px 6px;border-bottom:1px solid #eee'>${v}</td></tr>`;
            }
        }
        html += "</table>";
        if (path) {
            for (const p of path.split(",")) {
                if (p) html += `<a href="${p}" target="_blank">🖼</a> `;
            }
        }
        return html;
    } catch {
        return "";
    }
}

// CanUpdate
// ATTRIBUTE FIELD
// CanUpdate

function AttributeField({
    attr, taskAssignId, value, onChange,
}: {
    attr: AttributeValue; taskAssignId: number; value: string;
    onChange: (id: number, val: string) => void;
}) {
    const [options, setOptions] = useState<DropdownOption[]>([]);

    useEffect(() => {
        if (attr.ControlTypeId === 2) {
            fetchDropdownOptions(attr.Id, attr.Value, taskAssignId).then(setOptions);
        }
    }, [attr.Id, attr.ControlTypeId, attr.Value, taskAssignId]);

    const cls = "w-full border border-stroke rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none dark:bg-dark-2 dark:border-dark-3 dark:text-white";

    return (
        <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{attr.Name} </label>
            {attr.ControlTypeId === 2 ? (
                <select value={value} onChange={(e) => onChange(attr.Id, e.target.value)} className={cls}>
                    {options.map((o) => <option key={o.Value} value={o.Value}>{o.Text}</option>)}
                </select>
            ) : (
                <input type="text" value={value} onChange={(e) => onChange(attr.Id, e.target.value)} placeholder={attr.Name} className={cls} />
            )}
        </div>
    );
}


// CanUpdate
// PROGRESS MODAL — Edit / Add
// CanUpdate

function ProgressModal({
    open, onClose, editId, taskAssignId, initial, attributes, onSaved, title,
}: {
    open: boolean;
    onClose: () => void;
    editId: number | null;
    taskAssignId: number;
    initial: Partial<ProgressDetail>;
    attributes: AttributeValue[];
    onSaved: () => void;
    title: string;
}) {
    const [form, setForm] = useState({
        Date: "", Progress: "", Comment: "", Lat: "", Lang: "", ChainFrom: "", ChainTo: "",
    });
    const [attrValues, setAttrValues] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setForm({
            Date: initial.Date ?? "",
            Progress: String(initial.Progress ?? ""),
            Comment: initial.Comment ?? "",
            Lat: initial.Lat ?? "",
            Lang: initial.Lang ?? "",
            ChainFrom: initial.ChainFrom ?? "",
            ChainTo: initial.ChainTo ?? "",
        });
        const vals: Record<number, string> = {};
        for (const a of attributes) vals[a.Id] = a.Value ?? "";
        setAttrValues(vals);
    }, [open, initial, attributes]);

    const handleAttrChange = (id: number, val: string) =>
        setAttrValues((prev) => ({ ...prev, [id]: val }));

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                Id: editId ?? 0,
                TaskAssignId: taskAssignId,
                ...form,
                AttributeValuesDto: attributes.map((a) => ({
                    Id: a.Id,
                    TaskId: a.TaskId,
                    Name: a.Name,
                    ControlTypeId: a.ControlTypeId,
                    Value: attrValues[a.Id] ?? "",
                })),
            };
            const res = await saveProgress(payload);
            if (res.Success) {
                alert(res.Message);
                onSaved();
                onClose();
            } else {
                alert("Failed: " + res.Message);
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    const baseFields: { key: keyof typeof form; label: string; type?: string }[] = [
        { key: "Date", label: "Date", type: "datetime-local" },
        { key: "Progress", label: "Progress", type: "number" },
        { key: "Comment", label: "Comment" },
        { key: "Lat", label: "Lat" },
        { key: "Lang", label: "Long" },
        { key: "ChainFrom", label: "Chain From" },
        { key: "ChainTo", label: "Chain To" },
    ];

    const inputCls =
        "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-green-500 focus:outline-none dark:bg-dark-2 dark:border-dark-3 dark:text-white";

    return (
        <div className="modal-overlay">
            <div className="modal-box">
                {/* HEADER */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">.</h2>
                    <button onClick={onClose}><X /></button>
                </div>

                <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "65vh" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {baseFields.map(({ key, label, type }) => (
                            <div key={key}>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {label}
                                </label>
                                <input
                                    type={type ?? "text"}
                                    value={form[key]}
                                    placeholder={label}
                                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                    </div>

                    {attributes.length > 0 && (
                        <>
                            <hr className="my-4 border-gray-200" />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                {attributes.map((attr) => (
                                    <AttributeField
                                        key={attr.Id}
                                        attr={attr}
                                        taskAssignId={taskAssignId}
                                        value={attrValues[attr.Id] ?? ""}
                                        onChange={handleAttrChange}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div style={modalFooterStyle}>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-dark-3"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        Save Data
                    </button>
                </div>
            </div>
        </div>
    );
}


// CanUpdate
// APPROVAL LOG MODAL
// CanUpdate

function ApprovalLogModal({
    open, html, title, onClose,
}: {
    open: boolean; html: string; title: string; onClose: () => void;
}) {
    if (!open) return null;
    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={{ ...modalBoxStyle, maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ ...modalHeaderStyle, background: "#2ecc71" }}>
                    <h5 style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15 }}>{title || "·"}</h5>
                    <button onClick={onClose} style={{ ...closeBtn, color: "#fff" }}>✕</button>
                </div>
                <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "60vh" }}>
                    {html ? (
                        <div className="text-sm" style={{ overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: html }} />
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                                    {["Date", "Status", "Name", "Role", "Comment"].map((h) => (
                                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, color: "#374151", fontSize: 13 }}>{h}</th>
                                    ))} 
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#9ca3af", fontSize: 13 }}>No approval records found.</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
                <div style={modalFooterStyle}>
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-dark-3">Close</button>
                </div>
            </div>
        </div>
    );
}


// CanUpdate
// APPROVAL ACTION MODAL
// CanUpdate

function ApprovalActionModal({
    open, html, title, onClose,
}: {
    open: boolean; html: string; title: string; onClose: () => void;
}) {
    if (!open) return null;
    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={{ ...modalBoxStyle, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
                {/* <div style={{ ...modalHeaderStyle, background: "#2ecc71" }}> */}
                <div style={{ ...modalHeaderStyle, }}>
                    <h5 style={{ margin: 0, fontWeight: 700, color: "#fff" }}>{title || "·"}</h5>
                    <button onClick={onClose} style={{ ...closeBtn, color: "#fff" }}>✕</button>
                </div>
                <div style={{ padding: 24, overflowY: "auto", maxHeight: "70vh" }} dangerouslySetInnerHTML={{ __html: html }} />
                <div style={modalFooterStyle}>
                    <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-dark-3">Close</button>
                </div>
            </div>
        </div>
    );
}


// CanUpdate
// TABLE TAB
// FIX 4: Added onEdit prop — was missing, causing Edit button to do nothing
// CanUpdate


function TableTab({
    taskAssignId,
    onEdit,
    onBulkApprove,
    onBulkDelete,
    refreshKey,
}: {
    taskAssignId: string;
    onAction: (id: number, approvalTypeId: number) => void;
    onView: (id: number) => void;
    onEdit: (id: number) => void;   // ← FIX 4: typed correctly
    onBulkApprove: (ids: number[]) => void;
    onBulkDelete: (ids: number[]) => void;
    refreshKey: number;
}) {
    const [statusFilter, setStatusFilter] = useState(0);
    const [rows, setRows] = useState<TableRowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [sortKey, setSortKey] = useState("Id");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedRow, setSelectedRow] = useState<any>(null);


    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchTimelineDetails({
                TaskProgreeId: taskAssignId,
                type: statusFilter,
                sSearch: search,
                iDisplayStart: (page - 1) * pageSize,
                iDisplayLength: pageSize,
                SortColumn: sortKey,
                SortOrder: sortDir,
                sEcho: 1,
            });
            setRows(res.data ?? []);
            setTotal(res.recordsFiltered ?? 0);
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [taskAssignId, statusFilter, search, page, pageSize, sortKey, sortDir, refreshKey]);

    useEffect(() => { load(); }, [load]);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
        setPage(1);
    };

    const toggleSelect = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectAll) setSelected(new Set());
        else setSelected(new Set(rows.map((r) => r.Id)));
        setSelectAll(!selectAll);
    };

    const totalPages = Math.ceil(total / pageSize);

    const statusCell = (row: TableRowData) => {
        if (row.StatusId === 39)
            return (
                <span>
                    <span className="text-green-600 text-xs">Approved By ({row.PrevApprovalName})</span><br />
                    <span className="text-orange-500 font-semibold text-xs">Pending at -- {row.NextApprovalName}</span>
                </span>
            );
        if (row.StatusId === 40)
            return (
                <span>
                    <span className="text-red-600 text-xs">Rejected By ({row.PrevApprovalName})</span><br />
                    <span className="text-orange-500 font-semibold text-xs">Pending at -- {row.NextApprovalName}</span>
                </span>
            );
        if (row.StatusId === 41)
            return <span className="text-green-600 text-xs font-medium">Final Approved By ({row.PrevApprovalName})</span>;
        return <span className="text-orange-500 font-semibold text-xs">Pending at IE</span>;
    };

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortKey !== colKey) return <FaSort className="text-gray-400 ml-1 shrink-0" size={11} />;
        return sortDir === "asc"
            ? <FaSortUp className="text-primary ml-1 shrink-0" size={11} />
            : <FaSortDown className="text-primary ml-1 shrink-0" size={11} />;
    };

    const renderCell = (row: TableRowData, col: ColDef) => {
        switch (col.key) {
            case "__checkbox__":
                return <input type="checkbox" checked={selected.has(row.Id)} onChange={() => toggleSelect(row.Id)} />;
            case "Id":
                return (
                    <a
                        href={`/TaskWiseRecord/VideoPlayerBulk?Id=${row.TaskAssignId}&selectedId=${row.Id}&videoType=regular`}
                        target="_blank"
                        className="text-primary font-semibold hover:underline"
                    >
                        {row.Id}
                    </a>
                );
            case "StatusId":
                return statusCell(row);
            case "Lat":
                return <span className="text-xs">{row.Lat}, {row.Lang}</span>;
            case "ChainFrom":
                return (
                    <span style={{ background: row.ChainageDuplicate > 1 ? "#fde8e8" : "inherit" }} className="text-xs">
                        {row.ChainFrom}
                    </span>
                );
            case "ChainTo":
                return (                                                    
                    <span style={{ background: row.ChainageDuplicate > 1 ? "#fde8e8" : "inherit" }} className="text-xs">
                        {row.ChainTo}
                    </span>
                );
            case "__actions__":
                return (
                    <div className="flex gap-1.5 flex-wrap">
                        {/* FIX 4: onEdit is now properly wired */}
                        <ActionButton color="#22c55e" onClick={() => onEdit(row.Id)}>Edit</ActionButton>
                        <ActionButton color="#22c55e" onClick={() => setSelectedRow(row)}>View</ActionButton>
                                                                                                        
                    </div>
                );
            case "__details__":
                return (
                    <div
                        className="text-xs"
                        dangerouslySetInnerHTML={{ __html: parseAttributesValues(row.AttributesValues, row.Path) }}
                    />
                );
            default:
                return <span className="text-xs">{String(row[col.key] ?? "")}</span>;
        }
    };

    return (
        <div>                                                                                   
            <div className="timeline-header">
                <label className="timeline-filter">
                    <input type="radio" name="tl_status" checked={statusFilter === 0}
                        onChange={() => { setStatusFilter(0); setPage(1); setSelected(new Set()); }}   className= "radio-primary" />
                    All                                                                     
                </label>                        
                <label className="timeline-filter">
                    <input type="radio" name="tl_status" checked={statusFilter === 1}
                        onChange={() => { setStatusFilter(1); setPage(1); setSelected(new Set()); }}   className= "radio-primary"                                                                        />
                    Pending
                </label>
                <div className="ml-auto flex items-center gap-2">
                    <label className="text-sm font-medium">Search:</label>
                    <input
                        type="text"
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="timeline-search"
                    />
                </div>
            </div>

            <div className="timeline-table-wrapper">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-dark-2">
                            {TABLE_COL_DEFS.map((col) => (
                                <TableHead
                                    key={col.key}
                                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                                    className={`timeline-th ${col.sortable ? "timeline-th-sortable" : ""}`}
                                >
                                    {col.key === "__checkbox__" ? (
                                        <input type="checkbox" checked={selectAll} onChange={toggleAll} />
                                    ) : (
                                        <div className="flex items-center">
                                            {col.label}
                                            {col.sortable && <SortIcon colKey={col.key} />}
                                        </div>
                                    )}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={TABLE_COL_DEFS.length} className="timeline-loading">Loading…</TableCell>
                            </TableRow>
                        ) : rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={TABLE_COL_DEFS.length} className="timeline-loading">No records found</TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.Id} className="timeline-row">
                                    {TABLE_COL_DEFS.map((col) => (
                                        <TableCell key={col.key} className="timeline-td">
                                            {renderCell(row, col)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {total > 0 && (
                <div className="pagination-wrapper">
                    <p className="pagination-text">
                        Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} records
                    </p>
                    <div className="flex items-center gap-1">

                        <PageBtn disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</PageBtn>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const p = Math.max(1, page - 2) + i;
                            if (p > totalPages) return null;
                            return <PageBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>;
                        })}
                        <PageBtn disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => p + 1)}>Next</PageBtn>

                    </div>
                </div>
            )}

            {selectedRow && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="overflow-auto max-h-[400px]">
                            {/* HEADER */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">.</h2>
                                <button onClick={() => setSelectedRow(null)}><X /></button>
                            </div>
                            {/* CONTENT */}
                            <div className="p-4">

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Comment</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        <TableRow>
                                            <TableCell>{selectedRow.Date}</TableCell>
                                            <TableCell>{selectedRow.Progress}</TableCell>
                                            <TableCell>{selectedRow.Name}</TableCell>
                                            <TableCell>{selectedRow.Role || "-"}</TableCell>
                                            <TableCell>{selectedRow.Comment}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                {/* IMAGES */}
                                <div className="mt-4 flex gap-2 flex-wrap">
                                    {selectedRow.Images?.map((img: string, i: number) => (
                                        <img
                                            key={i}
                                            src={img}
                                            className="timeline-img"
                                        />
                                    ))}
                                </div>

                                <div className="text-right mt-4">
                                    <button
                                        className="bg-gray-400 text-white px-4 py-1 rounded"
                                        onClick={() => setSelectedRow(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>
            )}

            <div className="mt-4 flex gap-3">
                {statusFilter === 1 && (
                    <button
                        className="px-5 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:opacity-90"
                        onClick={() => {
                            const ids = [...selected];
                            if (!ids.length) { alert("Please select at least one"); return; }
                            onBulkApprove(ids);
                        }}
                    >
                        Bulk Approve/Reject
                    </button>
                )}
                <button
                    className="btn-primary"
                    onClick={() => {
                        const ids = [...selected];
                        if (!ids.length) { alert("Select at least one record"); return; }
                        if (!confirm("Are you sure?")) return;
                        onBulkDelete(ids);
                    }}
                >
                    Bulk Delete
                </button>
            </div>
        </div>
    );
}

// CanUpdate
// MAP TAB
// CanUpdate

function MapTab({ loaded }: { loaded: boolean }) {
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!loaded || !mapRef.current) return;
        const L = (window as any).L;
        if (!L) return;
        const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    }, [loaded]);

    return (
        <div
            ref={mapRef}
            className="map-container"
            style={{ height: 450 }}
        >
            {!loaded && "Loading map…"}
        </div>
    );
}

// CanUpdate
// MEASUREMENT BOOK TAB
// CanUpdate

function MeasurementBookTab({ id, spanType }: { id: string; spanType: string }) {
    const [data, setData] = useState<MeasurementBookResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    const [pageSize, setPageSize] = useState("a4");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");

    const totalPages = Math.ceil((data?.Rows?.length || 0) / rowsPerPage);

    const paginatedData = useMemo(() => {
        if (!data?.Rows) return [];
        const start = (currentPage - 1) * rowsPerPage;
        return data.Rows.slice(start, start + rowsPerPage);
    }, [data, currentPage]);

    const getPageNumbers = () => {
        const pages: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    useEffect(() => {
        fetchMeasurementBook(id, spanType)
            .then(setData)
            .catch(() => setError("Failed to load Measurement Book"))
            .finally(() => setLoading(false));
    }, [id, spanType]);

    if (loading) return <LoadingState label="Loading Measurement Book…" />;
    if (error) return <ErrorState message={error} />;
    if (!data || !data.Rows.length)
        return <p className="text-gray-400 p-6 text-sm">No measurement data available.</p>;

    const attrCols = data.AttributeColumns.filter((a) => a.ControlTypeId !== 8 && a.ControlTypeId !== 5);
    const h = data.Header;

    const exportToPDF = () => {
        const element = document.getElementById("MeasurementBookTable");
        if (!element) return;
        const opt = {
            margin: 5,
            filename: "MeasurementBook.pdf",
            image: { type: "jpeg" as const, quality: 1 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: pageSize, orientation: orientation }
        };
        html2pdf().set(opt).from(element).save();
    };

    const thClass = "measurement-th";
    const tdClass = "measurement-td";

    return (
        <div>
            <div className="measurement-toolbar">
                <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="measurement-select">
                    <option value="a4">A4</option>
                    <option value="a3">A3</option>
                    <option value="legal">Legal</option>
                    <option value="ao">AO</option>
                </select>
                <select value={orientation} onChange={(e) => setOrientation(e.target.value as any)} className="measurement-select">
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                </select>
                <button onClick={exportToPDF} className="btn-primary">Export PDF</button>
            </div>

            <div className="overflow-x-auto">
                <Table id="MeasurementBookTable" className="measurement-table" style={{ borderCollapse: "collapse" }}>
                    <TableHeader>
                        <TableRow>
                            <TableHead colSpan={8 + attrCols.length} className={thClass}>
                                Measurement Book - Amended BharatNet Program (ABP)
                            </TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead colSpan={5} className={thClass}>Name of MSI: {h.VendorName ?? ""}</TableHead>
                            <TableHead colSpan={5} className={thClass}>MB No:</TableHead>
                            <TableHead colSpan={5} className={thClass}>Sheet No:</TableHead>
                            <TableHead colSpan={8} className={thClass}>Date:</TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead colSpan={5} className={thClass}>Package: {h.PackageName}</TableHead>
                            <TableHead colSpan={5} className={thClass}>{spanLabel(h.SpanType)}: {h.LinkName}</TableHead>
                            <TableHead rowSpan={2} className={thClass}>Section Mention</TableHead>
                            <TableHead colSpan={4} className={thClass}>From:</TableHead>
                            <TableHead colSpan={8} className={thClass}>Section Id: {h.SublinkCode ?? "NA"}</TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead colSpan={10} className={thClass}>Gram Panchayat Name:</TableHead>
                            <TableHead colSpan={4} className={thClass}>To:</TableHead>
                            <TableHead colSpan={8} className={thClass}></TableHead>
                        </TableRow>
                        <TableRow>
                            <TableHead rowSpan={2} className={thClass}>Date</TableHead>
                            <TableHead rowSpan={2} className={thClass}>SId</TableHead>
                            <TableHead rowSpan={2} className={thClass}>SLength(M)</TableHead>
                            <TableHead colSpan={5} className={thClass}>Chain Mention Lat Long</TableHead>
                            {attrCols.map((a) => (
                                <TableHead key={a.Name} rowSpan={2} className={thClass}>{a.Name}</TableHead>
                            ))}
                            <TableHead rowSpan={2} className={thClass}>Remarks</TableHead>
                        </TableRow>
                        <TableRow>
                            {["From", "To", "Lat", "Long", "Length(M)"].map((lbl) => (
                                <TableHead key={lbl} className={thClass}>{lbl}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map((r, i) => (
                            <TableRow key={i}>
                                <TableCell className={tdClass}>{r.Date}</TableCell>
                                <TableCell className={tdClass}>{h.SublinkCode ?? "NA"}</TableCell>
                                <TableCell className={tdClass}>{h.Target ?? ""}</TableCell>
                                <TableCell className={tdClass}>{r.ChainFrom}</TableCell>
                                <TableCell className={tdClass}>{r.ChainTo}</TableCell>
                                <TableCell className={tdClass}>{r.Lat}</TableCell>
                                <TableCell className={tdClass}>{r.Lang}</TableCell>
                                <TableCell className={tdClass}>{r.Progress}</TableCell>
                                {attrCols.map((a) => (
                                    <TableCell key={a.Name} className={tdClass}>{r.Attributes?.[a.Name] ?? ""}</TableCell>
                                ))}
                                <TableCell className={tdClass}>{r.Comment}</TableCell>
                            </TableRow>
                        ))}
                        {currentPage === totalPages && (
                            <>
                                <TableRow>
                                    <TableCell colSpan={3} className={tdClass + " font-bold"}>Start Point Co-ordinate</TableCell>
                                    <TableCell className={tdClass}>Lat</TableCell>
                                    <TableCell className={tdClass}>{h?.StartLat ?? ""}</TableCell>
                                    <TableCell className={tdClass}>Long</TableCell>
                                    <TableCell className={tdClass}>{h?.StartLong ?? ""}</TableCell>
                                    <TableCell colSpan={2} className={tdClass + " font-bold"}>End Point Co-ordinate</TableCell>
                                    <TableCell className={tdClass}>Lat</TableCell>
                                    <TableCell className={tdClass}>{h?.EndLat ?? ""}</TableCell>
                                    <TableCell className={tdClass}>Long</TableCell>
                                    <TableCell className={tdClass}>{h?.EndLong ?? ""}</TableCell>
                                    <TableCell className={tdClass}>Drum No</TableCell>
                                    <TableCell className={tdClass}></TableCell>
                                    <TableCell className={tdClass}>KML</TableCell>
                                    <TableCell className={tdClass}>View</TableCell>
                                    <TableCell className={tdClass}>Certificate</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className={tdClass}>Particulars</TableCell>
                                    <TableCell colSpan={6} className={tdClass + " text-center font-bold"}>PIA Representative</TableCell>
                                    <TableCell colSpan={6} className={tdClass + " text-center font-bold"}>IE Representative</TableCell>
                                    <TableCell colSpan={6} className={tdClass + " text-center font-bold"}>BSNL Representative</TableCell>
                                </TableRow>
                                {["Signature", "Name", "Designation", "Date"].map((label) => (
                                    <TableRow key={label}>
                                        <TableCell className={tdClass}>{label}:</TableCell>
                                        <TableCell colSpan={6} className={tdClass}></TableCell>
                                        <TableCell colSpan={6} className={tdClass}></TableCell>
                                        <TableCell colSpan={6} className={tdClass}></TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}
                    </TableBody>
                </Table>

                {data?.Rows?.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, data.Rows.length)} of {data.Rows.length} entries
                        </p>
                        <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} className="px-3 py-1 border rounded-md text-sm">Prev</button>
                            {getPageNumbers().map((page) => (
                                <button key={page} onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 border rounded-md text-xs ${currentPage === page ? "bg-primary text-white" : ""}`}>
                                    {page}
                                </button>
                            ))}
                            <button onClick={() => setCurrentPage((p) => p < totalPages ? p + 1 : p)} className="px-3 py-1 border rounded-md text-sm">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


function ProgressTab({
    taskAssignId,
    permissions,
    onSaved,
}: {
    taskAssignId: string;
    permissions: { canUpdate: boolean };
    onSaved: () => void;
}) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        Date: "",
        Progress: "",
        Comment: "",
        Lat: "",
        Lang: "",
        ChainFrom: "",
        ChainTo: "",
    });

    const [attrValues, setAttrValues] = useState<Record<number, string>>({});
    const [dropdownOptions, setDropdownOptions] = useState<Record<number, any[]>>({});

    // CanUpdate LOAD DATA CanUpdate
    useEffect(() => {
        if (!taskAssignId) return;

        setLoading(true);

        fetch(`/api/timeline/progress/new/${taskAssignId}`)
            .then((res) => res.json())
            .then((res) => {
                setData(res);

                setForm((f) => ({
                    ...f,
                    Date: res.Date ?? "",
                }));

                const vals: Record<number, string> = {};
                (res.AttributeValuesDto || []).forEach((a: any) => {
                    vals[a.Id] = a.Value ?? "";
                });
                setAttrValues(vals);
            })
            .finally(() => setLoading(false));
    }, [taskAssignId]);

    // CanUpdate LOAD DROPDOWNS CanUpdate
    useEffect(() => {
        if (!data) return;

        (data.AttributeValuesDto || []).forEach(async (attr: any) => {
            if (attr.ControlTypeId === 2) {
                const res = await fetch(
                    `/api/dropdowns/GetDDList?id=${attr.Id}&code=${attr.Value}&id2=${data.TaskAssignId}`
                );
                const options = await res.json();

                setDropdownOptions((prev) => ({
                    ...prev,
                    [attr.Id]: options,
                }));
            }
        });
    }, [data]);

    // CanUpdate HANDLERS CanUpdate
    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleAttrChange = (id: number, value: string) => {
        setAttrValues((prev) => ({ ...prev, [id]: value }));
    };

    // CanUpdate SAVE CanUpdate
    const handleSave = async () => {
        setSaving(true);

        const payload = {
            Id: 0,
            TaskAssignId: data.TaskAssignId,
            ...form,
            AttributeValuesDto: (data.AttributeValuesDto || []).map((a: any) => ({
                Id: a.Id,
                TaskId: a.TaskId,
                Name: a.Name,
                ControlTypeId: a.ControlTypeId,
                Value: attrValues[a.Id] || "",
            })),
        };

        try {
            const res = await fetch(`/api/timeline/progress/save`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (result.Success) {
                alert("Saved Successfully");
                onSaved();
            } else {
                alert(result.Message);
            }
        } catch {
            alert("Error saving data");
        } finally {
            setSaving(false);
        }
    };

    // CanUpdate UI CanUpdate
    if (!permissions.canUpdate)
        return <p className="p-6 text-gray-400">No permission</p>;

    if (loading) return <p className="p-6">Loading...</p>;

    if (!data) return <p className="p-6 text-red-500">Error loading</p>;

    const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm";
    const labelCls = "text-sm font-medium mb-1 block";

    return (
        <div className="progress-container">

            {/* TOP BUTTONS */}
            <div className="progress-toolbar">
                <button
                    className="btn-primary"
                // onClick={() => handleDownloadTemplate()}
                >
                    Download Template
                </button>
                <button
                    className="btn-primary"
                    onClick={() => {
                        window.open(`/TaskWiseRecord/ExcelUpload?Id=${taskAssignId}`, "_blank");
                    }}
                >
                    Excel Upload
                </button>
            </div>

            {/* FORM GRID */}
            <div className="progress-grid">

                {/* TOTAL PROGRESS */}
                <div>
                    <label className={labelCls}>Total Progress</label>
                    <p className="text-green-600 font-bold">
                        {data.TotalProgress || 0}
                    </p>
                </div>

                {/* DATE */}
                <div>
                    <label className={labelCls}>Date</label>
                    <input
                        type="date"
                        value={form.Date}
                        onChange={(e) => handleChange("Date", e.target.value)}
                        placeholder="dd-mm-yyyy"
                        className={inputCls}
                    />
                </div>

                {/* PROGRESS */}
                <div>
                    <label className={labelCls}>Progress</label>
                    <input
                        type="number"
                        placeholder="Enter progress"
                        value={form.Progress}
                        onChange={(e) => handleChange("Progress", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* COMMENT */}
                <div>
                    <label className={labelCls}>Comment</label>
                    <input
                        type="text"
                        placeholder="Enter comment"
                        value={form.Comment}
                        onChange={(e) => handleChange("Comment", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* LAT */}
                <div>
                    <label className={labelCls}>Lat</label>
                    <input
                        type="text"
                        placeholder="Latitude"
                        value={form.Lat}
                        onChange={(e) => handleChange("Lat", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* LONG */}
                <div>
                    <label className={labelCls}>Long</label>
                    <input
                        type="text"
                        placeholder="Longitude"
                        value={form.Lang}
                        onChange={(e) => handleChange("Lang", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* CHAIN FROM */}
                <div>
                    <label className={labelCls}>Chain From</label>
                    <input
                        type="text"
                        placeholder="Chain From"
                        value={form.ChainFrom}
                        onChange={(e) => handleChange("ChainFrom", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* CHAIN TO */}
                <div>
                    <label className={labelCls}>Chain To</label>
                    <input
                        type="text"
                        placeholder="Chain To"
                        value={form.ChainTo}
                        onChange={(e) => handleChange("ChainTo", e.target.value)}
                        className={inputCls}
                    />
                </div>

                {/* CanUpdate DYNAMIC FIELDS CanUpdate */}
                {(data.AttributeValuesDto || []).map((attr: any) => (
                    <div key={attr.Id}>
                        <label className={labelCls}>{attr.Name}</label>

                        {attr.ControlTypeId === 2 ? (
                            <select
                                value={attrValues[attr.Id] || attr.Value || ""}
                                onChange={(e) =>
                                    handleAttrChange(attr.Id, e.target.value)
                                }
                                className={inputCls}
                            >
                                <option value="">--Select--</option>

                                {(dropdownOptions[attr.Id] || []).map((o: any) => (
                                    <option key={o.Value} value={o.Value}>
                                        {o.Text}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                placeholder={attr.Name}
                                value={attrValues[attr.Id] || ""}
                                onChange={(e) =>
                                    handleAttrChange(attr.Id, e.target.value)
                                }
                                className={inputCls}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* SAVE BUTTON */}
            <div className="flex justify-center mt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                >
                    Save Data
                </button>
            </div>
        </div>
    );
}

// CanUpdate
// DOWNLOAD TAB
// FIX 7: Added onView and onDelete to props signature
// CanUpdate


function DownloadTab({
    id,
}: {
    id: string;
    onView: (id: number) => void;
    onDelete: (id: number) => void;
}) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
    const [selectedRow, setSelectedRow] = useState<any>(null);

    useEffect(() => {
        fetchDownload(id)
            .then(setData)
            .catch(() => setError("Failed to load"))
            .finally(() => setLoading(false));
    }, [id]);

    const columnLabelMap: Record<string, string> = {
        Id: "ID", Date: "Date", Name: "User", ChainFrom: "From", ChainTo: "To",
        ApprovedBy: "Status: Approved by", PendingBy: "Status: Pending by",
        RejectedBy: "Status: Rejected by", ApprovalType: "Approval Type",
        Location: "Location", Progress: "Progress", Comment: "Comment", Images: "Images",
    };

    const fixedCols = ["Id", "Date", "Name", "ChainFrom", "ChainTo",
        "ApprovedBy", "PendingBy", "RejectedBy", "ApprovalType",
        "Location", "Progress", "Comment", "Images"];

    const attrCols = data?.AttributeColumns?.map((a: any) => a.Name) || [];
    const allColumnKeys = [...fixedCols, ...attrCols];
    const allColumns = allColumnKeys.map((key) => ({ key, label: columnLabelMap[key] || key }));

    const filteredData = useMemo(() => {
        if (!data?.Rows) return [];
        return data.Rows.filter((row: any) =>
            allColumns.some((col) =>
                String(row[col.key] || row.Attributes?.[col.key] || "")
                    .toLowerCase().includes(search.toLowerCase())
            )
        );
    }, [data, search]);

    const sortedData = useMemo(() => {
        let arr = [...filteredData];
        if (sortConfig.key) {
            arr.sort((a, b) => {
                const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
                if (!aVal) return 1; if (!bVal) return -1;
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
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(data?.Rows ?? []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "data.xlsx");
    };

    if (loading) return <LoadingState label="Loading download data…" />;
    if (error) return <ErrorState message={error} />;
    if (!data) return null;

    return (
        <div>
            <div className="download-toolbar">
                <button onClick={exportExcel} className="download-btn">Excel</button>
                <input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="download-search"
                />
            </div>

            <div className="card-container overflow-x-auto">
                <Table className="table-main">
                    <TableHeader>
                        <TableRow className="table-header-row">
                            {allColumns.map((col) => (
                                <TableHead
                                    key={col.key}
                                    className="table-head cursor-pointer"
                                    onClick={() => setSortConfig((prev) => ({
                                        key: col.key,
                                        direction: prev.key === col.key && prev.direction === "asc" ? "desc" : "asc",
                                    }))}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {sortConfig.key !== col.key && <FaSort className="text-gray-400" size={12} />}
                                        {sortConfig.key === col.key && sortConfig.direction === "asc" && <FaSortUp className="text-primary" size={12} />}
                                        {sortConfig.key === col.key && sortConfig.direction === "desc" && <FaSortDown className="text-primary" size={12} />}
                                    </div>
                                </TableHead>
                            ))}
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.map((row: any) => (
                            <TableRow key={row.Id}>
                                {allColumns.map((col) => (
                                    <TableCell key={col.key} className="text-xs whitespace-nowrap">
                                        {col.key === "Images"
                                            ? row.Images?.map((_: any, i: number) => <span key={i}>🖼</span>)
                                            : row[col.key] ?? row.Attributes?.[col.key] ?? ""}
                                    </TableCell>
                                ))}


                                <TableCell>
                                    <button
                                        className="bg-blue-600 text-white px-3 py-1 rounded"
                                        onClick={() => setSelectedRow(row)}
                                    >
                                        View
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

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

            {selectedRow && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="overflow-auto max-h-[400px]">

                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold">.</h2>
                                <button onClick={() => setSelectedRow(null)}><X /></button>
                            </div>


                            {/* CONTENT */}
                            <div className="p-4">

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Comment</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        <TableRow>
                                            <TableCell>{selectedRow.Date}</TableCell>
                                            <TableCell>{selectedRow.Progress}</TableCell>
                                            <TableCell>{selectedRow.Name}</TableCell>
                                            <TableCell>{selectedRow.Role || "-"}</TableCell>
                                            <TableCell>{selectedRow.Comment}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>

                                {/* IMAGES */}
                                <div className="mt-4 flex gap-2 flex-wrap">
                                    {selectedRow.Images?.map((img: string, i: number) => (
                                        <img
                                            key={i}
                                            src={img}
                                            className="w-24 h-24 object-cover border rounded"
                                        />
                                    ))}
                                </div>

                                <div className="text-right mt-4">
                                    <button
                                        className="bg-gray-400 text-white px-4 py-1 rounded"
                                        onClick={() => setSelectedRow(null)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}


// CanUpdate
// CERTIFICATE TAB
// CanUpdate

function CertificateTab() {
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = () => {
        if (!file) { alert("Please select a PDF file to upload."); return; }
        if (file.type !== "application/pdf") { alert("Please select a PDF file to upload."); return; }
        alert("File ready to upload");
    };

    return (
        <div className="certificate-container">
            <div className="certificate-row">
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <button onClick={handleUpload} className="btn-primary">Upload</button>
            </div>
            <p className="certificate-text">No Files available.</p>
        </div>
    );
}

// CanUpdate
// SHARED SMALL COMPONENTS
// CanUpdate

function LoadingState({ label }: { label: string }) {
    return <div className="flex items-center gap-2.5 p-8 text-gray-400 text-sm">{label}</div>;
}
function ErrorState({ message }: { message: string }) {
    return <p className="text-red-500 p-6 text-sm">{message}</p>;
}
function ActionButton({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} style={{ background: color }}
            className="text-white rounded px-2.5 py-1 text-xs font-semibold hover:opacity-85 transition-opacity">
            {children}
        </button>
    );
}
function PageBtn({ onClick, disabled, active, children }: {
    onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}) {
    return (
        <button onClick={onClick} disabled={disabled}
            className={`px-3 py-1 border rounded-md text-sm transition-colors
                ${active ? "bg-primary text-white border-primary" : "border-stroke hover:bg-primary hover:text-white dark:border-dark-3 dark:text-white"}
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
            {children}
        </button>
    );
}
function InfoRow({ label, value }: { label: string; value: any }) {
    return (
        <div className="flex gap-1.5 mb-1.5 text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-400 min-w-[90px] shrink-0">{label}:</span>
            <span className="font-normal text-gray-500 dark:text-white">{value ?? ""}</span>
        </div>
    );
}


// CanUpdate
// STYLE TOKENS
// CanUpdate

const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
    zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const modalBoxStyle: React.CSSProperties = {
    background: "#fff", borderRadius: 12, width: "100%", maxWidth: 780,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)", overflow: "hidden",
};
const modalHeaderStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px",
};
const modalFooterStyle: React.CSSProperties = {
    display: "flex", justifyContent: "flex-end", gap: 12, padding: "14px 24px",
    borderTop: "1px solid #e5e7eb", background: "#f8fafc",
};
const closeBtn: React.CSSProperties = {
    background: "none", border: "none", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px",
};


// CanUpdate
// TAB CONFIG
// CanUpdate

type TabKey = "table" | "map" | "measurement" | "progress" | "download" | "certificate";
const TABS: { key: TabKey; label: string }[] = [
    { key: "table", label: "Table" },
    { key: "map", label: "Map" },
    { key: "measurement", label: "Measurement Book" },
    { key: "progress", label: "Progress" },
    { key: "download", label: "Download" },
    { key: "certificate", label: "Certificate" },
];


// CanUpdate
// MAIN PAGE
// All fixes applied here
// CanUpdate

export default function TimelinePage() {
    const searchParams = useSearchParams();
    const id = searchParams.get("Id") ?? "";
    const spanType = searchParams.get("SpanType") ?? "";

    const [activeTab, setActiveTab] = useState<TabKey>("table");
    const [tabsLoaded, setTabsLoaded] = useState<Set<TabKey>>(new Set(["table"]));
    const [header, setHeader] = useState<TimelineHeader | null>(null);
    const [headerLoading, setHdrLoading] = useState(true);

    // FIX 3: Default permissions with camelCase keys, matching the Permissions interface
    const [permissions, setPermissions] = useState<Permissions>({
        canRead: true,
        canView: true,
        canUpdate: true,
        canDelete: true,
    });

    const [tableRefresh, setTableRefresh] = useState(0);

    // Edit modal state
    const [editId, setEditId] = useState<number | null>(null);
    const [editData, setEditData] = useState<any>(null);
    const [editOpen, setEditOpen] = useState(false);

    // View / approval-log modal state
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewHtml, setViewHtml] = useState("");
    const [viewTitle, setViewTitle] = useState("");

    // Action / approval-template modal state
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionHtml, setActionHtml] = useState("");
    const [actionTitle, setActionTitle] = useState("");

    useEffect(() => {
        if (!id) return;
        fetchTimelineHeader(id, spanType)
            .then(setHeader).catch(console.error).finally(() => setHdrLoading(false));
        // FIX 3: fetchPermissions now returns camelCase, assigned directly
        fetchPermissions().then(setPermissions).catch(console.error);
    }, [id, spanType]);

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        setTabsLoaded((prev) => new Set([...prev, tab]));
    };

    const handleView = async (progressId: number) => {
        try {
            const html = await fetchApprovalLog(progressId);
            setViewHtml(html);
            setViewTitle("Approval Log");
            setViewModalOpen(true);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleEdit = async (progressId: number) => {
        try {
            const res = await fetchProgress(progressId);  
            setEditId(progressId);
            setEditData(res);
            setEditOpen(true);
        } catch (e: any) {
            console.error("Edit load error:", e);
            alert("Failed to load progress data for editing.");
        }
    };

    // Action button → Approval Template Modal
    const handleAction = async (progressId: number, approvalTypeId: number) => {
        try {
            const html = await fetchApprovalTemplate(progressId, id, approvalTypeId);
            setActionHtml(html);
            setActionTitle("Approval");
            setActionModalOpen(true);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleBulkApprove = async (ids: number[]) => {
        try {
            const html = await fetchBulkApprovalTemplate(ids.join(","), 0);
            setActionHtml(html);
            setActionTitle("Bulk Approval");
            setActionModalOpen(true);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleBulkDelete = async (ids: number[]) => {
        try {
            await bulkDeleteProgressApi(ids);
            setTableRefresh((n) => n + 1);
        } catch {
            alert("Bulk delete failed");
        }
    };

    const handleDownloadDelete = async (rowId: number) => {
        if (!confirm("Are you sure you want to delete?")) return;
        await deleteProgressApi(rowId);
        setTableRefresh((n) => n + 1);
    };

    return (
        <div className="page-container">

            {/* Header Card */}
            <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm mb-5 overflow-hidden">
                {headerLoading ? (
                    <LoadingState label="Loading task details…" />
                ) : !header ? (
                    <ErrorState message="No data found" />
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <p className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2.5">Task Details</p>
                                <InfoRow label="Task Name" value={header.TaskName} />
                                <InfoRow label="Estimated" value={header.Target} />
                                <InfoRow label="Completed" value={header.progress} />
                                <InfoRow label="Approved" value={header.fullyapproved} />
                                <InfoRow label="Assigned To" value={header.Name} />
                                <InfoRow label={spanLabel(header.SpanType)} value={`${header.LinkCode}/${header.LinkName}`} />
                                <InfoRow label="Span" value={`${header.SublinkCode}/${header.SublinkName}`} />
                            </div>
                            <div>
                                <p className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2.5">Duration</p>
                                <InfoRow label="Start Date" value={header.StartDate} />
                                <InfoRow label="End Date" value={header.EndDate} />
                                <InfoRow label="Days" value={header.Days} />
                            </div>
                            <div>
                                <p className="font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2.5">Progress</p>
                                <div className="mt-2">
                                    <div className="flex justify-between text-sm font-bold mb-1.5">
                                        <span className="text-gray-700 dark:text-white">Completion</span>
                                        <span className="text-gray-700 dark:text-white">{header.Completed}%</span>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-dark-3 rounded-full h-3.5 overflow-hidden">
                                        <div
                                            style={{
                                                width: `${Math.min(header.Completed, 100)}%`,
                                                background: header.Completed >= 100 ? "#10b981" : header.Completed > 50 ? "#f59e0b" : "#3b82f6",
                                                transition: "width 0.6s ease",
                                            }}
                                            className="h-full rounded-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Card */}
            <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 pt-3">
                    <div role="tablist" className="flex flex-wrap border-b border-stroke dark:border-dark-3 gap-6">
                        {TABS.map((tab) => (
                            <button
                                key={tab.key}
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                data-active={String(activeTab === tab.key)}
                                onClick={() => switchTab(tab.key)}
                                className="font-medium pb-[7px] border-b-2 border-transparent
                                           hover:border-primary hover:text-primary
                                           data-[active=true]:border-primary data-[active=true]:text-primary
                                           text-sm whitespace-nowrap transition-colors text-gray-500 dark:text-gray-400"
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-5">

                    <div role="tabpanel" hidden={activeTab !== "table"}>
                        <TableTab
                            taskAssignId={id}
                            onAction={handleAction}
                            onView={handleView}
                            onEdit={handleEdit}
                            onBulkApprove={handleBulkApprove}
                            onBulkDelete={handleBulkDelete}
                            refreshKey={tableRefresh}
                        />
                    </div>

                    {tabsLoaded.has("map") && (
                        <div role="tabpanel" hidden={activeTab !== "map"}>
                            <MapTab loaded={tabsLoaded.has("map")} />
                        </div>
                    )}

                    {tabsLoaded.has("measurement") && (
                        <div role="tabpanel" hidden={activeTab !== "measurement"}>
                            <MeasurementBookTab id={id} spanType={spanType} />
                        </div>
                    )}

                    {tabsLoaded.has("progress") && (
                        <div role="tabpanel" hidden={activeTab !== "progress"}>
                            <ProgressTab
                                taskAssignId={id}
                                permissions={permissions}
                                onSaved={() => setTableRefresh((n) => n + 1)}
                            />
                        </div>
                    )}

                    {tabsLoaded.has("download") && (
                        <div role="tabpanel" hidden={activeTab !== "download"}>

                            <DownloadTab
                                id={id}
                                onView={handleView}
                                onDelete={handleDownloadDelete}
                            />
                        </div>
                    )}

                    {tabsLoaded.has("certificate") && (
                        <div role="tabpanel" hidden={activeTab !== "certificate"}>
                            <CertificateTab />
                        </div>
                    )}
                </div>
            </div>

            {/* FIX 2 + FIX 6: Edit Progress Modal — data from /progress/[id] endpoint */}
            {editData && (
                <ProgressModal
                    open={editOpen}
                    onClose={() => { setEditOpen(false); setEditData(null); setEditId(null); }}
                    editId={editId}
                    taskAssignId={editData.TaskAssignId}
                    initial={editData}
                    // FIX 6: /progress/[id] returns Attributes array (not AttributeValuesDto)
                    attributes={editData.Attributes ?? editData.AttributeValuesDto ?? []}
                    onSaved={() => {
                        setEditOpen(false);
                        setEditData(null);
                        setEditId(null);
                        setTableRefresh((n) => n + 1);  // ← refresh table after save
                    }}
                    title="Edit Progress"
                />
            )}

            {/* Approval Log Modal */}
            <ApprovalLogModal
                open={viewModalOpen}
                html={viewHtml}
                title={viewTitle}
                onClose={() => { setViewModalOpen(false); setViewHtml(""); }}
            />

            {/* Approval Action Modal */}
            <ApprovalActionModal
                open={actionModalOpen}
                html={actionHtml}
                title={actionTitle}
                onClose={() => { setActionModalOpen(false); setActionHtml(""); }}
            />
        </div>
    );
}