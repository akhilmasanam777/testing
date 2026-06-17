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

type InvoiceItem = {
  Id: number;
  InvoiceID?: string;
  InvoiceDate?: string;
  Subject?: string;
  ClassificationType?: number | string;
  ClassificationTypeStr?: string;
  InvoiceType?: number | string;
  InvoiceTypeStr?: string;
  InvAmount?: number | string;
  ApprovedStatus?: number | string;
  ApprovedStatusStr?: string;
  InvAttachment?: string;
  INVFile?: string;
  Comments?: string;
  UpdateComments?: string;
  [key: string]: any;
};

type InvoiceForm = {
  Id: number;
  InvoiceID: string;
  InvoiceDate: string;
  InvAmount: string;
  ClassificationType: string;
  InvoiceType: string;
  Subject: string;
  Comments: string;
  ApprovedStatus: string;
  UpdateComments: string;
};

type InvoiceLog = {
  InvoiceId?: string;
  UserName?: string;
  StatusName?: string;
  Comment?: string;
  Date?: string;
};

type ColumnDef = {
  key: keyof InvoiceItem;
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

const INITIAL_FORM: InvoiceForm = {
  Id: 0,
  InvoiceID: "",
  InvoiceDate: "",
  InvAmount: "",
  ClassificationType: "",
  InvoiceType: "",
  Subject: "",
  Comments: "",
  ApprovedStatus: "",
  UpdateComments: "",
};

const COLUMNS: ColumnDef[] = [
  { key: "InvoiceID", label: "Invoice Id" },
  { key: "InvoiceDate", label: "Invoice Date" },
  { key: "Subject", label: "Subject" },
  { key: "ClassificationTypeStr", label: "OPEX/CAPEX" },
  { key: "InvoiceTypeStr", label: "Invoice Type" },
  { key: "InvAmount", label: "Amount" },
  { key: "ApprovedStatusStr", label: "Status" },
];

const inputClass =
  "w-full rounded-md border border-stroke bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-dark-3 dark:bg-dark-2 dark:text-white";

function resolveFileUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${BACKEND_ORIGIN}${value}`;
  return `${BACKEND_ORIGIN}/${value}`;
}

function invoiceAttachment(row: InvoiceItem) {
  return row.InvAttachment || row.INVFile || "";
}

function toDateInput(value?: string) {
  if (!value) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatDateOnly(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
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

function formatAmount(value?: number | string) {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return String(value);

  return numeric.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function cellValue(row: InvoiceItem, key: keyof InvoiceItem) {
  const value = row[key];
  if (key === "InvoiceDate") return formatDateOnly(String(value ?? ""));
  if (key === "InvAmount") return formatAmount(value);
  return value ?? "";
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
  rows: InvoiceLog[];
  onClose: () => void;
}) {
  const [activeComment, setActiveComment] = useState("");

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-[920px]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            {title || "Invoice Log"}
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
                <TableHead className="table-head">Invoice Id</TableHead>
                <TableHead className="table-head">User</TableHead>
                <TableHead className="table-head">Status</TableHead>
                <TableHead className="table-head">Remarks</TableHead>
                <TableHead className="table-head">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => (
                  <TableRow key={`${row.InvoiceId}-${index}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{row.InvoiceId || "-"}</TableCell>
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

export default function InvoiceModulePage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
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
  const [form, setForm] = useState<InvoiceForm>(INITIAL_FORM);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [existingAttachment, setExistingAttachment] = useState("");

  const [classificationOptions, setClassificationOptions] = useState<DropdownItem[]>([]);
  const [invoiceTypeOptions, setInvoiceTypeOptions] = useState<DropdownItem[]>([]);
  const [approvalStatusOptions, setApprovalStatusOptions] = useState<DropdownItem[]>([]);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [logRows, setLogRows] = useState<InvoiceLog[]>([]);
  const [logTitle, setLogTitle] = useState("");
  const [logOpen, setLogOpen] = useState(false);

  const showActions = permissions.CanUpdate || permissions.CanDelete;

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/invoice-module", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        if (json?.permissions) setPermissions({ ...DEFAULT_PERMISSIONS, ...json.permissions });
        setInvoices([]);
        setError(json?.error || "Failed to load invoices");
        return;
      }

      setInvoices(Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []);
      if (json?.permissions) {
        setPermissions({ ...DEFAULT_PERMISSIONS, ...json.permissions });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async (type: string) => {
    const res = await fetch(`/api/invoice-module?type=${type}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  const loadDropdowns = useCallback(async () => {
    setDropdownLoading(true);
    try {
      const [classification, invoiceTypes, approvalStatuses] = await Promise.all([
        fetchOptions("classification"),
        fetchOptions("invoiceType"),
        fetchOptions("approvalStatus"),
      ]);

      setClassificationOptions(classification);
      setInvoiceTypeOptions(invoiceTypes);
      setApprovalStatusOptions(approvalStatuses);
    } finally {
      setDropdownLoading(false);
    }
  }, [fetchOptions]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const filteredData = useMemo(() => {
    const query = search.toLowerCase();

    return invoices.filter((row) =>
      COLUMNS.some((column) =>
        String(cellValue(row, column.key)).toLowerCase().includes(query),
      ),
    );
  }, [invoices, search]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = String(cellValue(a, sortConfig.key as keyof InvoiceItem) ?? "");
      const bValue = String(cellValue(b, sortConfig.key as keyof InvoiceItem) ?? "");

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

  function resetForm() {
    setForm(INITIAL_FORM);
    setInvoiceFile(null);
    setExistingAttachment("");
    setFileInputKey((key) => key + 1);
    setFormError("");
  }

  async function openInvoiceForm(id = 0) {
    setOpen(true);
    setModalLoading(true);
    setFormError("");
    setInvoiceFile(null);
    setExistingAttachment("");
    setFileInputKey((key) => key + 1);
    setForm(INITIAL_FORM);

    try {
      const dropdownPromise = loadDropdowns();

      if (id > 0) {
        const res = await fetch(`/api/invoice-module?id=${id}`, { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          setFormError(data?.error || "Failed to load invoice");
          return;
        }

        await dropdownPromise;
        setForm({
          Id: Number(data.Id ?? id),
          InvoiceID: data.InvoiceID ?? "",
          InvoiceDate: toDateInput(data.InvoiceDate),
          InvAmount: String(data.InvAmount ?? ""),
          ClassificationType: String(data.ClassificationType ?? ""),
          InvoiceType: String(data.InvoiceType ?? ""),
          Subject: data.Subject ?? "",
          Comments: data.Comments ?? "",
          ApprovedStatus: String(data.ApprovedStatus ?? ""),
          UpdateComments: data.UpdateComments ?? "",
        });
        setExistingAttachment(invoiceAttachment(data));
      } else {
        await dropdownPromise;
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to open invoice form");
    } finally {
      setModalLoading(false);
    }
  }

  async function saveInvoice() {
    setSaving(true);
    setFormError("");

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, String(value ?? ""));
      });

      if (invoiceFile) {
        formData.append("files", invoiceFile);
      }

      const res = await fetch("/api/invoice-module", {
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
      await loadInvoices();
    } catch (err: any) {
      setFormError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const res = await fetch(`/api/invoice-module?id=${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Delete failed");
      return;
    }

    setInvoices((prev) => prev.filter((row) => row.Id !== id));
  }

  async function viewLog(row: InvoiceItem) {
    try {
      const res = await fetch(`/api/invoice-module?logId=${row.Id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Failed to load logs");
        return;
      }

      setLogRows(Array.isArray(data) ? data : []);
      setLogTitle(row.InvoiceID || "Invoice Log");
      setLogOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to load logs");
    }
  }

  function exportExcel() {
    const rows = invoices.map((invoice) =>
      COLUMNS.reduce<Record<string, any>>((acc, column) => {
        acc[column.label] = cellValue(invoice, column.key);
        return acc;
      }, {}),
    );

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice");
    XLSX.writeFile(workbook, "invoice-module.xlsx");
  }

  function updateForm(key: keyof InvoiceForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="page-container">Loading invoices...</div>;
  }

  if (!permissions.CanRead) {
    return <div className="page-container text-red-500">Access denied</div>;
  }

  return (
    <div className="page-container">
      <div className="all-pages-header">
        <h1 className="dashboard-title-light">Invoice</h1>

        {(permissions.CanUpdate || permissions.CanCreate) && (
          <button type="button" onClick={() => openInvoiceForm()} className="btn-primary-export gap-2">
            <Plus size={16} />
            Invoice
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
              <TableHead className="table-head">Attachment</TableHead>
              <TableHead className="table-head">Log</TableHead>
              {showActions && <TableHead className="table-head">Action</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((row, index) => {
                const attachment = resolveFileUrl(invoiceAttachment(row));

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
                          title="Open attachment"
                          aria-label="Open attachment"
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
                              title="Edit invoice"
                              aria-label="Edit invoice"
                              onClick={() => openInvoiceForm(row.Id)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              <Pencil size={16} />
                            </button>
                          )}
                          {permissions.CanDelete && (
                            <button
                              type="button"
                              title="Delete invoice"
                              aria-label="Delete invoice"
                              onClick={() => deleteInvoice(row.Id)}
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
              <h2 className="text-lg font-semibold text-dark dark:text-white">Invoice</h2>
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
                Loading invoice details...
              </div>
            ) : (
              <>
                {formError && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Invoice Id</label>
                    <input
                      value={form.InvoiceID}
                      onChange={(event) => updateForm("InvoiceID", event.target.value)}
                      className={inputClass}
                      placeholder="Invoice Id"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Invoice Date</label>
                    <input
                      type="date"
                      value={form.InvoiceDate}
                      onChange={(event) => updateForm("InvoiceDate", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Invoice Value (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.InvAmount}
                      onChange={(event) => updateForm("InvAmount", event.target.value)}
                      className={inputClass}
                      placeholder="Amount"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">OPEX / CAPEX</label>
                    <select
                      value={form.ClassificationType}
                      onChange={(event) => updateForm("ClassificationType", event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {classificationOptions.map((option, index) => (
                        <option key={`${option.Value}-${index}`} value={String(option.Value)}>
                          {option.Text}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Invoice Type</label>
                    <select
                      value={form.InvoiceType}
                      onChange={(event) => updateForm("InvoiceType", event.target.value)}
                      className={inputClass}
                      disabled={dropdownLoading}
                    >
                      <option value="">Select</option>
                      {invoiceTypeOptions.map((option, index) => (
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
                      onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
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
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-sm font-medium">Subject</label>
                    <textarea
                      value={form.Subject}
                      maxLength={250}
                      onChange={(event) => updateForm("Subject", event.target.value)}
                      className={`${inputClass} min-h-[88px]`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{form.Subject.length}/250</p>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-sm font-medium">Comments</label>
                    <textarea
                      value={form.Comments}
                      maxLength={950}
                      onChange={(event) => updateForm("Comments", event.target.value)}
                      className={`${inputClass} min-h-[96px]`}
                    />
                    <p className="mt-1 text-xs text-gray-500">{form.Comments.length}/950</p>
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
                        <label className="mb-1 block text-sm font-medium">Update Comment</label>
                        <textarea
                          value={form.UpdateComments}
                          onChange={(event) => updateForm("UpdateComments", event.target.value)}
                          className={`${inputClass} min-h-[88px]`}
                        />
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
                  <button type="button" onClick={saveInvoice} disabled={saving} className="btn-primary">
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
