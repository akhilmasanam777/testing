"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Info, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { FaSort, FaSortDown, FaSortUp } from "react-icons/fa";
import * as XLSX from "xlsx";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Permissions = {
  CanRead: boolean;
  CanCreate: boolean;
  CanUpdate: boolean;
  CanDelete: boolean;
};

type DropdownItem = {
  Value: string;
  Text: string;
};

type RowRequestItem = {
  Id: number;
  RowRequestTitle?: string;
  ZoneId?: number | string;
  ZoneName?: string;
  DistrictId?: number | string;
  DistrictName?: string;
  BlockId?: number | string;
  BlockName?: string;
  AppliedThrough?: number | string;
  AppliedThroughStr?: string;
  ApprovedStatus?: number | string;
  ApprovedStatusStr?: string;
  RowAuthority?: number | string;
  RowAuthorityStr?: string;
  Ufiles?: string;
  CreatedDate?: string;
  SummaryOftheRequest?: string;
  Comment?: string;
  [key: string]: any;
};

type RowRequestForm = {
  Id: number;
  RowRequestTitle: string;
  ZoneId: string;
  DistrictId: string;
  BlockId: string;
  AppliedThrough: string;
  RowAuthority: string;
  CreatedDate: string;
  SummaryOftheRequest: string;
  ApprovedStatus: string;
  Comment: string;
};

type RowRequestLog = {
  RowRequestId?: string;
  UserName?: string;
  StatusName?: string;
  Comment?: string;
  Date?: string;
};

type ColumnDef = {
  key: keyof RowRequestItem;
  label: string;
};

const BACKEND_ORIGIN = "https://bnpapp.traxion.in";
const ROWS_PER_PAGE = 10;

const DEFAULT_PERMISSIONS: Permissions = {
  CanRead: true,
  CanCreate: true,
  CanUpdate: true,
  CanDelete: true,
};

const INITIAL_FORM: RowRequestForm = {
  Id: 0,
  RowRequestTitle: "",
  ZoneId: "",
  DistrictId: "",
  BlockId: "",
  AppliedThrough: "",
  RowAuthority: "",
  CreatedDate: "",
  SummaryOftheRequest: "",
  ApprovedStatus: "",
  Comment: "",
};

const COLUMNS: ColumnDef[] = [
  { key: "RowRequestTitle", label: "Title" },
  { key: "ZoneName", label: "Zone Name" },
  { key: "DistrictName", label: "District Name" },
  { key: "BlockName", label: "Block Name" },
  { key: "AppliedThroughStr", label: "Applied" },
  { key: "ApprovedStatusStr", label: "Status" },
  { key: "RowAuthorityStr", label: "Row Authority" },
];

const inputClass =
  "w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white";

function resolveFileUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${BACKEND_ORIGIN}${value}`;
  return `${BACKEND_ORIGIN}/${value}`;
}

function rowAttachment(row: RowRequestItem) {
  return row.Ufiles || "";
}

function toDateInput(value?: string) {
  if (!value) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function cellValue(row: RowRequestItem, key: keyof RowRequestItem) {
  return row[key] ?? "";
}

function pageNumbers(currentPage: number, totalPages: number) {
  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let page = start; page <= end; page += 1) pages.push(page);
  return pages;
}

function shortText(value?: string, max = 24) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function LogModal({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: RowRequestLog[];
  onClose: () => void;
}) {
  const [activeComment, setActiveComment] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-[920px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            {title || "Row Request Log"}
          </h2>
          <button type="button" title="Close" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-auto">
          <Table className="table-main">
            <TableHeader>
              <TableRow className="table-header-row">
                <TableHead className="table-head">#</TableHead>
                <TableHead className="table-head">Row Request Id</TableHead>
                <TableHead className="table-head">User</TableHead>
                <TableHead className="table-head">Status</TableHead>
                <TableHead className="table-head">Remarks</TableHead>
                <TableHead className="table-head">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => (
                  <TableRow key={`${row.RowRequestId}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.RowRequestId || "-"}</TableCell>
                    <TableCell>{row.UserName || "-"}</TableCell>
                    <TableCell>{row.StatusName || "-"}</TableCell>
                    <TableCell>
                      {row.Comment ? (
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => setActiveComment(row.Comment || "")}
                        >
                          {shortText(row.Comment, 18)}
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(row.Date)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No log data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {activeComment && (
          <div className="rounded-md border border-stroke bg-gray-50 p-3 text-sm dark:border-dark-3 dark:bg-dark-2">
            <div className="mb-2 flex items-center justify-between font-semibold">
              <span>Full Comment</span>
              <button
                type="button"
                title="Close comment"
                aria-label="Close comment"
                onClick={() => setActiveComment("")}
              >
                <X size={16} />
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words">{activeComment}</p>
          </div>
        )}

        <div className="btn-group">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RowRequestPage() {
  const [rows, setRows] = useState<RowRequestItem[]>([]);
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<RowRequestForm>(INITIAL_FORM);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [existingAttachment, setExistingAttachment] = useState("");

  const [zoneOptions, setZoneOptions] = useState<DropdownItem[]>([]);
  const [districtOptions, setDistrictOptions] = useState<DropdownItem[]>([]);
  const [blockOptions, setBlockOptions] = useState<DropdownItem[]>([]);
  const [appliedOptions, setAppliedOptions] = useState<DropdownItem[]>([]);
  const [authorityOptions, setAuthorityOptions] = useState<DropdownItem[]>([]);
  const [approvalStatusOptions, setApprovalStatusOptions] = useState<DropdownItem[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [logRows, setLogRows] = useState<RowRequestLog[]>([]);
  const [logTitle, setLogTitle] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const showActions = permissions.CanUpdate || permissions.CanDelete;

  const fetchOptions = useCallback(async (type: string, params: Record<string, string> = {}) => {
    const query = new URLSearchParams({ type, ...params });
    const res = await fetch(`/api/row-request?${query.toString()}`, { cache: "no-store" });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/row-request", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        if (json?.permissions) setPermissions({ ...DEFAULT_PERMISSIONS, ...json.permissions });
        setRows([]);
        setError(json?.error || "Failed to load row requests");
        return;
      }

      setRows(Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []);
      if (json?.permissions) {
        setPermissions({ ...DEFAULT_PERMISSIONS, ...json.permissions });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load row requests");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDropdowns = useCallback(
    async (seed: { zoneId?: string; districtId?: string } = {}) => {
      setDropdownLoading(true);

      try {
        const [zones, districts, blocks, applied, authorities, statuses] = await Promise.all([
          fetchOptions("zones"),
          fetchOptions("districts", seed.zoneId ? { zoneId: seed.zoneId } : {}),
          fetchOptions("blocks", seed.districtId ? { districtId: seed.districtId } : {}),
          fetchOptions("appliedThrough"),
          fetchOptions("rowAuthority"),
          fetchOptions("approvedStatus"),
        ]);

        setZoneOptions(zones);
        setDistrictOptions(districts);
        setBlockOptions(blocks);
        setAppliedOptions(applied);
        setAuthorityOptions(authorities);
        setApprovalStatusOptions(statuses);
      } finally {
        setDropdownLoading(false);
      }
    },
    [fetchOptions],
  );

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();

    return rows.filter((row) =>
      COLUMNS.some((column) =>
        String(cellValue(row, column.key)).toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = String(cellValue(a, sortConfig.key as keyof RowRequestItem) ?? "");
      const bValue = String(cellValue(b, sortConfig.key as keyof RowRequestItem) ?? "");

      return sortConfig.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [filteredData, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return sortedData.slice(start, start + ROWS_PER_PAGE);
  }, [currentPage, sortedData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function updateForm(key: keyof RowRequestForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(INITIAL_FORM);
    setUploadFile(null);
    setExistingAttachment("");
    setFileInputKey((key) => key + 1);
    setFormError("");
  }

  async function openRowRequestForm(id = 0) {
    setOpen(true);
    setModalLoading(true);
    setFormError("");
    setUploadFile(null);
    setExistingAttachment("");
    setFileInputKey((key) => key + 1);
    setForm(INITIAL_FORM);

    try {
      if (id > 0) {
        const res = await fetch(`/api/row-request?id=${id}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setFormError(data?.error || "Failed to load row request");
          return;
        }

        const zoneId = String(data.ZoneId ?? "");
        const districtId = String(data.DistrictId ?? "");

        await loadDropdowns({ zoneId, districtId });
        setForm({
          Id: Number(data.Id ?? id),
          RowRequestTitle: data.RowRequestTitle ?? "",
          ZoneId: zoneId,
          DistrictId: districtId,
          BlockId: String(data.BlockId ?? ""),
          AppliedThrough: String(data.AppliedThrough ?? ""),
          RowAuthority: String(data.RowAuthority ?? ""),
          CreatedDate: toDateInput(data.CreatedDate),
          SummaryOftheRequest: data.SummaryOftheRequest ?? "",
          ApprovedStatus: String(data.ApprovedStatus ?? ""),
          Comment: data.Comment ?? "",
        });
        setExistingAttachment(rowAttachment(data));
      } else {
        await loadDropdowns();
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to open row request form");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleZoneChange(value: string) {
    updateForm("ZoneId", value);
    updateForm("DistrictId", "");
    updateForm("BlockId", "");
    setBlockOptions([]);

    const districts = await fetchOptions("districts", value ? { zoneId: value } : {});
    setDistrictOptions(districts);
  }

  async function handleDistrictChange(value: string) {
    updateForm("DistrictId", value);
    updateForm("BlockId", "");

    const blocks = await fetchOptions("blocks", value ? { districtId: value } : {});
    setBlockOptions(blocks);
  }

  async function saveRowRequest() {
    setSaving(true);
    setFormError("");

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value ?? ""));
      });

      if (uploadFile) {
        formData.append("files", uploadFile);
      }

      const res = await fetch("/api/row-request", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data?.error || "Save failed");
        return;
      }

      setOpen(false);
      resetForm();
      await loadRows();
    } catch (err: any) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRowRequest(id: number) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const res = await fetch(`/api/row-request?id=${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }

    setRows((prev) => prev.filter((row) => row.Id !== id));
  }

  async function viewLog(row: RowRequestItem) {
    try {
      const res = await fetch(`/api/row-request?logId=${row.Id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Failed to load logs");
        return;
      }

      setLogRows(Array.isArray(data) ? data : []);
      setLogTitle(row.RowRequestTitle || "Row Request Log");
      setLogOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to load logs");
    }
  }

  function exportExcel() {
    const exportRows = rows.map((row) =>
      COLUMNS.reduce<Record<string, any>>((acc, column) => {
        acc[column.label] = cellValue(row, column.key);
        return acc;
      }, {}),
    );

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Row Request");
    XLSX.writeFile(workbook, "row-request.xlsx");
  }

  if (loading) {
    return <div className="page-container">Loading row requests...</div>;
  }

  if (!permissions.CanRead) {
    return <div className="page-container text-red-500">Access denied</div>;
  }

  return (
    <div className="page-container">
      <div className="all-pages-header">
        <h1 className="dashboard-title-light">Row Request</h1>

        {(permissions.CanUpdate || permissions.CanCreate) && (
          <button type="button" onClick={() => openRowRequestForm()} className="btn-primary-export gap-2">
            <Plus size={16} />
            Row Request
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="btn-primary-export">
            Excel
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-dark dark:text-white">Search:</label>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="card-container">
        <Table className="table-main">
          <TableHeader>
            <TableRow className="table-header-row">
              <TableHead className="table-head">S No</TableHead>
              {COLUMNS.map((column) => (
                <TableHead
                  key={String(column.key)}
                  className="table-head cursor-pointer"
                  onClick={() =>
                    setSortConfig((prev) => ({
                      key: String(column.key),
                      direction:
                        prev.key === column.key && prev.direction === "asc" ? "desc" : "asc",
                    }))
                  }
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {sortConfig.key !== column.key && <FaSort className="text-gray-400" size={12} />}
                    {sortConfig.key === column.key && sortConfig.direction === "asc" && (
                      <FaSortUp className="text-primary" size={12} />
                    )}
                    {sortConfig.key === column.key && sortConfig.direction === "desc" && (
                      <FaSortDown className="text-primary" size={12} />
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="table-head">File</TableHead>
              <TableHead className="table-head">Log</TableHead>
              {showActions && <TableHead className="table-head">Action</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((row, index) => {
                const attachment = resolveFileUrl(rowAttachment(row));

                return (
                  <TableRow key={`${row.Id}-${index}`}>
                    <TableCell>{(currentPage - 1) * ROWS_PER_PAGE + index + 1}</TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell key={String(column.key)}>
                        {String(cellValue(row, column.key) || "-")}
                      </TableCell>
                    ))}
                    <TableCell>
                      {attachment ? (
                        <a
                          href={attachment}
                          target="_blank"
                          rel="noreferrer"
                          title="Open file"
                          aria-label="Open file"
                          className="inline-flex text-gray-500 hover:text-primary"
                        >
                          <Download size={17} />
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        title="View log"
                        aria-label="View log"
                        onClick={() => viewLog(row)}
                        className="text-gray-500 hover:text-primary"
                      >
                        <Info size={17} />
                      </button>
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-4">
                          {permissions.CanUpdate && (
                            <button
                              type="button"
                              title="Edit row request"
                              aria-label="Edit row request"
                              onClick={() => openRowRequestForm(row.Id)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {permissions.CanDelete && (
                            <button
                              type="button"
                              title="Delete row request"
                              aria-label="Delete row request"
                              onClick={() => deleteRowRequest(row.Id)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 3 + (showActions ? 1 : 0)} className="text-center">
                  No Data Found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {sortedData.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-2">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * ROWS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)} of {sortedData.length} entries
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                className="rounded-md border px-3 py-1 text-sm hover:bg-primary hover:text-white"
              >
                Previous
              </button>
              {pageNumbers(currentPage, totalPages).map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    currentPage === page ? "bg-primary text-white" : "hover:bg-primary hover:text-white"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => (page < totalPages ? page + 1 : page))}
                className="rounded-md border px-3 py-1 text-sm hover:bg-primary hover:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="modal-overlay">
          <div className="modal-box max-w-[920px]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Row Request</h2>
              <button
                type="button"
                title="Close"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                <X />
              </button>
            </div>

            {modalLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={18} />
                Loading row request details...
              </div>
            ) : (
              <>
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Title</label>
                    <input
                      value={form.RowRequestTitle}
                      onChange={(event) => updateForm("RowRequestTitle", event.target.value)}
                      className={inputClass}
                      placeholder="Title"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Zone</label>
                    <select
                      value={form.ZoneId}
                      onChange={(event) => handleZoneChange(event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {zoneOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">District</label>
                    <select
                      value={form.DistrictId}
                      onChange={(event) => handleDistrictChange(event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {districtOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Block</label>
                    <select
                      value={form.BlockId}
                      onChange={(event) => updateForm("BlockId", event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {blockOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Applied Through</label>
                    <select
                      value={form.AppliedThrough}
                      onChange={(event) => updateForm("AppliedThrough", event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {appliedOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Row Authority</label>
                    <select
                      value={form.RowAuthority}
                      onChange={(event) => updateForm("RowAuthority", event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {authorityOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Attachment</label>
                    <input
                      key={fileInputKey}
                      type="file"
                      onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                      className={inputClass}
                    />
                    {existingAttachment && (
                      <a
                        href={resolveFileUrl(existingAttachment)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <Download size={14} />
                        Existing attachment
                      </a>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Applied Date</label>
                    <input
                      type="date"
                      value={form.CreatedDate}
                      onChange={(event) => updateForm("CreatedDate", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium">Summary of the Request</label>
                    <textarea
                      value={form.SummaryOftheRequest}
                      maxLength={950}
                      onChange={(event) => updateForm("SummaryOftheRequest", event.target.value)}
                      className={`${inputClass} min-h-[96px]`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{form.SummaryOftheRequest.length}/950</p>
                  </div>
                </div>

                {form.Id > 0 && (
                  <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Status</label>
                        <select
                          value={form.ApprovedStatus}
                          onChange={(event) => updateForm("ApprovedStatus", event.target.value)}
                          className={inputClass}
                          disabled={dropdownLoading}
                        >
                          <option value="">Select</option>
                          {approvalStatusOptions.map((option, index) => (
                            <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                              {option.Text}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Comment</label>
                        <textarea
                          value={form.Comment}
                          maxLength={950}
                          onChange={(event) => updateForm("Comment", event.target.value)}
                          className={`${inputClass} min-h-[88px]`}
                        />
                        <p className="mt-1 text-xs text-gray-500">{form.Comment.length}/950</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="btn-group">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                  <button type="button" onClick={saveRowRequest} disabled={saving} className="btn-primary">
                    {saving ? "Saving..." : "Submit Details"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {logOpen && <LogModal title={logTitle} rows={logRows} onClose={() => setLogOpen(false)} />}
    </div>
  );
}
