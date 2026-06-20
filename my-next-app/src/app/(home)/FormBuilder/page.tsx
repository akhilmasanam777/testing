"use client";

import React, { useEffect, useState, useRef } from "react";

import * as xlsx from "xlsx"



// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "build" | "vs" | "prev";
type FieldType =
  | "text" | "number" | "textarea" | "dropdown" | "radio" | "checkbox"
  | "date" | "photo" | "location" | "section" | "signature" | "barcode";

// type FieldType =
//   | "text" | "number" | "textarea" | "dropdown" | "radio" | "checkbox"
//   | "date" | "photo" | "location" | "section" | "signature" | "barcode"
//   | "file" | "video" | "decimal"; // Added missing variants
interface Field {
  id: number;
  t: FieldType;
  l: string;
  r: boolean;
  pg: string;
  ph?: string;
  vs?: string;
  selectedOptionIds?: number[];
  embossed?: boolean;
  multiPhoto?: boolean;
  frontCam?: boolean;
  showAcc?: boolean;
  extGPS?: boolean;
  mapCap?: boolean;
  controlTypeId?: number;
}

interface Page { id: string; name: string; }
interface ValueSet {
  id: string;
  n: string;
  v: string[];
  source?: "dropdown" | "radio" | "checkbox" | "custom";
  locked?: boolean;
}
interface LookupOption { value: string|number; label: string; Text?: string; }
type PublishedColumnMap = Record<number, number>;
interface SimpleValueItem { id: number; name: string; }
interface BuilderSeed {
  formName?: string;
  taskId?: number | null;
}

// Dynamic Columns types
type RCM = 0 | 1 | 2;
interface DynamicColumn {
  id: number;
  name: string;
  controlTypeId: number;
  controlTypeName: string;
  carryForward: boolean;
  mandatory: boolean;
  loadingOCR: boolean;
  loadingPrintText: boolean;
  loadingFrom?: string;
  loadingData?: string;
}

interface OptionValue {
  id: number;
  name: string;
  isSelected: boolean;
  position: number;
  columnId: number;
  dropDownConfigId: number;
}

// Task types
interface Task {
  id: number;
  name: string;
  markerPath: string;
  uom: string;
  taskType: string;
  progress: number;
  locationSelection: boolean;
  dynamicColumns?: TaskDynamicColumn[];
}

interface TaskDynamicColumn {
  id: number;
  name: string;
  controlTypeId: number;
  taskAttributeId: number | null;
  taskSelected: boolean;
  globalName: boolean;
  sectionTitle: string;
  sectionNo: number;
  pageNo: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_TYPES: { t: FieldType; l: string; i: string }[] = [
  { t: "text", l: "Text", i: "Aa" },
  { t: "number", l: "Number", i: "12" },
  { t: "textarea", l: "Textarea", i: "¶" },
  { t: "dropdown", l: "Dropdown", i: "▾" },
  { t: "radio", l: "Radio", i: "◉" },
  { t: "checkbox", l: "Checkbox", i: "☑" },
  { t: "date", l: "Date", i: "📅" },
  { t: "photo", l: "Photo", i: "📷" },
  { t: "location", l: "Location", i: "📍" },
  { t: "section", l: "Section", i: "—" },
  { t: "signature", l: "Signature", i: "✍" },
  { t: "barcode", l: "Barcode", i: "▨" },
];

const CONTROL_TYPES = [
  { value: 1, label: "Text Box" },
  { value: 2, label: "Dropdown" },
  { value: 3, label: "Radio Button" },
  { value: 5, label: "Date Picker" },
  { value: 8, label: "File Upload" },
  { value: 9, label: "Checkbox" },
];

const TASK_TYPES = ["Survey", "Inspection", "Collection", "Monitoring"];
const UOM_OPTIONS = ["Meter", "KM", "Unit", "Hectare", "Acre"];

const TEAL = "#1db898";
const FORM_BUILDER_DRAFT_KEY = "traxion-form-builder-draft-v1";

const DEFAULT_LOADING_FROM: LookupOption[] = [
  { value: "1", label: "Master Data" },
  { value: "2", label: "Custom Values" },
];

const DEFAULT_CONTROL_TYPE_OPTIONS: LookupOption[] = CONTROL_TYPES.map((c) => ({
  value: String(c.value),
  label: c.label,
}));

const DEFAULT_UOM_OPTIONS: LookupOption[] = UOM_OPTIONS.map((value) => ({
  value,
  label: value,
}));

const DEFAULT_TASK_TYPE_OPTIONS: LookupOption[] = TASK_TYPES.map((value) => ({
  value,
  label: value,
}));

const FIELD_CONTROL_TYPE: Partial<Record<FieldType, number>> = {
  text: 1,
  number: 1,
  textarea: 1,
  dropdown: 2,
  radio: 3,
  checkbox: 9,
  date: 5,
  photo: 8,
  location: 1,
  signature: 1,
  barcode: 1,
};

const FIELD_TYPE_BY_CONTROL: Record<number, FieldType> = {
  1: "text",
  2: "dropdown",
  3: "radio",
  5: "date",
  8: "photo",
  9: "checkbox",
};

const VALUE_ENDPOINT_BY_FIELD: Partial<Record<FieldType, string>> = {
  dropdown: "/api/dynamicvalues",
  radio: "/api/radiobuttonvalues",
  checkbox: "/api/checkboxvalues",
};

const VALUE_SOURCE_LABEL: Record<string, string> = {
  dropdown: "Dropdown Values",
  radio: "Radio Button Values",
  checkbox: "Checkbox Values",
  custom: "Custom",
};




let _id = 10;
const nid = () => ++_id;

const fieldIcon = (t: FieldType) =>
  FIELD_TYPES.find((f) => f.t === t)?.i ?? "?";
const fieldLabel = (t: FieldType) =>
  FIELD_TYPES.find((f) => f.t === t)?.l ?? t;

async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function asArray(data: any) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.result)) return data.result;
  return [];
}

function toLookupOptions(data: any, fallback: LookupOption[] = []) {
  const rows = asArray(data);
  if (!rows.length) return fallback;

  return rows.map((item: any) => {
    const value = String(
      item.Value ?? item.value ?? item.Id ?? item.id ?? item.Code ?? item.code ?? "",
    );
    const label = String(
      item.Text ?? item.text ?? item.Name ?? item.name ?? item.Label ?? item.label ?? value,
    );

    return { value, label };
  });
}

function lookupLabel(options: LookupOption[], value: string | number) {
  const key = String(value);
  return options.find((opt) => opt.value === key)?.label || key;
}

function normalizeDynamicColumn(item: any): DynamicColumn {
  const controlTypeId = Number(item.ControlTypeId ?? item.controlTypeId ?? 0);

  return {
    id: Number(item.Id ?? item.id ?? 0),
    name: String(item.Name ?? item.name ?? ""),
    controlTypeId,
    controlTypeName:
      String(item.ControlTypeName ?? item.controlTypeName ?? "") ||
      CONTROL_TYPES.find((c) => c.value === controlTypeId)?.label ||
      "",
    carryForward: Boolean(item.CarryForward ?? item.carryForward),
    mandatory: Boolean(item.Mandatory ?? item.mandatory),
    loadingOCR: Boolean(item.LoadingOCR ?? item.loadingOCR),
    loadingPrintText: Boolean(item.LoadingPrintText ?? item.loadingPrintText),
    loadingFrom: String(item.LoadingFrom ?? item.loadingFrom ?? "0"),
    loadingData: String(item.LoadingData ?? item.loadingData ?? "0"),
  };
}

function normalizeOptionValue(item: any): OptionValue {
  return {
    id: Number(item.Id ?? item.id ?? 0),
    name: String(item.Name ?? item.name ?? ""),
    isSelected: Boolean(item.IsSelected ?? item.isSelected),
    position: Number(item.Position ?? item.position ?? 0),
    columnId: Number(item.ColumnId ?? item.columnId ?? 0),
    dropDownConfigId: Number(item.DropDownConfigId ?? item.dropDownConfigId ?? 0),
  };
}

function normalizeSourceOptionValue(item: any, index: number): OptionValue {
  const option = normalizeOptionValue(item);
  const fallbackId = Number(item.Value ?? item.value ?? item.OptionId ?? item.optionId ?? index + 1);

  return {
    ...option,
    id: option.id || fallbackId,
    name: option.name || String(item.Text ?? item.text ?? item.Label ?? item.label ?? item.Value ?? item.value ?? ""),
    position: option.position || index + 1,
  };
}

function columnId(column: any) {
  return String(column.Id ?? column.id ?? "");
}

function columnName(column: any) {
  return String(column.Name ?? column.name ?? "");
}

function optionTypeForControl(controlTypeId?: number | string) {
  const id = Number(controlTypeId);
  if (id === 2) return "dropdown";
  if (id === 3) return "radio";
  if (id === 9) return "checkbox";
  return "";
}

function fieldTypeForControl(controlTypeId?: number | string, fallback: FieldType = "text") {
  return FIELD_TYPE_BY_CONTROL[Number(controlTypeId)] ?? fallback;
}

function fieldControlTypeId(field: Field) {
  return Number(field.controlTypeId ?? FIELD_CONTROL_TYPE[field.t] ?? 1);
}

function isOptionField(field: Field) {
  return Boolean(optionTypeForControl(fieldControlTypeId(field)));
}

function normalizeTask(item: any): Task {
  return {
    id: Number(item.id ?? item.Id ?? 0),
    name: String(item.Name ?? item.name ?? ""),
    markerPath: String(item.MarkerPath ?? item.markerPath ?? "0"),
    uom: String(item.UOM ?? item.uom ?? "0"),
    taskType: String(item.TaskType ?? item.taskType ?? "0"),
    progress: Number(item.Progress ?? item.progress ?? 0),
    locationSelection: Boolean(item.LocationSelection ?? item.locationSelection),
  };
}

function normalizeTaskDynamicColumn(item: any): TaskDynamicColumn {
  return {
    id: Number(item.Id ?? item.id ?? 0),
    name: String(item.Name ?? item.name ?? ""),
    controlTypeId: Number(item.ControlTypeId ?? item.controlTypeId ?? 0),
    taskAttributeId:
      item.TaskAttributeId ?? item.taskAttributeId
        ? Number(item.TaskAttributeId ?? item.taskAttributeId)
        : null,
    taskSelected: Boolean(item.TaskSelected ?? item.taskSelected),
    globalName: Boolean(item.GlobalName ?? item.globalName),
    sectionTitle: String(item.SectionTitle ?? item.sectionTitle ?? ""),
    sectionNo: Number(item.SectionNo ?? item.sectionNo ?? 0),
    pageNo: Number(item.PageNo ?? item.pageNo ?? 0),
  };
}

function StatusLine({ loading, saving, error }: { loading?: boolean; saving?: boolean; error?: string }) {
  if (!loading && !saving && !error) return null;

  return (
    <div style={{ padding: "8px 14px", borderBottom: "1px solid #edf0f3", fontSize: 11, color: error ? "#dc2626" : "#718096", background: error ? "#fff7f7" : "#fafbfc" }}>
      {error || (saving ? "Saving..." : "Loading data...")}
    </div>
  );
}

// ─── Sub-Nav Items ────────────────────────────────────────────────────────────
type SubPage = "dynamic-columns" | "task" | "form-builder" | "dropdown-values" | "radio-values" | "checkbox-values";

const SUBNAV: { id: SubPage; label: string }[] = [
  // { id: "dynamic-columns", label: "Dynamic Columns" },
  { id: "task", label: "Task" },
  { id: "form-builder", label: "Form Builder" },
  // { id: "dropdown-values", label: "Dropdown Values" },
  // { id: "radio-values", label: "Radio Button Values" },
  // { id: "checkbox-values", label: "Checkbox Values" },
];

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
  card: {
    background: "#fff",
    border: "1px solid #e2e6ea",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 16,
  } as React.CSSProperties,
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid #edf0f3",
    background: "#fafbfc",
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  tealBtn: {
    background: TEAL,
    color: "#fff",
    border: "none",
    borderRadius: 4,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  secBtn: {
    background: "#fff",
    color: "#4a5568",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  } as React.CSSProperties,
  dangerBtn: {
    background: "#fff",
    color: "#e53e3e",
    border: "1px solid #fecaca",
    borderRadius: 4,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
  } as React.CSSProperties,
  inp: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 13,
    color: "#374151",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  sel: {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 4,
    fontSize: 13,
    color: "#374151",
    background: "#fff",
    boxSizing: "border-box" as const,
  },
  lbl: {
    fontSize: 11,
    fontWeight: 500,
    color: "#374151",
    display: "block",
    marginBottom: 4,
  },
  th: {
    padding: "8px 12px",
    textAlign: "left" as const,
    fontSize: 10,
    fontWeight: 700,
    color: "#718096",
    borderBottom: "2px solid #e2e6ea",
    background: "#fafbfc",
    whiteSpace: "nowrap" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  td: {
    padding: "8px 12px",
    fontSize: 12,
    color: "#374151",
    borderBottom: "1px solid #f5f7f9",
    verticalAlign: "middle" as const,
  },
};

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({
  open, onClose, title, children, wide = false,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 8, width: wide ? "80vw" : 520,
          maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e6ea" }}>
          <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a2740" }}>{title}</h5>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function TableToolbar({ onAdd, addLabel, search, onSearch, onExcel, pagesize, onPageSizeChange }: {
  onAdd: () => void; addLabel: string; search: string; onSearch: (v: string) => void;
  onExcel: () => void; pagesize: number; onPageSizeChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid #edf0f3", flexWrap: "wrap" }}>
      {["Excel"].map((l) => (
        <button key={l} onClick={l === "Excel" ? onExcel : undefined} style={{
          color: "#fff", border: "none", borderRadius: 3, padding: "4px 9px", fontSize: 11, cursor: "pointer",
          background: l === "Excel" ? "#059669" : l === "PDF" ? "#dc2626" : "#6b7280",
        }}>{l}</button>
      ))}
      <select value={pagesize} onChange={(e) => onPageSizeChange(Number(e.target.value))} style={{ padding: "4px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff" }}>
        <option value={10}>Show 10 rows</option>
        <option value={25}>Show 25 rows</option>
        <option value={50}>Show 50 rows</option>
      </select>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#718096" }}>
        Search:
        <input value={search} onChange={(e) => onSearch(e.target.value)} style={{ padding: "4px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, width: 160, outline: "none" }} />
      </div>
      <button onClick={onAdd} style={{ ...S.tealBtn, padding: "5px 13px", marginLeft: 8 }}>+ {addLabel}</button>
    </div>
  );
}

 // ─── Table toolbar ────────────────────────────────────────────────────────────
// function TableToolbar({ onAdd, addLabel, search, onSearch, onExcel }: {
//   onAdd: () => void; addLabel: string; search: string; onSearch: (v: string) => void;  onExcel: () => void;
// }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid #edf0f3", flexWrap: "wrap" }}>
//       {[ "Excel", ].map((l) => (
//         <button key={l}   onClick={l === "Excel" ? onExcel : undefined}  style={{
//           color: "#fff", border: "none", borderRadius: 3, padding: "4px 9px", fontSize: 11, cursor: "pointer",
//           background: l === "Excel" ? "#059669" : l === "PDF" ? "#dc2626" : "#6b7280",
//         }}>{l}</button>
//       ))}
//       <select  onChange={(e) => setpagesize(Number(e.target.value))}  style={{ padding: "4px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff" }}>
//         <option value={10}>Show 10 rows</option>
//         <option value={25}>Show 25 rows</option>
//         <option value={50}>Show 50 rows</option>
//       </select>
//       <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#718096" }}>
//         Search:
//         <input
//           value={search} onChange={(e) => onSearch(e.target.value)}
//           style={{ padding: "4px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, width: 160, outline: "none" }}
//         />
//       </div>
//       <button onClick={onAdd}  id="+ Task" style={{ ...S.tealBtn, padding: "5px 13px", marginLeft: 8 }}>+ {addLabel} </button>
//     </div>
//   );
// }

// ─── Pagination ───────────────────────────────────────────────────────────────
// function Pagination({ total, showing }: { total: number; showing: number }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #edf0f3" }}>
//       <span style={{ fontSize: 11, color: "#718096" }}>Showing 1 to {showing} of {total} entries</span>
//       <div style={{ display: "flex", gap: 3 }}>
//         {["Previous", "1", "2", "Next"].map((l, i) => (
//           <button key={l} style={{
//             padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11,
//             background: l === "1" ? TEAL : "#fff", color: l === "1" ? "#fff" : "#374151", cursor: "pointer",
//           }}>{l} test </button>
//         ))}
//       </div>
//     </div>
//   );
// }
// function Pagination({ page, totalPages, showing, total, onPageChange }: {
//   page: number; totalPages: number; showing: number; total: number; onPageChange: (p: number) => void;
// }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #edf0f3" }}>
//       <span style={{ fontSize: 11, color: "#718096" }}>Showing {showing === 0 ? 0 : (page - 1) * pageSize + 1} to {showing} of {total} entries</span>
//       <div style={{ display: "flex", gap: 3 }}>
//         <button
//           disabled={page === 1}
//           onClick={() => onPageChange(page - 1)}
//           style={{ padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#374151", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}
//         >Previous</button>

//         {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
//           <button
//             key={p}
//             onClick={() => onPageChange(p)}
//             style={{
//               padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11,
//               background: p === page ? TEAL : "#fff", color: p === page ? "#fff" : "#374151", cursor: "pointer",
//             }}
//           >{p}</button>
//         ))}

//         <button
//           disabled={page === totalPages}
//           onClick={() => onPageChange(page + 1)}
//           style={{ padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#374151", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}
//         >Next</button>
//       </div>
//     </div>
//   );
// }
function Pagination({ page, totalPages, showing, total, pageSize, onPageChange }: {
  page: number; totalPages: number; showing: number; total: number; pageSize: number; onPageChange: (p: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #edf0f3" }}>
      <span style={{ fontSize: 11, color: "#718096" }}>Showing {showing === 0 ? 0 : ((page - 1) * pageSize) + 1} to {showing} of {total} entries</span>
      <div style={{ display: "flex", gap: 3 }}>
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{ padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#374151", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}
        >Previous</button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11,
              background: p === page ? TEAL : "#fff", color: p === page ? "#fff" : "#374151", cursor: "pointer",
            }}
          >{p}</button>
        ))}

        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#374151", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}
        >Next</button>
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f9fafb", borderRadius: 4, marginBottom: 5 }}>
      <div>
        <div style={{ fontSize: 11, color: "#4a5568" }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{sub}</div>}
      </div>
      <button
        onClick={onToggle}
        style={{ width: 34, height: 18, borderRadius: 9, background: on ? TEAL : "#d1d5db", border: "none", position: "relative", cursor: "pointer", flexShrink: 0 }}
      >
        <div style={{ position: "absolute", top: 2, left: on ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .15s" }} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FORM BUILDER ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function FormBuilder({
  seed,
  onOpenTasks,
  availableColumns
}: {
  seed?: BuilderSeed;
  onOpenTasks?: () => void;
  availableColumns: any[];
}) {
  const [tab, setTab] = useState<Tab>("build");
  const [formName, setFormName] = useState("Survey Form");
  const [markerPath, setMarkerPath] = useState("0");
  const [uom, setUom] = useState("0");
  const [taskType, setTaskType] = useState("0");
  const [progress, setProgress] = useState(0);
  const [locationSelection, setLocationSelection] = useState(false);
  const [uomOptions, setUomOptions] = useState<LookupOption[]>(DEFAULT_UOM_OPTIONS);
  const [taskTypeOptions, setTaskTypeOptions] = useState<LookupOption[]>(DEFAULT_TASK_TYPE_OPTIONS);
  const [pages, setPages] = useState<Page[]>([{ id: "p1", name: "Page 1" }]);
  const [activePg, setActivePg] = useState("p1");
  // console.log("Active page:", activePg);
  const [editPgId, setEditPgId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  // console.log("Initial fields state:", fields);
  const [selId, setSelId] = useState<number | null>(null);
  // console.log("Selected field ID:", selId);
  const [valueSets, setValueSets] = useState<ValueSet[]>([]);
  const [selVS, setSelVS] = useState<string | null>(null);
  const [newVsName, setNewVsName] = useState("");
  const [newVsVal, setNewVsVal] = useState("");
  const [editVsIdx, setEditVsIdx] = useState<number | null>(null);
  const [editVsVal, setEditVsVal] = useState("");
  const [prevPg, setPrevPg] = useState("p1");
  const [draftStatus, setDraftStatus] = useState("");
  const [publishStatus, setPublishStatus] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedColumnIds, setPublishedColumnIds] = useState<PublishedColumnMap>({});
  const [publishedTaskId, setPublishedTaskId] = useState<number | null>(null);
  const [backendValuesLoaded, setBackendValuesLoaded] = useState(false);
  const [controlTypeOptions, setControlTypeOptions] =useState<LookupOption[]>([]);
  const [optionValuesBySource, setOptionValuesBySource] = useState<Record<string, OptionValue[]>>({});
  const [optionLoadingBySource, setOptionLoadingBySource] = useState<Record<string, boolean>>({});
  const [addingVsValue, setAddingVsValue] = useState(false);
  const pgRenameRef = useRef<HTMLInputElement>(null);
  const publishedColumnIdsRef = useRef<PublishedColumnMap>({});
  const newFieldIdsRef = useRef<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("")
  const pgFields = (pgId: string) => fields.filter((f) => f.pg === pgId);
  const selField = fields.find((f) => f.id === selId) ?? null;
  //console.log("Selected field:", selField);

  const pgName = (id: string) => pages.find((p) => p.id === id)?.name ?? "";
  const pgIdx = (id: string) => pages.findIndex((p) => p.id === id);
  const fieldCount = fields.filter((f) => f.t !== "section").length;
  const compatibleValueSets = (type: FieldType) =>
    valueSets.filter((set) => !set.source || set.source === "custom" || set.source === type);

  // The shared backend value-set id for a given option-bearing field's control type.
  // Dropdown/Radio/Checkbox fields always share ONE list each (same lists shown in the
  // "Value Sets" tab) — they never get their own private per-field value set.
  const backendValueSetIdForField = (field: Field) => {
    const optType = optionTypeForControl(fieldControlTypeId(field));
    if (optType === "dropdown") return "backend_dropdown_values";
    if (optType === "radio") return "backend_radio_values";
    if (optType === "checkbox") return "backend_checkbox_values";
    return "";
  };
  const myArrayToPaginate:any[] = [];

  const filteredData = myArrayToPaginate.filter((item) => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const currentShowingCount = Math.min(currentPage * pageSize, totalEntries);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize, 
    currentPage * pageSize
  );

  // const optionSourceKey = (field: Field) => {
  //   const type = optionTypeForControl(fieldControlTypeId(field));
  //   const vs = field.vs != null ? String(field.vs) : "";
  //   return type && vs ? `${type}:${vs}` : "";
  // };

//  const optionSourceKey = (field: Field) => {
//   const type = optionTypeForControl(fieldControlTypeId(field));
//   if (!type) return "";
//   // Use field.id as part of key so each field has its own cache
//   return field.id > 0 ? `${type}:${field.id}` : type;
// };
const optionSourceKey = (field: Field) => {
  const type = optionTypeForControl(fieldControlTypeId(field));
  if (!type) return "";
  
  // New fields (not yet in DB) share the master list cache
  if (newFieldIdsRef.current.has(field.id)) return type; // "dropdown", "radio", "checkbox"
  
  // Edit-loaded fields get their own per-field cache
  return field.id > 0 ? `${type}:${field.id}` : type;
};

  const getFieldValueSet = (field: Field) => {
    const vs = field.vs != null ? String(field.vs) : "";
    return valueSets.find((set) => set.id === vs);
  };

  const generateValueSetOptions = (set: ValueSet) =>
    set.v.map((value, index) => ({
      id: index + 1,
      name: String(value),
      isSelected: false,
      position: index + 1,
      columnId: 0,
      dropDownConfigId: 0,
    }));



    const loadSourceOptions = async (field: Field) => {
  const key = optionSourceKey(field);
  if (!key) return [];
  if (optionValuesBySource[key]) return optionValuesBySource[key];

  const isNewField = newFieldIdsRef.current.has(field.id);

  if (!isNewField && field.id > 0) {
    // Edit-loaded field — fetch this field's specific options
    const type = optionTypeForControl(fieldControlTypeId(field));
    if (type) {
      setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
      try {
        const data = await apiJson(`/api/formbuilder/dynamic-column-options?type=${type}&id=${field.id}`);
        const values = asArray(data).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));
        setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
        return values;
      } finally {
        setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
      }
    }
  }

  // New field — load from master endpoint
  const endpoint = VALUE_ENDPOINT_BY_FIELD[fieldTypeForControl(fieldControlTypeId(field))];
  if (!endpoint) return [];
  setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
  try {
    const data = await apiJson(endpoint);
    const values = asArray(data).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));
    setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
    return values;
  } finally {
    setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
  }
};

//     const loadSourceOptions = async (field: Field) => {
//   const key = optionSourceKey(field);
//   if (!key) return [];
//   if (optionValuesBySource[key]) return optionValuesBySource[key];

//   // For fields with a real DB id, fetch their specific options
//   if (field.id > 0) {
//     const type = optionTypeForControl(fieldControlTypeId(field));
//     if (type) {
//       setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
//       try {
//         const data = await apiJson(`/api/formbuilder/dynamic-column-options?type=${type}&id=${field.id}`);
//         const values = asArray(data).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));
//         setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
//         return values;
//       } finally {
//         setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
//       }
//     }
//   }

//   const valueSet = getFieldValueSet(field);
//   if (valueSet) {
//     const values = generateValueSetOptions(valueSet);
//     setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
//     return values;
//   }

//   const endpoint = VALUE_ENDPOINT_BY_FIELD[fieldTypeForControl(fieldControlTypeId(field))];
//   if (!endpoint) return [];
//   setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
//   try {
//     const data = await apiJson(endpoint);
//     const values = asArray(data).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));
//     setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
//     return values;
//   } finally {
//     setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
//   }
// };

  // const loadSourceOptions = async (field: Field) => {
  //   const key = optionSourceKey(field);
  //   if (!key) return [];
  //   if (optionValuesBySource[key]) return optionValuesBySource[key];

  //   const valueSet = getFieldValueSet(field);
  //   if (valueSet) {
  //     const values = generateValueSetOptions(valueSet);
  //     setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
  //     return values;
  //   }

  //   const endpoint = VALUE_ENDPOINT_BY_FIELD[fieldTypeForControl(fieldControlTypeId(field))];
  //   if (!endpoint) return [];
  //   setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
  //   try {
  //     const data = await apiJson(endpoint);
  //     const values = asArray(data).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));
  //     setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
  //     return values;
  //   } finally {
  //     setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
  //   }
  // };

  const getCachedOptions = (field: Field) => {
    // Shared backend list (dropdown/radio/checkbox master values) is the single source
    // of truth for option-bearing fields.
    const key = optionSourceKey(field);
    if (key && optionValuesBySource[key]) {
      return optionValuesBySource[key];
    }

    // Fall back to a custom value set only if one was explicitly assigned and no
    // backend-sourced cache exists yet.
    const valueSet = getFieldValueSet(field);
    if (valueSet) return generateValueSetOptions(valueSet);

    return [];
  };

  const selectedOptionsForField = (field: Field, options = getCachedOptions(field)) => {
    const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
    return options.filter((option) => selectedIds.has(option.id));
  };

  // Adds a brand-new value straight to the shared backend list (Dropdown/Radio/Checkbox
  // Values) for the currently selected field's control type, and makes it immediately
  // available + auto-selected in the field's options checklist.
  const addBackendValueForField = async (field: Field, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;

    const fieldType = fieldTypeForControl(fieldControlTypeId(field));
    const endpoint = VALUE_ENDPOINT_BY_FIELD[fieldType];
    if (!endpoint) return;

    setAddingVsValue(true);
    try {
      const saved = await apiJson(endpoint, {
        method: "POST",
        body: JSON.stringify({ Id: 0, Name: value }),
      });
      const savedId = Number(saved?.Id ?? saved?.id ?? saved?.Data?.Id ?? saved?.data?.Id ?? 0);

      // Refresh the canonical list from the backend so ids/positions stay correct.
      const fresh = await apiJson(endpoint);
      const normalized = asArray(fresh).map((item: any, idx: number) => normalizeSourceOptionValue(item, idx));

      const key = optionSourceKey(field);
      if (key) {
        setOptionValuesBySource((prev) => ({ ...prev, [key]: normalized }));
      }

      // Mirror into the matching "Value Sets" tab list too, so both views stay in sync.
      const vsId = backendValueSetIdForField(field);
      if (vsId) {
        setValueSets((prev) =>
          prev.map((set) => (set.id === vsId ? { ...set, v: normalized.map((o:any) => o.name) } : set)),
        );
      }

      // Auto-select the newly created value on this field.
      const newOption = normalized.find((o:any) => (savedId && o.id === savedId) || o.name.trim().toLowerCase() === value.toLowerCase());
      if (newOption) {
        const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
        selectedIds.add(newOption.id);
        updateField(field.id, { selectedOptionIds: Array.from(selectedIds) });
      }

      setPublishStatus("");
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Failed to add value");
    } finally {
      setAddingVsValue(false);
    }
  };
  useEffect(() => {
    if (!seed) return;

    if (!seed.taskId) {
      // Clean canvas for a brand new task
      newFieldIdsRef.current = new Set(); 
      setFormName(seed.formName || "Survey Form");
      setMarkerPath("0");
      setUom("0");
      setTaskType("0");
      setProgress(0);
      setLocationSelection(false);
      setPages([{ id: "p1", name: "Page 1" }]);
      setActivePg("p1");
      setFields([]);
      setPublishedColumnIds({});
      setPublishedTaskId(null);
      setDraftStatus("New task builder ready");
      return;
    }

    // Load an existing task structure for editing
    async function loadTaskIntoBuilder() {
           newFieldIdsRef.current = new Set();
      try {
        setDraftStatus("Loading task fields...");
        const data = await apiJson(`/api/formbuilder/tasks?id=${seed?.taskId}`);
        
        if (data.Name) setFormName(data.Name);
        if (data.MarkerPath) setMarkerPath(data.MarkerPath);
        if (data.UOM) setUom(data.UOM);
        if (data.TaskType) setTaskType(data.TaskType);
        if (data.Progress !== undefined) setProgress(Number(data.Progress) || 0);
        if (data.LocationSelection !== undefined) setLocationSelection(Boolean(data.LocationSelection));
        setPublishedTaskId(Number(seed?.taskId));

        const backendRows = asArray(data.DynamicColumns ?? data.dynamicColumns).map(normalizeTaskDynamicColumn);
        
        // 1. Rebuild pages dynamically based on task data
        const maxPageNo = Math.max(1, ...backendRows.map((r: any) => r.pageNo));
        const rebuiltPages: Page[] = [];
        for (let p = 1; p <= maxPageNo; p++) {
          rebuiltPages.push({ id: `p${p}`, name: `Page ${p}` });
        }
        setPages(rebuiltPages);
        setActivePg("p1");

        // 2. Rebuild fields array & original backend column associations
        const rebuiltFields: Field[] = [];


        const colIdsMap: PublishedColumnMap = {};

        for (let p = 1; p <= maxPageNo; p++) {
          const pageRows = backendRows.filter((r: any) => r.pageNo === p);
          let activeSectionTitle = "";

          for (const row of pageRows) {
            // Inject section headers if row has section title attributes defined
            if (row.sectionTitle && row.sectionTitle !== activeSectionTitle) {
              activeSectionTitle = row.sectionTitle;
              rebuiltFields.push({
                id: Math.floor(Math.random() * -10000), // temp section unique ID
                t: "section",
                l: activeSectionTitle,
                r: false,
                pg: `p${p}`
              });
            }
            const fType = fieldTypeForControl(row.controlTypeId);
            const assignedVs =
              row.controlTypeId === 2 ? "backend_dropdown_values" :
              row.controlTypeId === 3 ? "backend_radio_values" :
              row.controlTypeId === 9 ? "backend_checkbox_values" : "";

            colIdsMap[row.id] = row.id;

            rebuiltFields.push({
              id: row.id,
              t: fType,
              controlTypeId: row.controlTypeId,
              l: row.name,
              r: false,
              pg: `p${p}`,
              vs: assignedVs
            });
          }
        }

        for (const field of rebuiltFields) {
          if (!isOptionField(field)) continue;
          try {
            const optKey = optionTypeForControl(field.controlTypeId); // "dropdown" | "radio" | "checkbox"
            if (!optKey) continue;

            // Hit the dedicated options endpoint instead of relying on the column-detail response
            const optionsData = await apiJson(
              `/api/formbuilder/dynamic-column-options?type=${optKey}&id=${field.id}`
            );

            const normalized = asArray(optionsData).map((o: any, idx:any) => normalizeSourceOptionValue(o, idx));
            const selectedIds = normalized.filter((o: any) => o.isSelected).map((o: any) => Number(o.id));
            field.selectedOptionIds = selectedIds;

            const sourceKey = optionSourceKey(field);
            setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));

            console.log("EDIT-LOAD", field.id, "key=", sourceKey, "selected=", selectedIds, "count=", normalized.length);
          } catch (err) {
            console.warn("Failed to load saved options for field", field.id, err);
          }
        }

        setFields(rebuiltFields);
       setPublishedColumnIds(colIdsMap);
publishedColumnIdsRef.current = colIdsMap;
setDraftStatus("Task loaded completely");
      } catch (err) {
        console.error("Failed to parse edit seed task layout", err);
        setPublishStatus("Error loading task fields.");
      }
    }

    loadTaskIntoBuilder();
  }, [seed]);

  
useEffect(() => {
  console.log("fields =", fields);
}, [fields]);

useEffect(() => {
  if (selField?.vs == null || selField.vs === "" || !optionSourceKey(selField)) return;
  loadSourceOptions(selField).catch((err) => {
    setPublishStatus(err instanceof Error ? err.message : "Failed to load option values");
  });
}, [selField?.id, selField?.vs, selField?.controlTypeId]);

useEffect(() => {
  if (!backendValuesLoaded || !valueSets.length) return;

  setFields((prev) => {
    let updated = false;
    const next = prev.map((field) => {
      if (!isOptionField(field) || field.vs != null && field.vs !== "") return field;
      const fieldType = fieldTypeForControl(field.controlTypeId);
      const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;
      if (!defaultValueSet) return field;
      updated = true;
      return { ...field, vs: defaultValueSet };
    });
    return updated ? next : prev;
  });
}, [backendValuesLoaded, valueSets]);

// useEffect(() => {
//   console.log("controlTypeOptions =", controlTypeOptions);
// }, [controlTypeOptions]);


  useEffect(() => {
  loadControlTypes();
}, []);

useEffect(() => {
  publishedColumnIdsRef.current = publishedColumnIds;
}, [publishedColumnIds]);

const loadControlTypes = async () => {
  try {
   const data = await apiJson("/api/formbuilder/lookups?type=control-types");
   console.log("Fetched control types:", data);

    setControlTypeOptions(
      data.map((x: any) => ({
         value: x.Value,
         label: x.Text,
        Text: x.Text,
      })) 
    );
  } catch (err) {
    console.error(err);
  }
};


  // useEffect(() => {
  //   const raw = window.localStorage.getItem(FORM_BUILDER_DRAFT_KEY);
  //   if (!raw) return;

  //   try {
  //     const draft = JSON.parse(raw);
  //     if (draft.formName) setFormName(draft.formName);
  //     if (draft.markerPath) setMarkerPath(draft.markerPath);
  //     if (draft.uom) setUom(draft.uom);
  //     if (draft.taskType) setTaskType(draft.taskType);
  //     if (draft.progress !== undefined) setProgress(Number(draft.progress) || 0);
  //     if (draft.locationSelection !== undefined) setLocationSelection(Boolean(draft.locationSelection));
  //     if (Array.isArray(draft.pages) && draft.pages.length) {
  //       setPages(draft.pages);
  //       setActivePg(draft.pages[0].id);
  //       setPrevPg(draft.pages[0].id);
  //     }
  //     if (Array.isArray(draft.fields)) setFields(draft.fields);
  //     if (Array.isArray(draft.valueSets) && draft.valueSets.length) {
  //       setValueSets(draft.valueSets);
  //       setSelVS(draft.valueSets[0].id);
  //     }
  //     if (draft.publishedColumnIds && typeof draft.publishedColumnIds === "object") {
  //       setPublishedColumnIds(draft.publishedColumnIds);
  //     }
  //     if (draft.publishedTaskId) setPublishedTaskId(Number(draft.publishedTaskId));

  //     const maxFieldId = Math.max(10, ...asArray(draft.fields).map((f: Field) => Number(f.id) || 0));
  //     _id = Math.max(_id, maxFieldId);
  //     setDraftStatus("Draft loaded");
  //   } catch {
  //     setDraftStatus("Saved draft could not be loaded");
  //   }
  // }, []);

  useEffect(() => {
    if (!seed) return;

    if (seed.formName) setFormName(seed.formName);
    if (seed.taskId !== undefined) setPublishedTaskId(seed.taskId);
    setTab("build");
    setDraftStatus(seed.taskId ? "Loaded task builder" : "New task builder");
  }, [seed]);

  const saveDraft = () => {
    window.localStorage.setItem(
      FORM_BUILDER_DRAFT_KEY,
      JSON.stringify({ formName, markerPath, uom, taskType, progress, locationSelection, pages, fields, valueSets, publishedColumnIds, publishedTaskId }),
    );
    setDraftStatus("Draft saved");
  };

  const persistDraft = (columnIds = publishedColumnIds, taskId = publishedTaskId) => {
    window.localStorage.setItem(
      FORM_BUILDER_DRAFT_KEY,
      JSON.stringify({ formName, markerPath, uom, taskType, progress, locationSelection, pages, fields, valueSets, publishedColumnIds: columnIds, publishedTaskId: taskId }),
    );
  };

  const getApiId = (data: any) =>
    Number(data?.Id ?? data?.id ?? data?.Data?.Id ?? data?.data?.Id ?? data?.result?.Id ?? data?.Result?.Id ?? 0);

  const loadSimpleValues = async (endpoint: string): Promise<SimpleValueItem[]> => {
    const data = await apiJson(endpoint);
    return asArray(data).map((item: any) => ({
      id: Number(item.Id ?? item.id ?? 0),
      name: String(item.Name ?? item.name ?? ""),
    }));
  };

  useEffect(() => {
    let cancelled = false;

    async function loadBuilderDefaults() {
      try {
        const [dropdownValues, radioValues, checkboxValues, uomData, taskTypeData] = await Promise.allSettled([
          loadSimpleValues("/api/dynamicvalues"),
          loadSimpleValues("/api/radiobuttonvalues"),
          loadSimpleValues("/api/checkboxvalues"),
          apiJson("/api/formbuilder/lookups?type=uom"),
          apiJson("/api/formbuilder/lookups?type=task-type"),
        ]);

        if (cancelled) return;

        const backendSets: ValueSet[] = [
          {
            id: "backend_dropdown_values",
            n: "Dropdown Values",
            source: "dropdown",
            locked: true,
            v: dropdownValues.status === "fulfilled" ? dropdownValues.value.map((item) => item.name).filter(Boolean) : [],
          },
          {
            id: "backend_radio_values",
            n: "Radio Button Values",
            source: "radio",
            locked: true,
            v: radioValues.status === "fulfilled" ? radioValues.value.map((item) => item.name).filter(Boolean) : [],
          },
          {
            id: "backend_checkbox_values",
            n: "Checkbox Values",
            source: "checkbox",
            locked: true,
            v: checkboxValues.status === "fulfilled" ? checkboxValues.value.map((item) => item.name).filter(Boolean) : [],
          },
        ];

        setValueSets((prev) => {
          const customSets = prev.filter((set) => !set.locked && !String(set.id).startsWith("backend_"));
          const merged = [...backendSets, ...customSets];
          if (!selVS && merged.length) setSelVS(merged[0].id);
          return merged;
        });
        if (uomData.status === "fulfilled") setUomOptions(toLookupOptions(uomData.value, DEFAULT_UOM_OPTIONS));
        if (taskTypeData.status === "fulfilled") setTaskTypeOptions(toLookupOptions(taskTypeData.value, DEFAULT_TASK_TYPE_OPTIONS));
        setBackendValuesLoaded(true);
      } catch (err) {
        if (!cancelled) setPublishStatus(err instanceof Error ? err.message : "Failed to load predefined values");
      }
    }

    loadBuilderDefaults();

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureValueIds = async (type: FieldType, values: string[]): Promise<Map<string, number>> => {
    const endpoint = VALUE_ENDPOINT_BY_FIELD[type];
    if (!endpoint) return new Map<string, number>();

    let existing = await loadSimpleValues(endpoint);
    const ids = new Map<string, number>(existing.map((item) => [item.name.trim().toLowerCase(), item.id]));

    for (const value of values) {
      const key = value.trim().toLowerCase();
      if (!key || ids.has(key)) continue;

      const saved = await apiJson(endpoint, {
        method: "POST",
        body: JSON.stringify({ Id: 0, Name: value.trim() }),
      });
      const savedId = getApiId(saved);
      if (savedId) ids.set(key, savedId);
    }

    existing = await loadSimpleValues(endpoint);
    existing.forEach((item) => ids.set(item.name.trim().toLowerCase(), item.id));

    return ids;
  };

  const resolveSavedColumnId = async (field: Field, response: any) => {
    const responseId = getApiId(response);
    if (responseId) return responseId;

    const rows: DynamicColumn[] = asArray(await apiJson("/api/formbuilder/dynamic-columns")).map(normalizeDynamicColumn);
    const match = rows
      .filter((row) => row.name === field.l)
      .sort((a, b) => b.id - a.id)[0];

    return match?.id || 0;
  };

  const resolveSavedTaskId = async (response: any) => {
    const responseId = getApiId(response);
    if (responseId) return responseId;
    if (publishedTaskId) return publishedTaskId;

    const rows: Task[] = asArray(await apiJson("/api/formbuilder/tasks")).map(normalizeTask);
    const match = rows
      .filter((row) => row.name === formName.trim())
      .sort((a, b) => b.id - a.id)[0];

    return match?.id || null;
  };

  const sectionForField = (field: Field) => {
    let title = "";
    for (const candidate of fields) {
      if (candidate.pg !== field.pg) continue;
      if (candidate.id === field.id) break;
      if (candidate.t === "section") title = candidate.l;
    }
    return title;
  };

 

  const publishToBackend = async () => {    
   console.log("Publishing with fields =", fields);
    
    const backendFields = fields.filter((field) => field.t !== "section");
    // console.log("Backend fields to publish =", backendFields);

    if (!formName.trim()) {
      setPublishStatus("Form name is required before publishing.");
      return;
    }
    if (backendFields.length === 0) {
      setPublishStatus("Add at least one field before publishing.");
      return;
    }
    if (!uom || uom === "0") {
      setPublishStatus("Please select UOM before publishing.");
      return;
    }
    if (!taskType || taskType === "0") {
      setPublishStatus("Please select Task Type before publishing.");
      return;
    }
    if (progress <= 0) {
      setPublishStatus("Progress increment must be greater than 0.");
      return;
    }
    saveDraft();

    for (const field of backendFields) {
   console.log("field =", field);
  // console.log("field.vs =", field.vs);
  // console.log("valueSets =", valueSets);
  // console.log("field.vs =", field.vs);

// console.log(
//   "valueSet ids =",
//   valueSets.map(v => v.id)
// );

      if (!field.l.trim()) {
        setPublishStatus("Every field needs a label before publishing.");
        return;
      }
      if (isOptionField(field)) {
        const sourceOptions = await loadSourceOptions(field);
// Create a quick lookup set for selected IDs
const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
 
  const selectedOptions = selectedOptionsForField(field, sourceOptions);

  if (selectedOptions.length === 0) {
    setPublishStatus(`${field.l} needs at least one selected option value.`);
    return;
  }
}
      // if (isOptionField(field)) {
      //   const sourceOptions = await loadSourceOptions(field);
      //   const selectedOptions = selectedOptionsForField(field, sourceOptions);
      //   const fallbackSet = valueSets.find((set) => set.id === field.vs);

      //   if (selectedOptions.length === 0 && (!fallbackSet || fallbackSet.v.length === 0)) {
      //     setPublishStatus(`${field.l} needs at least one selected option value.`);
      //     return;
      //   }
      // }
    }

    setPublishing(true);
    setPublishStatus("Publishing value sets...");

    try {
      const valueIdsBySet = new Map<string, Map<string, number>>();
      for (const field of backendFields) {
        if (!isOptionField(field) || !field.vs) continue;
        if ((field.selectedOptionIds ?? []).length > 0) continue;
        const optionType = optionTypeForControl(fieldControlTypeId(field)) as FieldType;
        if (valueIdsBySet.has(`${optionType}:${field.vs}`)) continue;

        const vs = valueSets.find((set) => set.id === field.vs);
        if (!vs) continue;
        valueIdsBySet.set(`${optionType}:${field.vs}`, await ensureValueIds(optionType, vs.v));
      }



      setPublishStatus("Saving dynamic columns...");
      // Start with a clean object so we only map columns currently on the canvas layout
      const nextColumnIds: PublishedColumnMap = {};

      for (const field of backendFields) {
        const controlTypeId = fieldControlTypeId(field);
        const selectedSet = field.vs ? valueSets.find((set) => set.id === field.vs) : null;
        const optionType = optionTypeForControl(controlTypeId) as FieldType;
        const optionIds = field.vs ? valueIdsBySet.get(`${optionType}:${field.vs}`) : null;
        
        // Safely pull original tracking IDs from the component state map
        // const existingColumnId = publishedColumnIds[field.id] || 0;
  //       const existingColumnId = publishedColumnIdsRef.current[field.id] || 0;

  //       const sourceOptions = await loadSourceOptions(field);
  //       const selectedSourceOptions = selectedOptionsForField(field, sourceOptions);
        
  //       const optionPayload = sourceOptions.length > 0
  // ? sourceOptions.map((option, index) => ({
  //     Id: option.id,
  //     ColumnId: existingColumnId,
  //     DropDownConfigId: option.dropDownConfigId,
  //     Position: option.position || index + 1,
  //     IsSelected: selectedIds.has(Number(option.id)), // <-- Dynamically set true/false
  //   }))
  // : selectedSet?.v.map((value, index) => ({
  //     Id: optionIds?.get(value.trim().toLowerCase()) || 0,
  //     ColumnId: existingColumnId,
  //     DropDownConfigId: 0,
  //     Position: index + 1,
  //     IsSelected: true,
  //   })) ?? [];
        
        const existingColumnId = publishedColumnIdsRef.current[field.id] || 0;

        const sourceOptions = await loadSourceOptions(field);
        
        // 1. ADD THIS LINE explicitly right above optionPayload:
        const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));

        // 2. ADD EXPLICIT TYPES (option: OptionValue, index: number) in the maps:
        const optionPayload = sourceOptions.length > 0
          ? sourceOptions.map((option: OptionValue, index: number) => ({ 
            Id: option.id,
            ColumnId: existingColumnId,
            DropDownConfigId: option.dropDownConfigId,
            Position: option.position || index + 1,
            IsSelected: selectedIds.has(Number(option.id)),
          }))
          : selectedSet?.v.map((value: string, index: number) => ({
            Id: optionIds?.get(value.trim().toLowerCase()) || 0,
            ColumnId: existingColumnId,
            DropDownConfigId: 0,
            Position: index + 1,
            IsSelected: true,
          })) ?? [];
        
        // const optionPayload = selectedSourceOptions.length > 0
        //   ? selectedSourceOptions.map((option, index) => ({
        //     Id: option.id,
        //     ColumnId: existingColumnId,
        //     DropDownConfigId: option.dropDownConfigId,
        //     Position: option.position || index + 1,
        //     IsSelected: true,
        //   }))
        //   : selectedSet?.v.map((value, index) => ({
        //     Id: optionIds?.get(value.trim().toLowerCase()) || 0,
        //     ColumnId: existingColumnId,
        //     DropDownConfigId: 0,
        //     Position: index + 1,
        //     IsSelected: true,
        //   })) ?? [];

        const columnPayload = {
          Id: existingColumnId,
          Name: field.l.trim(),
          ControlTypeId: controlTypeId,
          LoadingFrom: controlTypeId === 2 ? "2" : "0",
          LoadingData: "0",
          LoadingOCR: false,
          LoadingPrintText: false,
          RCM: field.r ? 2 : 0,
          DropDownValues: controlTypeId === 2 ? optionPayload : [],
          RadioButtonValues: controlTypeId === 3 ? optionPayload : [],
          CheckBoxValues: controlTypeId === 9 ? optionPayload : [],
        };

        const saved = await apiJson("/api/formbuilder/dynamic-columns", {
          method: "POST",
          body: JSON.stringify(columnPayload),
        });
        const savedId = await resolveSavedColumnId(field, saved);
        if (!savedId) throw new Error(`Backend did not return an id for ${field.l}`);
        nextColumnIds[field.id] = savedId;
        updateField(field.id, { id: savedId });
      }

      // Delete any previously published backend columns that are no longer on the layout canvas
      try {
        // const originalIds = Object.values(publishedColumnIds || {});

        const originalIds = Object.values(publishedColumnIdsRef.current || {});
        const keptIds = Object.values(nextColumnIds || {});
        const toDelete = originalIds.filter((id) => id && !keptIds.includes(id));
        
        for (const id of toDelete) {
          try {
            await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`, { method: "DELETE" });
          } catch (err) {
            console.warn("Failed to delete old column", id, err);
          }
        }
      } catch (err) {
        console.warn("Error while deleting stale columns", err);
      }
      // REPLACE this block (after saving dynamic columns):
setPublishStatus("Creating task view...");
const taskForm = await apiJson(`/api/formbuilder/tasks?id=${publishedTaskId ?? 0}`);
const backendTaskRows: TaskDynamicColumn[] = asArray(taskForm?.DynamicColumns ?? taskForm?.dynamicColumns).map(normalizeTaskDynamicColumn);
const taskRowsById = new Map<number, TaskDynamicColumn>(backendTaskRows.map((row) => [row.id, row]));
const firstGlobalFieldId = backendFields.find((field) => {
  const controlTypeId = fieldControlTypeId(field);
  return ![5, 8].includes(controlTypeId);
})?.id;

const taskPayload = {
  Id: publishedTaskId ?? 0,
  Name: formName.trim(),
  MarkerPath: markerPath || "0",
  UOM: uom,
  TaskType: taskType,
  Progress: progress,
  LocationSelection: locationSelection || backendFields.some((field) => field.t === "location"),
  DynamicColumns: backendFields.map((field, index) => {
    const columnId = nextColumnIds[field.id];
    const existingTaskRow = taskRowsById.get(columnId);
    const pageIndex = pgIdx(field.pg);

    let calculatedSectionNo = 0;
    const pageFieldsList = fields.filter((f) => f.pg === field.pg);
    const currentFieldGlobalIdx = pageFieldsList.findIndex((f) => f.id === field.id);
    const sectionsBefore = pageFieldsList
      .slice(0, currentFieldGlobalIdx + 1)
      .filter((f) => f.t === "section").length;
    calculatedSectionNo = sectionsBefore === 0 ? 1 : sectionsBefore;


    

    return {
      Position: index,
      Id: columnId,
      TaskAttributeId: existingTaskRow?.taskAttributeId ?? null,
      TaskSelected: true,
      GlobalName: field.id === firstGlobalFieldId,
      SectionTitle: sectionForField(field),
      SectionNo: calculatedSectionNo,
      PageNo: Math.max(pageIndex + 1, 1),
    };
  }),
};

      // setPublishStatus("Creating task view...");
      // const taskForm = await apiJson(`/api/formbuilder/tasks?id=${publishedTaskId ?? 0}`);
      // const backendTaskRows: TaskDynamicColumn[] = asArray(taskForm?.DynamicColumns ?? taskForm?.dynamicColumns).map(normalizeTaskDynamicColumn);
      // const taskRowsById = new Map<number, TaskDynamicColumn>(backendTaskRows.map((row) => [row.id, row]));
      // const firstGlobalFieldId = backendFields.find((field) => {
      //   const controlTypeId = fieldControlTypeId(field);
      //   return ![5, 8].includes(controlTypeId);
      // })?.id;

      // const taskPayload = {
      //   Id: publishedTaskId ?? 0,
      //   Name: formName.trim(),
      //   MarkerPath: markerPath || "0",
      //   UOM: uom,
      //   TaskType: taskType,
      //   Progress: progress,
      //   LocationSelection: locationSelection || backendFields.some((field) => field.t === "location"),
      //   DynamicColumns: backendFields.map((field, index) => {
      //     const columnId = nextColumnIds[field.id];
      //     const existingTaskRow = taskRowsById.get(columnId);
      //     const pageIndex = pgIdx(field.pg);

      //     let calculatedSectionNo = 0;
      //     const pageFieldsList = fields.filter((f) => f.pg === field.pg);
      //     const currentFieldGlobalIdx = pageFieldsList.findIndex((f) => f.id === field.id);
      //     const sectionsBefore = pageFieldsList
      //       .slice(0, currentFieldGlobalIdx + 1)
      //       .filter((f) => f.t === "section").length;
      //     calculatedSectionNo = sectionsBefore === 0 ? 1 : sectionsBefore;

      //     return {
      //       Position: index,
      //       Id: columnId,
      //       TaskAttributeId: existingTaskRow?.taskAttributeId ?? null,
      //       TaskSelected: true,
      //       GlobalName: field.id === firstGlobalFieldId,
      //       SectionTitle: sectionForField(field),
      //       SectionNo: calculatedSectionNo,
      //       PageNo: Math.max(pageIndex + 1, 1),
      //     };
      //   }),
      // };

      const savedTask = await apiJson("/api/formbuilder/tasks", {
        method: "POST",
        body: JSON.stringify(taskPayload),
      });
      const savedTaskId = await resolveSavedTaskId(savedTask);


      setPublishedColumnIds(nextColumnIds);
publishedColumnIdsRef.current = nextColumnIds;
setPublishedTaskId(savedTaskId ?? null);
persistDraft(nextColumnIds, savedTaskId ?? null);
      // setPublishedColumnIds(nextColumnIds);
      // setPublishedTaskId(savedTaskId ?? null);
      // persistDraft(nextColumnIds, savedTaskId ?? null);
      setDraftStatus("Draft saved");
      setPublishStatus(`Published ${backendFields.length} fields and created the task view.`);
      // Clear form after successful publish
setFormName("Survey Form");
setMarkerPath("0");
setUom("0");
setTaskType("0");
setProgress(0);
setLocationSelection(false);

setPages([{ id: "p1", name: "Page 1" }]);
setActivePg("p1");
setPrevPg("p1");

setFields([]);
setSelId(null);
newFieldIdsRef.current = new Set();

setPublishedColumnIds({});
setPublishedTaskId(null);

 // Clear saved draft
// localStorage.removeItem(FORM_BUILDER_DRAFT_KEY);

    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };


  const addField = (fieldType: FieldType, value: number, backendId?: number) => {
  const id = backendId ?? nid();
  if (!backendId) newFieldIdsRef.current.add(id); // <-- ADD THIS LINE
  
  const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
  const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);
  const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

  const assignedVs =
    value === 2 ? "backend_dropdown_values" :
    value === 3 ? "backend_radio_values" :
    value === 9 ? "backend_checkbox_values" :
    defaultValueSet || "";

  const newField: Field = {
    id,
    t: fieldType,
    controlTypeId: value,
    l: `${preciseLabel} Field`, 
    r: false,
    pg: activePg,
    vs: assignedVs,
  };

  setFields((prev) => [...prev, newField]);
  setSelId(id);
  
  if (assignedVs) {
    setSelVS(assignedVs); 
  }

  // REPLACED THE OLD COPY BLOCK WITH THIS CLEAN CALL
  if ([2, 3, 9].includes(value)) {
    loadSourceOptions(newField);
  }
};


//   const addField = (fieldType: FieldType, value: number, backendId?: number) => {
//   const id = backendId ?? nid(); // Use the actual DB ID if it exists
  
//   const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
//   const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);
//   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

//   const assignedVs =
//   value === 2 ? "backend_dropdown_values" :
//   value === 3 ? "backend_radio_values" :
//   value === 9 ? "backend_checkbox_values" :
//   defaultValueSet || "";

//   const newField: Field = {
//     id, // This links the canvas item directly to your DB identity row
//     t: fieldType,
//     controlTypeId: value,
//     l: `${preciseLabel} Field`, 
//     r: false,
//     pg: activePg,
//     vs: assignedVs,
//   };

//   setFields((prev) => [...prev, newField]);
//   setSelId(id);
  
//   if (assignedVs) {
//     setSelVS(assignedVs); 
//   }

//   // if ([2, 3, 9].includes(value)) {
//   //   loadSourceOptions(newField);
//   // }
//   if ([2, 3, 9].includes(value)) {
//   // For new fields, copy the master list into their per-field cache key
//   const type = optionTypeForControl(value);
//   const masterKey = type; // "dropdown", "radio", or "checkbox"
//   const fieldKey = `${type}:${id}`;
//   if (optionValuesBySource[masterKey]) {
//     setOptionValuesBySource((prev) => ({ ...prev, [fieldKey]: prev[masterKey] }));
//   } else {
//     loadSourceOptions(newField);
//   }
// }
// };


useEffect(() => {
  if (selField && selField.vs) {
    setSelVS(selField.vs);
  }
}, [selField?.id, selField?.vs]);

const reorderFields = (draggedId: number, targetId: number) => {
  setFields((prev) => {
    const allFields = [...prev];
    const draggedIdx = allFields.findIndex((f) => f.id === draggedId);
    const targetIdx = allFields.findIndex((f) => f.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return prev;

    // Remove the dragged element from its old global position
    const [draggedItem] = allFields.splice(draggedIdx, 1);
    
    // Re-insert the dragged element directly at the target's global position
    allFields.splice(targetIdx, 0, draggedItem);

    return allFields;
  });
};

  const deleteField = (id: number) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selId === id) setSelId(null);
  };

  const moveField = (id: number, dir: "up" | "dn") => {
    const pf = pgFields(activePg);
    const all = [...fields];
    const pi = pf.findIndex((f) => f.id === id);
    if (dir === "up" && pi > 0) {
      const ai = all.findIndex((f) => f.id === id);
      const bi = all.findIndex((f) => f.id === pf[pi - 1].id);
      [all[bi], all[ai]] = [all[ai], all[bi]];
    } else if (dir === "dn" && pi < pf.length - 1) {
      const ai = all.findIndex((f) => f.id === id);
      const bi = all.findIndex((f) => f.id === pf[pi + 1].id);
      [all[ai], all[bi]] = [all[bi], all[ai]];
    }
    setFields(all);
  };
  

  const updateField = (id: number, patch: Partial<Field>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const toggleFieldOption = (field: Field, optionId: number) => {
    const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
    if (selectedIds.has(optionId)) {
      selectedIds.delete(optionId);
    } else {
      selectedIds.add(optionId);
    }
    updateField(field.id, { selectedOptionIds: Array.from(selectedIds) });
  };

  const addPage = () => {
    const id = "p" + nid();
    setPages((prev) => [...prev, { id, name: "New Page" }]);
    setActivePg(id);
    setEditPgId(id);
    setTimeout(() => pgRenameRef.current?.focus(), 50);
  };

  const deletePage = (pid: string) => {
    if (pages.length <= 1) return;
    const rem = pages.filter((p) => p.id !== pid);
    const fb = rem[0].id;
    setPages(rem);
    setFields((prev) => prev.map((f) => (f.pg === pid ? { ...f, pg: fb } : f)));
    if (activePg === pid) setActivePg(fb);
  };

  const addValueSet = () => {
    if (!newVsName.trim()) return;
    const id = newVsName.toLowerCase().replace(/\s+/g, "_") + "_" + nid();
    setValueSets((prev) => [...prev, { id, n: newVsName.trim(), v: [] }]);
    setSelVS(id);
    setNewVsName("");
  };

  const addVsValue = () => {
    if (!newVsVal.trim() || !selVS) return;
    setValueSets((prev) =>
      prev.map((v) => (v.id === selVS ? { ...v, v: [...v.v, newVsVal.trim()] } : v))
    );
    setNewVsVal("");
  };

  const saveVsEdit = (i: number) => {
    if (!selVS) return;
    setValueSets((prev) =>
      prev.map((v) => (v.id === selVS ? { ...v, v: v.v.map((val, j) => (j === i ? editVsVal : val)) } : v))
    );
    setEditVsIdx(null);
  };

  const deleteVsValue = (i: number) => {
    if (!selVS) return;
    setValueSets((prev) =>
      prev.map((v) => (v.id === selVS ? { ...v, v: v.v.filter((_, j) => j !== i) } : v))
    );
  };

   useEffect(() => {
  if (!selField) return;
  if (Number(selField.controlTypeId) !== 2) return;
  if (!selField.vs) return;

  loadSourceOptions(selField);
}, [selField?.id, selField?.vs, selField?.controlTypeId]);

  const addsection = () => {
  const id = nid();
  const newSection: Field = {
    id,
    t: "section",
    l: "NEW SECTION TITLE",
    r: false,
    pg: activePg,
  };

  setFields((prev) => [...prev, newSection]);
  setSelId(id); // Instantly highlight the section properties panel
};

  // Renders the "Add value" box + live values list for a shared backend value set
  // (Dropdown / Radio / Checkbox Values), scoped to whichever field is selected.
  const renderFieldValueSetEditor = (field: Field) => {
    const vsId = backendValueSetIdForField(field);
    const vs = valueSets.find((v) => v.id === vsId);
    if (!vs) return null;

    return (
      <div style={{ ...S.card, display: "flex", flexDirection: "column", marginBottom: 10 }}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>{vs.n}</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
        </div>
        <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
          <input
            value={newVsVal}
            onChange={(e) => setNewVsVal(e.target.value)}
            placeholder="Add value..."
            style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && newVsVal.trim()) {
                const val = newVsVal;
                setNewVsVal("");
                await addBackendValueForField(field, val);
              }
            }}
          />
          <button
            onClick={async () => {
              if (!newVsVal.trim()) return;
              const val = newVsVal;
              setNewVsVal("");
              await addBackendValueForField(field, val);
            }}
            disabled={addingVsValue}
            style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11, opacity: addingVsValue ? 0.7 : 1 }}
          >
            {addingVsValue ? "Adding..." : "Add"}
          </button>
        </div>
        {/* <div style={{ overflowY: "auto", flex: 1, maxHeight: 160 }}>
          {vs.v.map((val, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
              <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
            </div>
          ))}
          {vs.v.length === 0 && (
            <div style={{ padding: "16px 11px", color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
              No values yet. Add one above.
            </div>
          )}
        </div> */}
      </div>
    );
  };

  // Renders the selectable options checklist (checkboxes) for an option-bearing field,
  // sourced from the shared backend list via getCachedOptions/optionValuesBySource.
  const renderFieldOptionsChecklist = (field: Field) => {
    const key = optionSourceKey(field);
    const optionValues = getCachedOptions(field);
    const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
    const loadingOptions = key ? optionLoadingBySource[key] : false;

    if (loadingOptions) {
      return <div style={{ marginTop: 5, fontSize: 10, color: "#718096" }}>Loading option values...</div>;
    }

    if (optionValues.length === 0) {
      return (
        <div style={{ marginTop: 5, fontSize: 10, color: "#e53e3e" }}>
          No option values found yet. Add one using the box above.
        </div>
      );
    }

    return (
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>
          Options <span style={{ color: "#e53e3e" }}>*</span>
        </label>
        <div style={{ padding: "6px 8px", background: "#f0faf8", borderRadius: 4, border: "1px solid rgba(29,184,152,.2)", maxHeight: 160, overflowY: "auto" }}>
          {optionValues.map((option) => (
            <label key={option.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px", fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={selectedIds.has(option.id)}
                onChange={() => toggleFieldOption(field, option.id)}
                style={{ accentColor: TEAL, width: 13, height: 13 }}
              />
              <span>{option.name}</span>
            </label>
          ))}
          <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{selectedIds.size} selected</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Page-level header bar with tabs */}
      <div style={{ background: "#fff", padding: "10px 16px 0", borderBottom: "1px solid #e2e6ea", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 500, color: TEAL }}>Form Builder</span>
            <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 8 }}>Task Management / Form Builder</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {draftStatus && <span style={{ fontSize: 10, color: "#718096" }}>{draftStatus}</span>}
            {publishStatus && (
              <span style={{ fontSize: 10, color: /failed|required|needs|error/i.test(publishStatus) ? "#dc2626" : TEAL }}>
                {publishStatus}
              </span>
            )}
            <button onClick={saveDraft} style={{ ...S.secBtn, padding: "4px 10px", fontSize: 11 }}>Save Draft</button>
            <button
              onClick={publishToBackend}
              disabled={publishing}
              style={{ ...S.tealBtn, padding: "4px 10px", fontSize: 11, opacity: publishing ? 0.7 : 1 }}
            >
              {publishing ? "Publishing..." : "Publish to Backend"}
            </button>
            <span style={{ fontSize: 10, color: TEAL, background: "#e8f7f4", padding: "2px 9px", borderRadius: 10 }}>
              {fieldCount} fields · {pages.length} pages · {fields.filter((f) => f.r).length} required
            </span>
          </div>
        </div>
        <div style={{ height: 2, background: TEAL, marginBottom: 0 }} />
        <div style={{ display: "flex" }}>
          {(["build", "vs", "prev"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 18px", border: "none", background: "transparent", fontSize: 12,
                borderBottom: tab === t ? `2px solid ${TEAL}` : "2px solid transparent",
                color: tab === t ? TEAL : "#718096", fontWeight: tab === t ? 600 : 400,
                cursor: "pointer", marginBottom: -1,
              }}
            >
              {t === "build" ? "Build Form" : t === "vs" ? "Value Sets" : "Mobile Preview"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {tab === "build" && (
          <div style={{ display: "grid", gridTemplateColumns: "172px 1fr 252px", height: "100%" }}>
            {/* Palette */}
            <div style={{ background: "#fff", borderRight: "1px solid #e2e6ea", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "10px 9px 0" }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Add Field</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {controlTypeOptions.map((c) => {
                    const textLabel = String(c.Text ?? c.label ?? "").toLowerCase();
                    const resolvedType: FieldType = textLabel.includes("date")
                      ? "date"
                      : textLabel.includes("image") || textLabel.includes("photo")
                      ? "photo"
                      : textLabel.includes("video")
                      ? "photo"
                      : textLabel.includes("file") || textLabel.includes("upload")
                      ? "photo"
                      : textLabel.includes("dropdown")
                      ? "dropdown"
                      : textLabel.includes("radio")
                      ? "radio"
                      : textLabel.includes("checkbox")
                      ? "checkbox"
                      : textLabel.includes("textarea")
                      ? "textarea"
                      : textLabel.includes("decimal") || textLabel.includes("float")
                      ? "number"
                      : textLabel.includes("number")
                      ? "number"
                      : fieldTypeForControl(Number(c.value));

                    return (
                      <button
                        key={c.value}
                        onClick={() => addField(resolvedType, Number(c.value))}
                        style={{
                          background: "#fff", border: "1px solid #e2e6ea", borderRadius: 4,
                          padding: "6px 3px", display: "flex", flexDirection: "column", alignItems: "center",
                          gap: 2, cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = TEAL;
                          (e.currentTarget as HTMLElement).style.background = "#f0faf8";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = "#e2e6ea";
                          (e.currentTarget as HTMLElement).style.background = "#fff";
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>{c.Text ?? c.label}</span>
                        <span style={{ fontSize: 9, color: "#94a3b8" }}>{c.Text ?? c.label}</span>
                      </button>
                    );
                  })}
                  
                    <button  onClick={addsection} style={{
                        background: "#fff", border: "1px solid #e2e6ea", borderRadius: 4,gridColumn: "span 2",
                        padding: "6px 3px", display: "flex", flexDirection: "column", alignItems: "center",width:"100%",
                        gap: 2, cursor: "pointer",
                      }}>  <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>Section</span>
                      <span style={{ fontSize: 9, color: "#94a3b8" }}>Section</span></button>
                </div>
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ borderTop: "1px solid #e2e6ea", padding: 10 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Form Settings</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Form Name</div>
                <input
                  value={formName} onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
                />
                <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Marker Path</div>
                <input
                  value={markerPath}
                  onChange={(e) => setMarkerPath(e.target.value)}
                  style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
                  placeholder="0"
                />
                <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>UOM</div>
                <select
                  value={uom}
                  onChange={(e) => setUom(e.target.value)}
                  style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#2d3748" }}
                >
                  <option value="0">-- Select --</option>
                  {uomOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Task Type</div>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#2d3748" }}
                >
                  <option value="0">-- Select --</option>
                  {taskTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Progress Increment (%)</div>
                <input
              
                  min={1}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
                />
                <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#718096", marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={locationSelection}
                    onChange={(e) => setLocationSelection(e.target.checked)}
                    style={{ accentColor: TEAL }}
                  />
                  User need to update location
                </label>
                <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8" }}>{fieldCount} fields across {pages.length} pages</div>
              </div>
            </div>

            {/* Canvas */}
            <div style={{ background: "#f0f2f5", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Page tabs */}
              <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 10px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
                {pages.map((p) => {
                  const cnt = pgFields(p.id).filter((f) => f.t !== "section").length;
                  const on = activePg === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => { setActivePg(p.id); setEditPgId(null); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 5, padding: "7px 9px 6px",
                        borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
                        color: on ? TEAL : "#718096", borderRight: "1px solid #f1f5f9",
                        background: on ? "rgba(29,184,152,0.04)" : "transparent",
                        whiteSpace: "nowrap", cursor: "pointer", fontSize: 11, fontWeight: on ? 600 : 400,
                      }}
                    >
                      {editPgId === p.id ? (
                        <input
                          ref={pgRenameRef}
                          defaultValue={p.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setPages((prev) => prev.map((pp) => (pp.id === p.id ? { ...pp, name: e.target.value } : pp)))}
                          onBlur={() => setEditPgId(null)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditPgId(null); }}
                          style={{ width: 78, border: `1px solid ${TEAL}`, borderRadius: 3, padding: "1px 5px", fontSize: 11, outline: "none" }}
                        />
                      ) : (
                        <span onDoubleClick={(e) => { e.stopPropagation(); setEditPgId(p.id); setActivePg(p.id); }}>
                          {p.name}
                        </span>
                      )}
                      <span style={{ fontSize: 9, background: on ? "rgba(29,184,152,.1)" : "#f1f5f9", color: on ? TEAL : "#94a3b8", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>{cnt}</span>
                      {pages.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
                          style={{ fontSize: 11, color: "#cbd5e1", border: "none", background: "none", padding: "0 1px", cursor: "pointer" }}
                        >×</button>
                      )}
                    </div>
                  );
                })}
                <button onClick={addPage} style={{ border: "none", background: "none", color: TEAL, fontSize: 11, padding: "7px 10px", fontWeight: 600, cursor: "pointer" }}>+ Page</button>
              </div>

              {/* Fields */}
              <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                <div style={{ background: "#fff", borderRadius: 5, border: "1px solid #e2e6ea", overflow: "hidden" }}>
                   {/* middle form */}
                  <div style={{ background: "#1a2740", padding: "9px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "0.03em" }}>{formName} — {pgName(activePg)}</div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Step{pgIdx(activePg) + 1} of {pages.length}</div>
                  </div>

                  <div style={{ height: 3, background: TEAL }} />
                  {pgFields(activePg).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>
                      No fields on this page.<br /><span style={{ fontSize: 11 }}>Click a field type on the left to add.</span>
                    </div>
                  ) : (
                    pgFields(activePg).map((f, i) => {
                      const on = selId === f.id;
                      const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
                      
                      return (
                        <div
                          key={f.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", String(f.id));
                            e.currentTarget.style.opacity = "0.4";
                          }}
                          onDragEnd={(e) => {
                            e.currentTarget.style.opacity = "1";
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = Number(e.dataTransfer.getData("text/plain"));
                            if (draggedId !== f.id) {
                              reorderFields(draggedId, f.id);
                            }
                          }}
                          onClick={() => setSelId(on ? null : f.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
                            cursor: "grab", borderBottom: "1px solid #edf0f3",
                            borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
                            background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
                            transition: "opacity 0.2s ease",
                          }} 
                        > 
                          <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
                          <span style={{ fontSize: 9, color: "#c0c7d0", minWidth: 16, textAlign: "center" }}>{i + 1}</span>
                          
                          {f.t === "section" ? (
  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
    <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
    <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{f.l}</span>
    <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
  </div>
) : (
  <>
    <span style={{ fontSize: 12.5, color: "#374151", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {f.l}{f.r && <span style={{ color: "#e53e3e", fontSize: 10 }}> *</span>}
    </span>
    {/* This pill on the side will show the structural execution engine variant (e.g. photo or number) */}
    <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>
      {controlTypeOptions.find((c) => Number(c.value) === f.controlTypeId)?.Text || f.t}
    </span>
    {vs && <span style={{ fontSize: 9, color: TEAL, background: "#e8f7f4", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{vs.n}</span>}
  </>
)}
                          {on && (
                            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                              <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "up"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↑</button>
                              <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "dn"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↓</button>
                              <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#e53e3e", cursor: "pointer" }}>×</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div style={{ textAlign: "center", padding: 9, color: "#d1d5db", fontSize: 10, borderTop: "1px dashed #e9ecef" }}>
                    ← click a field type to add it to this page
                  </div>
                </div>
              </div>
            </div>

            {/* Properties Panel */}
            <div style={{ background: "#fff", borderLeft: "1px solid #e2e6ea", overflowY: "auto" }}>
              {selField ? (
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Field Properties</div>               
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Label <span style={{ color: "#e53e3e" }}>*</span></label>
                    <input style={{ ...S.inp, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
                      value={selField.l} onChange={(e) => updateField(selField.id, { l: e.target.value })} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Page</label>
                    <select style={{ ...S.sel, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
                      value={selField.pg} onChange={(e) => updateField(selField.id, { pg: e.target.value })}>
                      {pages.map((p, i) => <option key={p.id} value={p.id}>Step {i + 1}: {p.name}</option>)}
                    </select>
                    <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>⇄ Moves this field to the selected page</div>
                  </div>

                  {(Number(selField.controlTypeId) === 2 || Number(selField.controlTypeId) === 3 || Number(selField.controlTypeId) === 9) && (
                    <div style={{ marginBottom: 12 }}>
                      {renderFieldValueSetEditor(selField)}
                      {renderFieldOptionsChecklist(selField)}
                    </div>
                  )}

                  <div style={{ fontSize: 10, color: "#718096", marginBottom: 8 }}>Settings</div>
                  <Toggle on={selField.r} onToggle={() => updateField(selField.id, { r: !selField.r })} label="Required" sub="Field must be filled" />

                  <button
                    onClick={() => deleteField(selField.id)}
                    style={{ width: "100%", padding: 7, background: "#fff", border: "1px solid #fecaca", color: "#e53e3e", borderRadius: 4, fontSize: 11, marginTop: 8, cursor: "pointer" }}
                  >
                    Delete Field
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#94a3b8", textAlign: "center", gap: 8, padding: 20 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" /><line x1="7" y1="16" x2="10" y2="16" /></svg>
                  <span style={{ fontSize: 12 }}>Select a field to edit</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "vs" && (
          <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: 12, padding: 14, height: "100%", overflowY: "auto" }}>
            {/* Value Set List */}
            <div style={{ ...S.card, display: "flex", flexDirection: "column", height: "fit-content" }}>
              <div style={{ ...S.cardHeader, justifyContent: "space-between" }}>
                <span style={S.cardTitle}>Value Sets </span>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {valueSets.map((vs) => (
                  <div key={vs.id} onClick={() => setSelVS(vs.id)}
                    style={{ padding: "8px 11px", cursor: "pointer", borderBottom: "1px solid #f5f7f9", borderLeft: `3px solid ${selVS === vs.id ? TEAL : "transparent"}`, background: selVS === vs.id ? "#f0faf8" : "transparent" }}>
                    <div style={{ fontSize: 12, color: "#374151" }}>{vs.n}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{vs.v.length} values</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Set Detail */}
            {selVS && (() => {
              const vs = valueSets.find((v) => v.id === selVS);
              if (!vs) return null;
              return (
                <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
                  <div style={S.cardHeader}>
                    <span style={S.cardTitle}>{vs.n}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
                  </div>
                  <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
                    <input value={newVsVal} onChange={(e) => setNewVsVal(e.target.value)}
                      placeholder="Add value..."
                      style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
                      onKeyDown={(e) => { if (e.key === "Enter") addVsValue(); }}
                    />
                    <button onClick={addVsValue} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {vs.v.map((val, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
                        {editVsIdx === i ? (
                          <>
                            <input autoFocus value={editVsVal} onChange={(e) => setEditVsVal(e.target.value)}
                              style={{ flex: 1, padding: "3px 7px", border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 12, outline: "none" }}
                              onKeyDown={(e) => { if (e.key === "Enter") saveVsEdit(i); }}
                            />
                            <button onClick={() => saveVsEdit(i)} style={{ ...S.tealBtn, padding: "3px 8px", fontSize: 11 }}>Save</button>
                            <button onClick={() => setEditVsIdx(null)} style={{ ...S.secBtn, padding: "3px 8px", fontSize: 11 }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
                            <button onClick={() => { setEditVsIdx(i); setEditVsVal(val); }} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏</button>
                            <button onClick={() => deleteVsValue(i)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>×</button>
                          </>
                        )}
                      </div>
                    ))}
                    {vs.v.length === 0 && <div style={{ padding: "20px 11px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No values yet. Add one above.</div>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === "prev" && (
          <div style={{ overflowY: "auto", padding: 14 }}>
            {/* Mobile preview */}
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              {/* Page selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, justifyContent: "center" }}>
                {pages.map((p, i) => (
                  <button key={p.id} onClick={() => setPrevPg(p.id)}
                    style={{ padding: "5px 12px", border: `1px solid ${prevPg === p.id ? TEAL : "#e2e6ea"}`, borderRadius: 16, fontSize: 11, background: prevPg === p.id ? TEAL : "#fff", color: prevPg === p.id ? "#fff" : "#374151", cursor: "pointer" }}>
                    Step {i + 1}
                  </button>
                ))}
              </div>
              {/* Phone mockup */}
              <div style={{ border: "8px solid #1a2740", borderRadius: 24, padding: 12, background: "#f8fafc", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
                <div style={{ height: 3, background: TEAL, borderRadius: 2, marginBottom: 10 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1a2740", marginBottom: 8 }}>{pgName(prevPg)}</div>
                {pgFields(prevPg).map((f) => (
                  <div key={f.id} style={{ marginBottom: 10 }}>
                    {f.t === "section" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ flex: 1, height: 1, background: "#e2e6ea" }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{f.l}</span>
                        <div style={{ flex: 1, height: 1, background: "#e2e6ea" }} />
                      </div>
                    ) : (
                      <>
                        <label style={{ fontSize: 10, color: "#374151", display: "block", marginBottom: 3 }}>
                          {f.l}{f.r && <span style={{ color: "#e53e3e" }}> *</span>}
                        </label>
                        {f.t === "dropdown" ? (
                          <select style={{ ...S.sel, fontSize: 12, padding: "5px 8px" }}>
                            <option>-- Select --</option>
                            {selectedOptionsForField(f).map((opt) => (
                              <option key={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        ) : f.t === "radio" ? (
                          <div style={{ display: "flex", gap: 12, padding: "2px 0" }}>
                            {selectedOptionsForField(f).map((opt) => (
                              <label key={opt.id} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                <input type="radio" name={`prev_${f.id}`} style={{ accentColor: TEAL }} /> {opt.name}
                              </label>
                            ))}
                          </div>
                        ) : f.t === "checkbox" ? (
                          <div style={{ display: "flex", gap: 12, padding: "2px 0" }}>
                            {selectedOptionsForField(f).map((opt) => (
                              <label key={opt.id} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                                <input type="checkbox" style={{ accentColor: TEAL }} /> {opt.name}
                              </label>
                            ))}
                          </div>
                        ) : f.t === "date" ? (
                          <input type="date" style={{ ...S.inp, fontSize: 12, padding: "5px 8px" }} />
                        ) : f.t === "textarea" ? (
                          <textarea style={{ ...S.inp, fontSize: 12, padding: "5px 8px", minHeight: 60, resize: "none" }} placeholder={f.ph ?? ""} />
                        ) : f.t === "photo" ? (
                          <div style={{ border: "2px dashed #d1d5db", borderRadius: 6, padding: "12px 0", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>📷 Tap to capture</div>
                        ) : f.t === "location" ? (
                          <div style={{ border: "2px dashed #d1d5db", borderRadius: 6, padding: "12px 0", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>📍 Tap to capture location</div>
                        ) : f.t === "signature" ? (
                          <div style={{ border: "1px solid #d1d5db", borderRadius: 6, height: 60, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8" }}>✍ Sign here</div>
                        ) : (
                          <input type={f.t === "number" ? "number" : "text"} placeholder={f.ph ?? ""} style={{ ...S.inp, fontSize: 12, padding: "5px 8px" }} />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DYNAMIC COLUMNS ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DynamicColumnsPage() {
  const [columns, setColumns] = useState<DynamicColumn[]>([
    { id: 1, name: "Plot Number", controlTypeId: 1, controlTypeName: "Text Box", carryForward: false, mandatory: true, loadingOCR: false, loadingPrintText: false },
    { id: 2, name: "Land Use Type", controlTypeId: 2, controlTypeName: "Dropdown", carryForward: true, mandatory: false, loadingOCR: false, loadingPrintText: true },
    { id: 3, name: "Survey Status", controlTypeId: 3, controlTypeName: "Radio Button", carryForward: false, mandatory: true, loadingOCR: false, loadingPrintText: false },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [columnName, setColumnName] = useState("");
  const [controlTypeId, setControlTypeId] = useState(1);
  const [rcm, setRcm] = useState<RCM>(0);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [loadingPrintText, setLoadingPrintText] = useState(false);
  const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(2);
  const [showDdSelect, setShowDdSelect] = useState(false);

  const openForm = (id?: number) => {
    if (id) {
      const col = columns.find((c) => c.id === id);
      if (col) {
        setEditId(id);
        setColumnName(col.name);
        setControlTypeId(col.controlTypeId);
        setRcm(col.carryForward ? 1 : col.mandatory ? 2 : 0);
        setLoadingOCR(col.loadingOCR);
        setLoadingPrintText(col.loadingPrintText);
        setOptionValues([
          { id: 1, name: "Option A", isSelected: true, position: 0, columnId: id, dropDownConfigId: 0 },
          { id: 2, name: "Option B", isSelected: false, position: 1, columnId: id, dropDownConfigId: 0 },
        ]);
      }
    } else {
      setEditId(null);
      setColumnName("");
      setControlTypeId(1);
      setRcm(0);
      setLoadingOCR(false);
      setLoadingPrintText(false);
      setOptionValues([]);
    }
    setShowDdSelect([2, 3, 9].includes(controlTypeId));
    setModalOpen(true);
  };

  const save = () => {
    const ctName = CONTROL_TYPES.find((c) => c.value === controlTypeId)?.label ?? "";
    if (editId) {
      setColumns((prev) => prev.map((c) => c.id === editId ? { ...c, name: columnName, controlTypeId, controlTypeName: ctName, carryForward: rcm === 1, mandatory: rcm === 2, loadingOCR, loadingPrintText } : c));
    } else {
      setColumns((prev) => [...prev, { id: nid(), name: columnName, controlTypeId, controlTypeName: ctName, carryForward: rcm === 1, mandatory: rcm === 2, loadingOCR, loadingPrintText }]);
    }
    setModalOpen(false);
  };

  const deleteCol = (id: number) => {
    if (confirm("Delete this column?")) setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const filtered = columns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const handleControlChange = (val: number) => {
    setControlTypeId(val);
    setShowDdSelect([2, 3, 9].includes(val));
    if (val === 2 || val === 3 || val === 9) {
      setOptionValues([
        { id: nid(), name: "Option 1", isSelected: false, position: 0, columnId: 0, dropDownConfigId: 0 },
        { id: nid(), name: "Option 2", isSelected: false, position: 1, columnId: 0, dropDownConfigId: 0 },
      ]);
    } else {
      setOptionValues([]);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Dynamic Columns </span>
        </div>
        {/* <TableToolbar onAdd={() => openForm()} addLabel="Dynamic Column" search={search} onSearch={setSearch} /> */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {["Name", "Control Type", "Carry Forward", "Mandatory", "OCR", "Print Text", "Action"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((col, i) => (
                <tr key={col.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={S.td}>{col.name}</td>
                  <td style={S.td}>{col.controlTypeName}</td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.carryForward ? "#e8f7f4" : "#f1f5f9", color: col.carryForward ? TEAL : "#94a3b8" }}>{col.carryForward ? "Yes" : "No"}</span></td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.mandatory ? "#fff1f0" : "#f1f5f9", color: col.mandatory ? "#e53e3e" : "#94a3b8" }}>{col.mandatory ? "Yes" : "No"}</span></td>
                  <td style={S.td}>{col.loadingOCR ? "✓" : "—"}</td>
                  <td style={S.td}>{col.loadingPrintText ? "✓" : "—"}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => openForm(col.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit</button>
                      <button onClick={() => deleteCol(col.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* <Pagination total={columns.length} showing={filtered.length} /> */}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Dynamic Column" : "Add Dynamic Column "}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Column Name</label>
          <input style={S.inp} value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Enter column name" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Control Type</label>
          <select style={S.sel} value={controlTypeId} onChange={(e) => handleControlChange(Number(e.target.value))}>
            {CONTROL_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {showDdSelect && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Choose Data From</label>
            <select style={S.sel} value={loadingFrom} onChange={(e) => setLoadingFrom(Number(e.target.value))}>
              <option value={1}>Master Data</option>
              <option value={2}>Custom Values</option>
            </select>
          </div>
        )}
        {optionValues.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Option Values</label>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Select", "Name", "Position"].map((h) => <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {optionValues.map((opt, i) => (
                  <tr key={opt.id} style={{ background: opt.isSelected ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ ...S.td, width: 50 }}>
                      <input type="checkbox" checked={opt.isSelected}
                        onChange={() => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, isSelected: !o.isSelected } : o))}
                        style={{ accentColor: TEAL, width: 14, height: 14 }} />
                    </td>
                    <td style={{ ...S.td, color: opt.isSelected ? "#1a5c48" : "#374151" }}>{opt.name}</td>
                    <td style={S.td}>
                      <input type="number" value={opt.position}
                        onChange={(e) => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, position: Number(e.target.value) } : o))}
                        style={{ width: 70, padding: "3px 6px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...S.lbl, marginBottom: 8 }}>Options</label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {([{ v: 0, l: "None" }, { v: 1, l: "Carry Forward" }, { v: 2, l: "Mandatory" }] as { v: RCM; l: string }[]).map(({ v, l }) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
                <input type="radio" name="rcm" value={v} checked={rcm === v} onChange={() => setRcm(v)} style={{ accentColor: TEAL }} /> {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={loadingOCR} onChange={(e) => setLoadingOCR(e.target.checked)} style={{ accentColor: TEAL }} /> OCR Field
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={loadingPrintText} onChange={(e) => setLoadingPrintText(e.target.checked)} style={{ accentColor: TEAL }} /> Print Text
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
          <button onClick={save} style={S.tealBtn}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── TASK PAGE ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function TaskPage() {
  const [dynamicColumns] = useState<TaskDynamicColumn[]>([
    { id: 1, name: "Plot Number", controlTypeId: 1, taskAttributeId: null, taskSelected: true, globalName: false, sectionTitle: "Basic Info", sectionNo: 1, pageNo: 1 },
    { id: 2, name: "Land Use Type", controlTypeId: 2, taskAttributeId: null, taskSelected: false, globalName: false, sectionTitle: "", sectionNo: 1, pageNo: 1 },
    { id: 3, name: "Survey Status", controlTypeId: 3, taskAttributeId: null, taskSelected: true, globalName: true, sectionTitle: "Status", sectionNo: 2, pageNo: 2 },
  ]);
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, name: "Field Survey", markerPath: "pin_green", uom: "Unit", taskType: "Survey", progress: 10, locationSelection: true, dynamicColumns: dynamicColumns.map((c) => ({ ...c })) },
    { id: 2, name: "Infrastructure Inspection", markerPath: "pin_blue", uom: "KM", taskType: "Inspection", progress: 25, locationSelection: false, dynamicColumns: dynamicColumns.map((c) => ({ ...c })) },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [taskName, setTaskName] = useState("");
  const [markerPath, setMarkerPath] = useState("");
  const [uom, setUom] = useState(UOM_OPTIONS[0]);
  const [taskType, setTaskType] = useState(TASK_TYPES[0]);
  const [progress, setProgress] = useState(0);
  const [locationSelection, setLocationSelection] = useState(false);
  const [dcRows, setDcRows] = useState(dynamicColumns.map((c) => ({ ...c })));

  const openForm = (id?: number) => {
    if (id) {
      const task = tasks.find((t) => t.id === id);
      if (task) {
        setEditId(id);
        setTaskName(task.name);
        setMarkerPath(task.markerPath);
        setUom(task.uom);
        setTaskType(task.taskType);
        setProgress(task.progress);
        setLocationSelection(task.locationSelection);
        setDcRows(task.dynamicColumns ? task.dynamicColumns.map((c) => ({ ...c })) : dynamicColumns.map((c) => ({ ...c })));
      }
    } else {
      setEditId(null);
      setTaskName("");
      setMarkerPath("");
      setUom(UOM_OPTIONS[0]);
      setTaskType(TASK_TYPES[0]);
      setProgress(0);
      setLocationSelection(false);
      setDcRows(dynamicColumns.map((c) => ({ ...c })));
    }
    setModalOpen(true);
  };

  const save = () => {
    if (!taskName) return alert("Task Name required");
    if (!progress) return alert("Progress required");
    const enabledRows = dcRows.filter((r) => r.taskSelected && ![5, 8].includes(r.controlTypeId));
    const hasGlobal = enabledRows.some((r) => r.globalName);
    if (enabledRows.length > 0 && !hasGlobal) return alert("Please select one Global Name");

    if (editId) {
      setTasks((prev) => prev.map((t) => t.id === editId ? { ...t, name: taskName, markerPath, uom, taskType, progress, locationSelection, dynamicColumns: dcRows.map((r) => ({ ...r })) } : t));
    } else {
      setTasks((prev) => [...prev, { id: nid(), name: taskName, markerPath, uom, taskType, progress, locationSelection, dynamicColumns: dcRows.map((r) => ({ ...r })) }]);
    }
    setModalOpen(false);
  };

  const deleteTask = (id: number) => {
    if (confirm("Delete this task?")) setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filtered = tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Task Management </span>
        </div>
        {/* <TableToolbar onAdd={() => openForm()} addLabel="Task" search={search} onSearch={setSearch} /> */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {["Name", "Task Type", "Progress Increment", "Update Location Required", "Action"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => (
                <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={S.td}>{task.name}</td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e8f7f4", color: TEAL }}>{task.taskType}</span></td>
                  <td style={S.td}>{task.progress}%</td>
                  <td style={S.td}>{task.locationSelection ? <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>Yes</span> : <span style={{ color: "#94a3b8", fontSize: 11 }}>No</span>}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => openForm(task.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit</button>
                      <button onClick={() => deleteTask(task.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* <Pagination total={tasks.length} showing={filtered.length} /> */}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Task" : "Add Task "} wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={S.lbl}>Task Name</label>
            <input style={S.inp} value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task Name" />
          </div>
          <div>
            <label style={S.lbl}>Marker Path</label>
            <input style={S.inp} value={markerPath} onChange={(e) => setMarkerPath(e.target.value)} placeholder="e.g. pin_green" />
          </div>
          <div>
            <label style={S.lbl}>UOM</label>
            <select style={S.sel} value={uom} onChange={(e) => setUom(e.target.value)}>
              {UOM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Task Type</label>
            <select style={S.sel} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Progress Increment (%)</label>
            <input type="number" style={S.inp} value={progress} onChange={(e) => setProgress(Number(e.target.value))} min={0} max={100} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
            <input type="checkbox" checked={locationSelection} onChange={(e) => setLocationSelection(e.target.checked)} style={{ accentColor: TEAL, width: 15, height: 15 }} />
            User Need To Update Location
          </label>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #edf0f3", margin: "14px 0" }} />
        {/* Dynamic Columns sub-table */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Dynamic Columns</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Select", "Name", "Global Name", "Section Title", "Section No.", "Page No."].map((h) => (
                  <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dcRows.map((row, i) => {
                const showGlobal = ![5, 8].includes(row.controlTypeId);
                return (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={S.td}>
                      <input type="checkbox" checked={row.taskSelected}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, taskSelected: e.target.checked, globalName: e.target.checked ? r.globalName : false } : r))}
                        style={{ accentColor: TEAL, width: 14, height: 14 }} />
                    </td>
                    <td style={S.td}>{row.name}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      {showGlobal && (
                        <input type="radio" name="globalTask" checked={row.globalName} disabled={!row.taskSelected}
                          onChange={() => setDcRows((prev) => prev.map((r) => ({ ...r, globalName: r.id === row.id })))}
                          style={{ accentColor: TEAL }} />
                      )}
                    </td>
                    <td style={S.td}>
                      <input type="text" value={row.sectionTitle}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionTitle: e.target.value } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 120 }} />
                    </td>
                    <td style={S.td}>
                      <input type="number" value={row.sectionNo}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionNo: Number(e.target.value) } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
                    </td>
                    <td style={S.td}>
                      <input type="number" value={row.pageNo}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, pageNo: Number(e.target.value) } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
          <button onClick={save} style={S.tealBtn}>Save Task</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DROPDOWN / RADIO / CHECKBOX VALUES ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function SimpleValuePage({ title, addLabel }: { title: string; addLabel: string }) {
  const [items, setItems] = useState<{ id: number; name: string }[]>([
    { id: 1, name: "Active" },
    { id: 2, name: "Inactive" },
    { id: 3, name: "Pending" },
  ]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const openForm = (id?: number) => {
    if (id) {
      setEditId(id);
      setName(items.find((i) => i.id === id)?.name ?? "");
    } else {
      setEditId(null);
      setName("");
    }
    setModalOpen(true);
  };

  const save = () => {
    if (editId) {
      setItems((prev) => prev.map((i) => i.id === editId ? { ...i, name } : i));
    } else {
      setItems((prev) => [...prev, { id: nid(), name }]);
    }
    setModalOpen(false);
  };

  const del = (id: number) => {
    if (confirm("Delete this item?")) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>{title}</span>
        </div>
        {/* <TableToolbar onAdd={() => openForm()} addLabel={addLabel} search={search} onSearch={setSearch} /> */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Name", "Action"].map((h) => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ ...S.td, width: 40 }}>{i + 1}</td>
                  <td style={S.td}>{item.name}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => openForm(item.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit </button>
                      <button onClick={() => del(item.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* <Pagination total={items.length} showing={filtered.length} /> */}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `Edit ${addLabel}` : `Add ${addLabel}`}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Name</label>
          <input style={S.inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${addLabel} name`} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
          <button onClick={save} style={S.tealBtn}>Save</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ApiSimpleValuePage({ title, addLabel, endpoint }: { title: string; addLabel: string; endpoint: string }) {
  const [items, setItems] = useState<{ id: number; name: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiJson(endpoint);
      setItems(asArray(data).map((item: any) => ({
        id: Number(item.Id ?? item.id ?? 0),
        name: String(item.Name ?? item.name ?? ""),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [endpoint]);

  const openForm = async (id?: number) => {
    setError("");

    if (!id) {
      setEditId(null);
      setName("");
      setModalOpen(true);
      return;
    }

    try {
      const data = await apiJson(`${endpoint}?id=${id}`);
      setEditId(Number(data.Id ?? data.id ?? id));
      setName(String(data.Name ?? data.name ?? ""));
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load item");
    }
  };

  const save = async () => {
    if (!name.trim()) {
      setError(`${addLabel} name is required`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiJson(endpoint, {
        method: "POST",
        body: JSON.stringify({ Id: editId ?? 0, Name: name.trim() }),
      });
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("Delete this item?")) return;

    setSaving(true);
    setError("");
    try {
      await apiJson(`${endpoint}?id=${id}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>{title}</span>
        </div>
        {/* <TableToolbar onAdd={() => openForm()} addLabel={addLabel} search={search} onSearch={setSearch} /> */}
        <StatusLine loading={loading} saving={saving} error={error} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["#", "Name", "Action"].map((h) => <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ ...S.td, width: 40 }}>{i + 1}</td>
                  <td style={S.td}>{item.name} </td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => openForm(item.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => del(item.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* <Pagination total={items.length} showing={filtered.length} /> */}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `Edit ${addLabel}` : `Add ${addLabel}`}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Name</label>
          <input style={S.inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${addLabel} name`} />
        </div>
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
          <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </Modal>
    </div>
  );
}

function ApiDynamicColumnsPage() {
  const [columns, setColumns] = useState<DynamicColumn[]>([]);
  const [controlTypeOptions, setControlTypeOptions] = useState<LookupOption[]>(DEFAULT_CONTROL_TYPE_OPTIONS);
  const [loadingFromOptions, setLoadingFromOptions] = useState<LookupOption[]>(DEFAULT_LOADING_FROM);
  const [masterDataOptions, setMasterDataOptions] = useState<LookupOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [columnName, setColumnName] = useState("");
  const [controlTypeId, setControlTypeId] = useState(1);
  const [rcm, setRcm] = useState<RCM>(0);
  const [loadingOCR, setLoadingOCR] = useState(false);
  const [loadingPrintText, setLoadingPrintText] = useState(false);
  const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
  const [loadingFrom, setLoadingFrom] = useState("2");
  const [loadingData, setLoadingData] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadColumns = async () => {
    setLoading(true);
    setError("");
    try {
    
      const data = await apiJson("/api/formbuilder/dynamic-columns");
      // console.log("Loaded columns:", data);
      setColumns(asArray(data).map(normalizeDynamicColumn));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dynamic columns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColumns();

    async function loadLookups() {
      const [controlTypes, loadingFroms, masterData] = await Promise.allSettled([
        apiJson("/api/formbuilder/lookups?type=control-types"),
        apiJson("/api/formbuilder/lookups?type=loading-from"),
        apiJson("/api/formbuilder/lookups?type=master-data"),
      ]);

      if (controlTypes.status === "fulfilled") setControlTypeOptions(toLookupOptions(controlTypes.value, DEFAULT_CONTROL_TYPE_OPTIONS));
      if (loadingFroms.status === "fulfilled") setLoadingFromOptions(toLookupOptions(loadingFroms.value, DEFAULT_LOADING_FROM));
      if (masterData.status === "fulfilled") setMasterDataOptions(toLookupOptions(masterData.value));
    }

    loadLookups();
  }, []);

  const loadOptionValues = async (columnId: number, typeId: number, loadingFromValue = loadingFrom) => {
    const type = typeId === 2 ? "dropdown" : typeId === 3 ? "radio" : typeId === 9 ? "checkbox" : "";

    if (!type || (type === "dropdown" && loadingFromValue !== "2")) {
      setOptionValues([]);
      return;
    }

    const data = await apiJson(`/api/formbuilder/dynamic-column-options?type=${type}&id=${columnId || 0}`);
    setOptionValues(asArray(data).map(normalizeOptionValue));
  };

  const openForm = async (id?: number) => {
    setError("");

    if (!id) {
      setEditId(null);
      setColumnName("");
      setControlTypeId(1);
      setRcm(0);
      setLoadingOCR(false);
      setLoadingPrintText(false);
      setLoadingFrom("2");
      setLoadingData("0");
      setOptionValues([]);
      setModalOpen(true);
      return;
    }

    setSaving(true);
    try {
      const data = await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`);
      const column = normalizeDynamicColumn(data);
      setEditId(column.id);
      setColumnName(column.name);
      setControlTypeId(column.controlTypeId);
      setRcm(column.carryForward ? 1 : column.mandatory ? 2 : 0);
      setLoadingOCR(column.loadingOCR);
      setLoadingPrintText(column.loadingPrintText);
      setLoadingFrom(column.loadingFrom || "2");
      setLoadingData(column.loadingData || "0");
      setModalOpen(true);
      await loadOptionValues(column.id, column.controlTypeId, column.loadingFrom || "2");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load column");
    } finally {
      setSaving(false);
    }
  };

  const handleControlChange = async (value: number) => {
    setControlTypeId(value);
    setError("");
    try {
      await loadOptionValues(editId ?? 0, value, loadingFrom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load option values");
    }
  };

  const handleLoadingFromChange = async (value: string) => {
    setLoadingFrom(value);
    setError("");
    try {
      await loadOptionValues(editId ?? 0, controlTypeId, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load option values");
    }
  };

  const save = async () => {
    if (!columnName.trim()) {
      setError("Column Name cannot be empty");
      return;
    }
    if (controlTypeId === 2 && loadingFrom === "0") {
      setError("Choose Data From");
      return;
    }
    if (controlTypeId === 2 && loadingFrom === "1" && loadingData === "0") {
      setError("Choose Master Data");
      return;
    }

    const values = optionValues.map((item) => ({
      Id: item.id,
      ColumnId: item.columnId,
      DropDownConfigId: item.dropDownConfigId,
      Position: item.position,
      IsSelected: item.isSelected,
    }));
    const payload = {
      Id: editId ?? 0,
      Name: columnName.trim(),
      ControlTypeId: controlTypeId,
      LoadingFrom: loadingFrom,
      LoadingData: loadingData,
      LoadingOCR: loadingOCR,
      LoadingPrintText: loadingPrintText,
      RCM: rcm,
      DropDownValues: controlTypeId === 2 ? values : [],
      RadioButtonValues: controlTypeId === 3 ? values : [],
      CheckBoxValues: controlTypeId === 9 ? values : [],
    };

    setSaving(true);
    setError("");
    try {
        // console.log("Payload:", payload);
      await apiJson("/api/formbuilder/dynamic-columns", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
      await loadColumns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteCol = async (id: number) => {
    if (!confirm("Delete this column?")) return;

    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`, { method: "DELETE" });
      await loadColumns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const filtered = columns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const showOptionRows = optionValues.length > 0 && (controlTypeId === 3 || controlTypeId === 9 || (controlTypeId === 2 && loadingFrom === "2"));

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Dynamic Columns </span>
        </div>
        {/* <TableToolbar onAdd={() => openForm()} addLabel="Dynamic Column" search={search} onSearch={setSearch} /> */}
        <StatusLine loading={loading} saving={saving} error={error} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {["Name", "Control Type", "Carry Forward", "Mandatory", "OCR", "Print Text", "Action"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((col, i) => (
                <tr key={col.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={S.td}>{col.name}</td>
                  <td style={S.td}>{col.controlTypeName}</td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.carryForward ? "#e8f7f4" : "#f1f5f9", color: col.carryForward ? TEAL : "#94a3b8" }}>{col.carryForward ? "Yes" : "No"}</span></td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.mandatory ? "#fff1f0" : "#f1f5f9", color: col.mandatory ? "#e53e3e" : "#94a3b8" }}>{col.mandatory ? "Yes" : "No"}</span></td>
                  <td style={S.td}>{col.loadingOCR ? "Yes" : "No"}</td>
                  <td style={S.td}>{col.loadingPrintText ? "Yes" : "No"}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={() => openForm(col.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => deleteCol(col.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* <Pagination total={columns.length} showing={filtered.length} /> */}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Dynamic Column" : "Add Dynamic Column"}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Column Name</label>
          <input style={S.inp} value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Enter column name" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={S.lbl}>Control Type</label>
          <select style={S.sel} value={controlTypeId} onChange={(e) => handleControlChange(Number(e.target.value))}>
            {controlTypeOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        {controlTypeId === 2 && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Choose Data From</label>
            <select style={S.sel} value={loadingFrom} onChange={(e) => handleLoadingFromChange(e.target.value)}>
              <option value="0">-- Select --</option>
              {loadingFromOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {controlTypeId === 2 && loadingFrom === "1" && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Master Data</label>
            <select style={S.sel} value={loadingData} onChange={(e) => setLoadingData(e.target.value)}>
              <option value="0">-- Select --</option>
              {masterDataOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {showOptionRows && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.lbl}>Option Values</label>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Select", "Name", "Position"].map((h) => <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {optionValues.map((opt, i) => (
                  <tr key={`${opt.id}-${i}`} style={{ background: opt.isSelected ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ ...S.td, width: 50 }}>
                      <input type="checkbox" checked={opt.isSelected}
                        onChange={() => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, isSelected: !o.isSelected } : o))}
                        style={{ accentColor: TEAL, width: 14, height: 14 }} />
                    </td>
                    <td style={{ ...S.td, color: opt.isSelected ? "#1a5c48" : "#374151" }}>{opt.name}</td>
                    <td style={S.td}>
                      <input type="number" value={opt.position}
                        onChange={(e) => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, position: Number(e.target.value) } : o))}
                        style={{ width: 70, padding: "3px 6px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...S.lbl, marginBottom: 8 }}>Options</label>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {([{ v: 0, l: "None" }, { v: 1, l: "Carry Forward" }, { v: 2, l: "Mandatory" }] as { v: RCM; l: string }[]).map(({ v, l }) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
                <input type="radio" name="api-rcm" value={v} checked={rcm === v} onChange={() => setRcm(v)} style={{ accentColor: TEAL }} /> {l}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={loadingOCR} onChange={(e) => setLoadingOCR(e.target.checked)} style={{ accentColor: TEAL }} /> OCR Field
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={loadingPrintText} onChange={(e) => setLoadingPrintText(e.target.checked)} style={{ accentColor: TEAL }} /> Print Text
          </label>
        </div>
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
          <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </Modal>
    </div>
  );
}

function ApiTaskPage({ onEditTask, onCreateTask }: { 
  onEditTask: (taskName: string, taskId: number) => void;
  onCreateTask: () => void;
}){
  const [tasks, setTasks] = useState<Task[]>([]);
  console.log("Tasks state:", tasks);
  const [uomOptions, setUomOptions] = useState<LookupOption[]>(DEFAULT_UOM_OPTIONS);
  const [taskTypeOptions, setTaskTypeOptions] = useState<LookupOption[]>(DEFAULT_TASK_TYPE_OPTIONS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [taskName, setTaskName] = useState("");
  const [markerPath, setMarkerPath] = useState("0");
  const [uom, setUom] = useState("0");
  const [taskType, setTaskType] = useState("0");
  const [progress, setProgress] = useState(0);
  const [locationSelection, setLocationSelection] = useState(false);
  const [dcRows, setDcRows] = useState<TaskDynamicColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pagesize, setpagesize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
  setPage(1);
}, [search, pagesize]);


const filtered = tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

const totalPages = Math.max(1, Math.ceil(filtered.length / pagesize));
const safePage = Math.min(page, totalPages);
const pageRows = filtered.slice((safePage - 1) * pagesize, safePage * pagesize);

  const exportToExcel=()=>{
    const excelData= tasks.map((task)=> ({
      Name:task.name,
      Tasktype:task.taskType,
      "Progress Increment": task.progress,
      Action:""
    }));
    const worksheet= xlsx.utils.json_to_sheet(excelData);
    const workbook= xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook,worksheet,"sheet1");

    xlsx.writeFile(workbook,"tasks.xlsx");
  }

  const loadTasks = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiJson("/api/formbuilder/tasks");
      setTasks(asArray(data).map(normalizeTask));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();

    async function loadLookups() {
      const [uomData, taskTypeData] = await Promise.allSettled([
        apiJson("/api/formbuilder/lookups?type=uom"),
        apiJson("/api/formbuilder/lookups?type=task-type"),
      ]);

      if (uomData.status === "fulfilled") setUomOptions(toLookupOptions(uomData.value, DEFAULT_UOM_OPTIONS));
      if (taskTypeData.status === "fulfilled") setTaskTypeOptions(toLookupOptions(taskTypeData.value, DEFAULT_TASK_TYPE_OPTIONS));
    }

    loadLookups();
  }, []);

  const openForm = async (id?: number) => {
    setSaving(true);
    setError("");
    try {
      const data = await apiJson(`/api/formbuilder/tasks?id=${id ?? 0}`);
      const task = normalizeTask(data);
      setEditId(id ?? null);
      setTaskName(id ? task.name : "");
      setMarkerPath(id ? task.markerPath : "0");
      setUom(id ? task.uom : "0");
      setTaskType(id ? task.taskType : "0");
      setProgress(id ? task.progress : 0);
      setLocationSelection(id ? task.locationSelection : false);
      setDcRows(asArray(data?.DynamicColumns ?? data?.dynamicColumns).map(normalizeTaskDynamicColumn));
      setModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task form");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!taskName.trim()) {
      setError("Task Name required");
      return;
    }

    const enabledRows = dcRows.filter((r) => r.taskSelected && ![5, 8].includes(r.controlTypeId));
    const hasGlobal = enabledRows.some((r) => r.globalName);
    if (enabledRows.length > 0 && !hasGlobal) {
      setError("Please select one Global Name");
      return;
    }

    const payload = {
      Id: editId ?? 0,
      Name: taskName.trim(),
      MarkerPath: markerPath || "0",
      UOM: uom,
      TaskType: taskType,
      Progress: progress,
      LocationSelection: locationSelection,
      DynamicColumns: dcRows.map((row, index) => ({
        Position: index,
        Id: row.id,
        TaskAttributeId: row.taskAttributeId,
        TaskSelected: row.taskSelected,
        GlobalName: row.globalName,
        SectionTitle: row.sectionTitle,
        SectionNo: row.sectionNo,
        PageNo: row.pageNo,
      })),
    };

    setSaving(true);
    setError("");
    try {
      await apiJson("/api/formbuilder/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setModalOpen(false);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Delete this task?")) return;

    setSaving(true);
    setError("");
    try {
      await apiJson(`/api/formbuilder/tasks?id=${id}`, { method: "DELETE" });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  // const filtered = tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 16 }}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Task Management </span>
        </div>
      <TableToolbar
  onAdd={onCreateTask}
  addLabel="Task"
  search={search}
  onSearch={setSearch}
  onExcel={exportToExcel}
  pagesize={pagesize}
  onPageSizeChange={setpagesize}
/>
        <StatusLine loading={loading} saving={saving} error={error} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr>
                {["Name", "Task Type", "Progress Increment", "Update Location Required", "Action"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((task, i) => (
                <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={S.td}>{task.name}</td>
                  <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e8f7f4", color: TEAL }}>{lookupLabel(taskTypeOptions, task.taskType)}</span></td>
                  <td style={S.td}>{task.progress}%</td>
                  <td style={S.td}>{task.locationSelection ? <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>Yes</span> : <span style={{ color: "#94a3b8", fontSize: 11 }}>No</span>}</td>
                  <td style={S.td}>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button 
                        onClick={() => onEditTask(task.name, task.id)} 
                        style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}
                      >
                        ✏ Edit 
                      </button>
                      <button onClick={() => deleteTask(task.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
     <Pagination
  page={safePage}
  totalPages={totalPages}
  showing={pageRows.length}
  total={filtered.length}
  pageSize={pagesize}
  onPageChange={setPage}
/>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Task" : "Add Task"} wide>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={S.lbl}>Task Name</label>
            <input style={S.inp} value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task Name" />
          </div>
          <div>
            <label style={S.lbl}>Marker Path</label>
            <input style={S.inp} value={markerPath} onChange={(e) => setMarkerPath(e.target.value)} placeholder="e.g. pin_green" />
          </div>
          <div>
            <label style={S.lbl}>UOM</label>
            <select style={S.sel} value={uom} onChange={(e) => setUom(e.target.value)}>
              <option value="0">-- Select --</option>
              {uomOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Task Type</label>
            <select style={S.sel} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              <option value="0">-- Select --</option>
              {taskTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.lbl}>Progress Increment (%)</label>
            <input type="number" style={S.inp} value={progress} onChange={(e) => setProgress(Number(e.target.value))} min={0} max={100} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
            <input type="checkbox" checked={locationSelection} onChange={(e) => setLocationSelection(e.target.checked)} style={{ accentColor: TEAL, width: 15, height: 15 }} />
            User Need To Update Location
          </label>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #edf0f3", margin: "14px 0" }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Dynamic Columns</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Select", "Name", "Global Name", "Section Title", "Section No.", "Page No."].map((h) => (
                  <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dcRows.map((row, i) => {
                const showGlobal = ![5, 8].includes(row.controlTypeId);
                return (
                  <tr key={`${row.id}-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={S.td}>
                      <input type="checkbox" checked={row.taskSelected}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, taskSelected: e.target.checked, globalName: e.target.checked ? r.globalName : false } : r))}
                        style={{ accentColor: TEAL, width: 14, height: 14 }} />
                    </td>
                    <td style={S.td}>{row.name}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      {showGlobal && (
                        <input type="radio" name="api-globalTask" checked={row.globalName} disabled={!row.taskSelected}
                          onChange={() => setDcRows((prev) => prev.map((r) => ({ ...r, globalName: r.id === row.id })))}
                          style={{ accentColor: TEAL }} />
                      )}
                    </td>
                    <td style={S.td}>
                      <input type="text" value={row.sectionTitle}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionTitle: e.target.value } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 120 }} />
                    </td>
                    <td style={S.td}>
                      <input type="number" value={row.sectionNo}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionNo: Number(e.target.value) } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
                    </td>
                    <td style={S.td}>
                      <input type="number" value={row.pageNo}
                        onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, pageNo: Number(e.target.value) } : r))}
                        style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
                    </td>
                  </tr>
                );
              })}
              {dcRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No dynamic columns returned from backend</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
          <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
          <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save Task"}</button>
        </div>
      </Modal>
    </div>
  );
}

export default function TaskManagementPage() {
  const [activeSubPage, setActiveSubPage] = useState<SubPage>("task");
  const [builderSeed, setBuilderSeed] = useState<BuilderSeed | undefined>(undefined);
  const [availableColumns, setAvailableColumns] = useState<any[]>([]);

  useEffect(() => {
    async function loadcolumns(){
      try {
        const data = await apiJson("/api/formbuilder/dynamic-columns");
        setAvailableColumns(asArray(data));
      } catch(err){
        console.error("error loading dynamic columns:", err)
      }
    }
    loadcolumns();
  }, []);

  const handleCreateNewTask = () => {
    setBuilderSeed(undefined); 
    setActiveSubPage("form-builder"); 
  };

  const handleEditTask = (taskName: string, taskId: number) => {
    setBuilderSeed({ formName: taskName, taskId: taskId }); 
    setActiveSubPage("form-builder"); 
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontSize: 13, color: "#2d3748" }}>
      {/* Native Tab Headers */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 16px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", paddingRight: 16, marginRight: 12, borderRight: "1px solid #e2e6ea" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2740", letterSpacing: "0.04em" }}>TASK MANAGEMENT</span>
        </div>
        {SUBNAV.map(({ id, label }) => {
          const on = activeSubPage === id;
          return (
            <button
              key={id}
              onClick={() => setActiveSubPage(id)}
              style={{
                padding: "11px 14px", border: "none", background: "transparent", fontSize: 12,
                borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
                color: on ? TEAL : "#718096", fontWeight: on ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Main Container View Controller */}
      <div style={{ flex: 1, overflow: activeSubPage === "form-builder" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        
        {activeSubPage === "task" && (
          <ApiTaskPage 
            onEditTask={handleEditTask} 
            onCreateTask={handleCreateNewTask} 
          />
        )}

        {activeSubPage === "form-builder" && (
          <FormBuilder 
            seed={builderSeed} 
            availableColumns={availableColumns} 
            onOpenTasks={() => setActiveSubPage("task")} 
          />
        )}
      </div>
    </div>
  );
}





















































// "use client";

// import React, { useEffect, useState, useRef } from "react";



// // ─── Types ────────────────────────────────────────────────────────────────────
// type Tab = "build" | "vs" | "prev";
// type FieldType =
//   | "text" | "number" | "textarea" | "dropdown" | "radio" | "checkbox"
//   | "date" | "photo" | "location" | "section" | "signature" | "barcode";

// // type FieldType =
// //   | "text" | "number" | "textarea" | "dropdown" | "radio" | "checkbox"
// //   | "date" | "photo" | "location" | "section" | "signature" | "barcode"
// //   | "file" | "video" | "decimal"; // Added missing variants
// interface Field {
//   id: number;
//   t: FieldType;
//   l: string;
//   r: boolean;
//   pg: string;
//   ph?: string;
//   vs?: string;
//   selectedOptionIds?: number[];
//   embossed?: boolean;
//   multiPhoto?: boolean;
//   frontCam?: boolean;
//   showAcc?: boolean;
//   extGPS?: boolean;
//   mapCap?: boolean;
//   controlTypeId?: number;
// }

// interface Page { id: string; name: string; }
// interface ValueSet {
//   id: string;
//   n: string;
//   v: string[];
//   source?: "dropdown" | "radio" | "checkbox" | "custom";
//   locked?: boolean;
// }
// interface LookupOption { value: string|number; label: string; Text?: string; }
// type PublishedColumnMap = Record<number, number>;
// interface SimpleValueItem { id: number; name: string; }
// interface BuilderSeed {
//   formName?: string;
//   taskId?: number | null;
// }

// // Dynamic Columns types
// type RCM = 0 | 1 | 2;
// interface DynamicColumn {
//   id: number;
//   name: string;
//   controlTypeId: number;
//   controlTypeName: string;
//   carryForward: boolean;
//   mandatory: boolean;
//   loadingOCR: boolean;
//   loadingPrintText: boolean;
//   loadingFrom?: string;
//   loadingData?: string;
// }

// interface OptionValue {
//   id: number;
//   name: string;
//   isSelected: boolean;
//   position: number;
//   columnId: number;
//   dropDownConfigId: number;
// }

// // Task types
// interface Task {
//   id: number;
//   name: string;
//   markerPath: string;
//   uom: string;
//   taskType: string;
//   progress: number;
//   locationSelection: boolean;
// }

// interface TaskDynamicColumn {
//   id: number;
//   name: string;
//   controlTypeId: number;
//   taskAttributeId: number | null;
//   taskSelected: boolean;
//   globalName: boolean;
//   sectionTitle: string;
//   sectionNo: number;
//   pageNo: number;
// }

// // ─── Constants ────────────────────────────────────────────────────────────────
// const FIELD_TYPES: { t: FieldType; l: string; i: string }[] = [
//   { t: "text", l: "Text", i: "Aa" },
//   { t: "number", l: "Number", i: "12" },
//   { t: "textarea", l: "Textarea", i: "¶" },
//   { t: "dropdown", l: "Dropdown", i: "▾" },
//   { t: "radio", l: "Radio", i: "◉" },
//   { t: "checkbox", l: "Checkbox", i: "☑" },
//   { t: "date", l: "Date", i: "📅" },
//   { t: "photo", l: "Photo", i: "📷" },
//   { t: "location", l: "Location", i: "📍" },
//   { t: "section", l: "Section", i: "—" },
//   { t: "signature", l: "Signature", i: "✍" },
//   { t: "barcode", l: "Barcode", i: "▨" },
// ];

// const CONTROL_TYPES = [
//   { value: 1, label: "Text Box" },
//   { value: 2, label: "Dropdown" },
//   { value: 3, label: "Radio Button" },
//   { value: 5, label: "Date Picker" },
//   { value: 8, label: "File Upload" },
//   { value: 9, label: "Checkbox" },
// ];

// const TASK_TYPES = ["Survey", "Inspection", "Collection", "Monitoring"];
// const UOM_OPTIONS = ["Meter", "KM", "Unit", "Hectare", "Acre"];

// const TEAL = "#1db898";
// const FORM_BUILDER_DRAFT_KEY = "traxion-form-builder-draft-v1";

// const DEFAULT_LOADING_FROM: LookupOption[] = [
//   { value: "1", label: "Master Data" },
//   { value: "2", label: "Custom Values" },
// ];

// const DEFAULT_CONTROL_TYPE_OPTIONS: LookupOption[] = CONTROL_TYPES.map((c) => ({
//   value: String(c.value),
//   label: c.label,
// }));

// const DEFAULT_UOM_OPTIONS: LookupOption[] = UOM_OPTIONS.map((value) => ({
//   value,
//   label: value,
// }));

// const DEFAULT_TASK_TYPE_OPTIONS: LookupOption[] = TASK_TYPES.map((value) => ({
//   value,
//   label: value,
// }));

// const FIELD_CONTROL_TYPE: Partial<Record<FieldType, number>> = {
//   text: 1,
//   number: 1,
//   textarea: 1,
//   dropdown: 2,
//   radio: 3,
//   checkbox: 9,
//   date: 5,
//   photo: 8,
//   location: 1,
//   signature: 1,
//   barcode: 1,
// };

// const FIELD_TYPE_BY_CONTROL: Record<number, FieldType> = {
//   1: "text",
//   2: "dropdown",
//   3: "radio",
//   5: "date",
//   8: "photo",
//   9: "checkbox",
// };

// const VALUE_ENDPOINT_BY_FIELD: Partial<Record<FieldType, string>> = {
//   dropdown: "/api/dynamicvalues",
//   radio: "/api/radiobuttonvalues",
//   checkbox: "/api/checkboxvalues",
// };

// const VALUE_SOURCE_LABEL: Record<string, string> = {
//   dropdown: "Dropdown Values",
//   radio: "Radio Button Values",
//   checkbox: "Checkbox Values",
//   custom: "Custom",
// };




// let _id = 10;
// const nid = () => ++_id;

// const fieldIcon = (t: FieldType) =>
//   FIELD_TYPES.find((f) => f.t === t)?.i ?? "?";
// const fieldLabel = (t: FieldType) =>
//   FIELD_TYPES.find((f) => f.t === t)?.l ?? t;

// async function apiJson<T = any>(url: string, options: RequestInit = {}): Promise<T> {
//   const res = await fetch(url, {
//     ...options,
//     headers: {
//       ...(options.body ? { "Content-Type": "application/json" } : {}),
//       ...(options.headers || {}),
//     },
//   });
//   const text = await res.text();
//   const data = text ? safeJson(text) : null;

//   if (!res.ok) {
//     const message =
//       typeof data === "string"
//         ? data
//         : data?.error || data?.message || `Request failed (${res.status})`;
//     throw new Error(message);
//   }

//   return data as T;
// }

// function safeJson(text: string) {
//   try {
//     return JSON.parse(text);
//   } catch {
//     return text;
//   }
// }

// function asArray(data: any) {
//   if (Array.isArray(data)) return data;
//   if (Array.isArray(data?.data)) return data.data;
//   if (Array.isArray(data?.Data)) return data.Data;
//   if (Array.isArray(data?.response)) return data.response;
//   if (Array.isArray(data?.result)) return data.result;
//   return [];
// }

// function toLookupOptions(data: any, fallback: LookupOption[] = []) {
//   const rows = asArray(data);
//   if (!rows.length) return fallback;

//   return rows.map((item: any) => {
//     const value = String(
//       item.Value ?? item.value ?? item.Id ?? item.id ?? item.Code ?? item.code ?? "",
//     );
//     const label = String(
//       item.Text ?? item.text ?? item.Name ?? item.name ?? item.Label ?? item.label ?? value,
//     );

//     return { value, label };
//   });
// }

// function lookupLabel(options: LookupOption[], value: string | number) {
//   const key = String(value);
//   return options.find((opt) => opt.value === key)?.label || key;
// }

// function normalizeDynamicColumn(item: any): DynamicColumn {
//   const controlTypeId = Number(item.ControlTypeId ?? item.controlTypeId ?? 0);

//   return {
//     id: Number(item.Id ?? item.id ?? 0),
//     name: String(item.Name ?? item.name ?? ""),
//     controlTypeId,
//     controlTypeName:
//       String(item.ControlTypeName ?? item.controlTypeName ?? "") ||
//       CONTROL_TYPES.find((c) => c.value === controlTypeId)?.label ||
//       "",
//     carryForward: Boolean(item.CarryForward ?? item.carryForward),
//     mandatory: Boolean(item.Mandatory ?? item.mandatory),
//     loadingOCR: Boolean(item.LoadingOCR ?? item.loadingOCR),
//     loadingPrintText: Boolean(item.LoadingPrintText ?? item.loadingPrintText),
//     loadingFrom: String(item.LoadingFrom ?? item.loadingFrom ?? "0"),
//     loadingData: String(item.LoadingData ?? item.loadingData ?? "0"),
//   };
// }

// function normalizeOptionValue(item: any): OptionValue {
//   return {
//     id: Number(item.Id ?? item.id ?? 0),
//     name: String(item.Name ?? item.name ?? ""),
//     isSelected: Boolean(item.IsSelected ?? item.isSelected),
//     position: Number(item.Position ?? item.position ?? 0),
//     columnId: Number(item.ColumnId ?? item.columnId ?? 0),
//     dropDownConfigId: Number(item.DropDownConfigId ?? item.dropDownConfigId ?? 0),
//   };
// }

// function normalizeSourceOptionValue(item: any, index: number): OptionValue {
//   const option = normalizeOptionValue(item);
//   const fallbackId = Number(item.Value ?? item.value ?? item.OptionId ?? item.optionId ?? index + 1);

//   return {
//     ...option,
//     id: option.id || fallbackId,
//     name: option.name || String(item.Text ?? item.text ?? item.Label ?? item.label ?? item.Value ?? item.value ?? ""),
//     position: option.position || index + 1,
//   };
// }

// function columnId(column: any) {
//   return String(column.Id ?? column.id ?? "");
// }

// function columnName(column: any) {
//   return String(column.Name ?? column.name ?? "");
// }

// function optionTypeForControl(controlTypeId?: number | string) {
//   const id = Number(controlTypeId);
//   if (id === 2) return "dropdown";
//   if (id === 3) return "radio";
//   if (id === 9) return "checkbox";
//   return "";
// }

// function fieldTypeForControl(controlTypeId?: number | string, fallback: FieldType = "text") {
//   return FIELD_TYPE_BY_CONTROL[Number(controlTypeId)] ?? fallback;
// }

// function fieldControlTypeId(field: Field) {
//   return Number(field.controlTypeId ?? FIELD_CONTROL_TYPE[field.t] ?? 1);
// }

// function isOptionField(field: Field) {
//   return Boolean(optionTypeForControl(fieldControlTypeId(field)));
// }

// function normalizeTask(item: any): Task {
//   return {
//     id: Number(item.id ?? item.Id ?? 0),
//     name: String(item.Name ?? item.name ?? ""),
//     markerPath: String(item.MarkerPath ?? item.markerPath ?? "0"),
//     uom: String(item.UOM ?? item.uom ?? "0"),
//     taskType: String(item.TaskType ?? item.taskType ?? "0"),
//     progress: Number(item.Progress ?? item.progress ?? 0),
//     locationSelection: Boolean(item.LocationSelection ?? item.locationSelection),
//   };
// }

// function normalizeTaskDynamicColumn(item: any): TaskDynamicColumn {
//   return {
//     id: Number(item.Id ?? item.id ?? 0),
//     name: String(item.Name ?? item.name ?? ""),
//     controlTypeId: Number(item.ControlTypeId ?? item.controlTypeId ?? 0),
//     taskAttributeId:
//       item.TaskAttributeId ?? item.taskAttributeId
//         ? Number(item.TaskAttributeId ?? item.taskAttributeId)
//         : null,
//     taskSelected: Boolean(item.TaskSelected ?? item.taskSelected),
//     globalName: Boolean(item.GlobalName ?? item.globalName),
//     sectionTitle: String(item.SectionTitle ?? item.sectionTitle ?? ""),
//     sectionNo: Number(item.SectionNo ?? item.sectionNo ?? 0),
//     pageNo: Number(item.PageNo ?? item.pageNo ?? 0),
//   };
// }

// function StatusLine({ loading, saving, error }: { loading?: boolean; saving?: boolean; error?: string }) {
//   if (!loading && !saving && !error) return null;

//   return (
//     <div style={{ padding: "8px 14px", borderBottom: "1px solid #edf0f3", fontSize: 11, color: error ? "#dc2626" : "#718096", background: error ? "#fff7f7" : "#fafbfc" }}>
//       {error || (saving ? "Saving..." : "Loading data...")}
//     </div>
//   );
// }

// // ─── Sub-Nav Items ────────────────────────────────────────────────────────────
// type SubPage = "dynamic-columns" | "task" | "form-builder" | "dropdown-values" | "radio-values" | "checkbox-values";

// const SUBNAV: { id: SubPage; label: string }[] = [
//   // { id: "dynamic-columns", label: "Dynamic Columns" },
//   { id: "task", label: "Task" },
//   { id: "form-builder", label: "Form Builder" },
//   // { id: "dropdown-values", label: "Dropdown Values" },
//   // { id: "radio-values", label: "Radio Button Values" },
//   // { id: "checkbox-values", label: "Checkbox Values" },
// ];

// // ─── Shared Styles ────────────────────────────────────────────────────────────
// const S = {
//   card: {
//     background: "#fff",
//     border: "1px solid #e2e6ea",
//     borderRadius: 6,
//     overflow: "hidden",
//     marginBottom: 16,
//   } as React.CSSProperties,
//   cardHeader: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: "10px 16px",
//     borderBottom: "1px solid #edf0f3",
//     background: "#fafbfc",
//   } as React.CSSProperties,
//   cardTitle: {
//     fontSize: 12,
//     fontWeight: 700,
//     color: "#374151",
//     textTransform: "uppercase" as const,
//     letterSpacing: "0.06em",
//   },
//   tealBtn: {
//     background: TEAL,
//     color: "#fff",
//     border: "none",
//     borderRadius: 4,
//     padding: "6px 14px",
//     fontSize: 12,
//     fontWeight: 600,
//     cursor: "pointer",
//   } as React.CSSProperties,
//   secBtn: {
//     background: "#fff",
//     color: "#4a5568",
//     border: "1px solid #d1d5db",
//     borderRadius: 4,
//     padding: "5px 12px",
//     fontSize: 12,
//     cursor: "pointer",
//   } as React.CSSProperties,
//   dangerBtn: {
//     background: "#fff",
//     color: "#e53e3e",
//     border: "1px solid #fecaca",
//     borderRadius: 4,
//     padding: "5px 12px",
//     fontSize: 12,
//     cursor: "pointer",
//   } as React.CSSProperties,
//   inp: {
//     width: "100%",
//     padding: "7px 10px",
//     border: "1px solid #d1d5db",
//     borderRadius: 4,
//     fontSize: 13,
//     color: "#374151",
//     background: "#fff",
//     outline: "none",
//     boxSizing: "border-box" as const,
//   },
//   sel: {
//     width: "100%",
//     padding: "7px 10px",
//     border: "1px solid #d1d5db",
//     borderRadius: 4,
//     fontSize: 13,
//     color: "#374151",
//     background: "#fff",
//     boxSizing: "border-box" as const,
//   },
//   lbl: {
//     fontSize: 11,
//     fontWeight: 500,
//     color: "#374151",
//     display: "block",
//     marginBottom: 4,
//   },
//   th: {
//     padding: "8px 12px",
//     textAlign: "left" as const,
//     fontSize: 10,
//     fontWeight: 700,
//     color: "#718096",
//     borderBottom: "2px solid #e2e6ea",
//     background: "#fafbfc",
//     whiteSpace: "nowrap" as const,
//     textTransform: "uppercase" as const,
//     letterSpacing: "0.05em",
//   },
//   td: {
//     padding: "8px 12px",
//     fontSize: 12,
//     color: "#374151",
//     borderBottom: "1px solid #f5f7f9",
//     verticalAlign: "middle" as const,
//   },
// };

// // ─── Modal wrapper ────────────────────────────────────────────────────────────
// function Modal({
//   open, onClose, title, children, wide = false,
// }: {
//   open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
// }) {
//   if (!open) return null;
//   return (
//     <div
//       style={{
//         position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
//         zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
//       }}
//       onClick={onClose}
//     >
//       <div
//         style={{
//           background: "#fff", borderRadius: 8, width: wide ? "80vw" : 520,
//           maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column",
//           boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
//         }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e6ea" }}>
//           <h5 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#1a2740" }}>{title}</h5>
//           <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>×</button>
//         </div>
//         <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>{children}</div>
//       </div>
//     </div>
//   );
// }

// // ─── Table toolbar ────────────────────────────────────────────────────────────
// function TableToolbar({ onAdd, addLabel, search, onSearch }: {
//   onAdd: () => void; addLabel: string; search: string; onSearch: (v: string) => void;
// }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid #edf0f3", flexWrap: "wrap" }}>
//       {["Copy", "CSV", "Excel", "PDF", "Print"].map((l) => (
//         <button key={l} style={{
//           color: "#fff", border: "none", borderRadius: 3, padding: "4px 9px", fontSize: 11, cursor: "pointer",
//           background: l === "Excel" ? "#059669" : l === "PDF" ? "#dc2626" : "#6b7280",
//         }}>{l}</button>
//       ))}
//       <select style={{ padding: "4px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff" }}>
//         <option>Show 10 rows</option>
//         <option>Show 25 rows</option>
//         <option>Show 50 rows</option>
//       </select>
//       <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#718096" }}>
//         Search:
//         <input
//           value={search} onChange={(e) => onSearch(e.target.value)}
//           style={{ padding: "4px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, width: 160, outline: "none" }}
//         />
//       </div>
//       <button onClick={onAdd}  id="+ Task" style={{ ...S.tealBtn, padding: "5px 13px", marginLeft: 8 }}>+ {addLabel} </button>
//     </div>
//   );
// }

// // ─── Pagination ───────────────────────────────────────────────────────────────
// function Pagination({ total, showing }: { total: number; showing: number }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #edf0f3" }}>
//       <span style={{ fontSize: 11, color: "#718096" }}>Showing 1 to {showing} of {total} entries</span>
//       <div style={{ display: "flex", gap: 3 }}>
//         {["Previous", "1", "2", "Next"].map((l, i) => (
//           <button key={l} style={{
//             padding: "4px 9px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11,
//             background: l === "1" ? TEAL : "#fff", color: l === "1" ? "#fff" : "#374151", cursor: "pointer",
//           }}>{l} </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Toggle switch ────────────────────────────────────────────────────────────
// function Toggle({ on, onToggle, label, sub }: { on: boolean; onToggle: () => void; label: string; sub?: string }) {
//   return (
//     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#f9fafb", borderRadius: 4, marginBottom: 5 }}>
//       <div>
//         <div style={{ fontSize: 11, color: "#4a5568" }}>{label}</div>
//         {sub && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 1 }}>{sub}</div>}
//       </div>
//       <button
//         onClick={onToggle}
//         style={{ width: 34, height: 18, borderRadius: 9, background: on ? TEAL : "#d1d5db", border: "none", position: "relative", cursor: "pointer", flexShrink: 0 }}
//       >
//         <div style={{ position: "absolute", top: 2, left: on ? 17 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .15s" }} />
//       </button>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ─── FORM BUILDER ─────────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// function FormBuilder({
//   seed,
//   onOpenTasks,
//   availableColumns
// }: {
//   seed?: BuilderSeed;
//   onOpenTasks?: () => void;
//   availableColumns: any[];
// }) {
//   const [tab, setTab] = useState<Tab>("build");
//   const [formName, setFormName] = useState("Survey Form");
//   const [markerPath, setMarkerPath] = useState("0");
//   const [uom, setUom] = useState("0");
//   const [taskType, setTaskType] = useState("0");
//   const [progress, setProgress] = useState(0);
//   const [locationSelection, setLocationSelection] = useState(false);
//   const [uomOptions, setUomOptions] = useState<LookupOption[]>(DEFAULT_UOM_OPTIONS);
//   const [taskTypeOptions, setTaskTypeOptions] = useState<LookupOption[]>(DEFAULT_TASK_TYPE_OPTIONS);
//   const [pages, setPages] = useState<Page[]>([{ id: "p1", name: "Page 1" }]);
//   const [activePg, setActivePg] = useState("p1");
//   // console.log("Active page:", activePg);
//   const [editPgId, setEditPgId] = useState<string | null>(null);
//   const [fields, setFields] = useState<Field[]>([]);
//   // console.log("Initial fields state:", fields);
//   const [selId, setSelId] = useState<number | null>(null);
//   // console.log("Selected field ID:", selId);
//   const [valueSets, setValueSets] = useState<ValueSet[]>([]);
//   const [selVS, setSelVS] = useState<string | null>(null);
//   const [newVsName, setNewVsName] = useState("");
//   const [newVsVal, setNewVsVal] = useState("");
//   const [editVsIdx, setEditVsIdx] = useState<number | null>(null);
//   const [editVsVal, setEditVsVal] = useState("");
//   const [prevPg, setPrevPg] = useState("p1");
//   const [draftStatus, setDraftStatus] = useState("");
//   const [publishStatus, setPublishStatus] = useState("");
//   const [publishing, setPublishing] = useState(false);
//   const [publishedColumnIds, setPublishedColumnIds] = useState<PublishedColumnMap>({});
//   const [publishedTaskId, setPublishedTaskId] = useState<number | null>(null);
//   const [backendValuesLoaded, setBackendValuesLoaded] = useState(false);
//   const [controlTypeOptions, setControlTypeOptions] =useState<LookupOption[]>([]);
//   const [optionValuesBySource, setOptionValuesBySource] = useState<Record<string, OptionValue[]>>({});
//   const [optionLoadingBySource, setOptionLoadingBySource] = useState<Record<string, boolean>>({});
//   const pgRenameRef = useRef<HTMLInputElement>(null);

//   const pgFields = (pgId: string) => fields.filter((f) => f.pg === pgId);
//   const selField = fields.find((f) => f.id === selId) ?? null;
//   //console.log("Selected field:", selField);

//   const pgName = (id: string) => pages.find((p) => p.id === id)?.name ?? "";
//   const pgIdx = (id: string) => pages.findIndex((p) => p.id === id);
//   const fieldCount = fields.filter((f) => f.t !== "section").length;
//   const compatibleValueSets = (type: FieldType) =>
//     valueSets.filter((set) => !set.source || set.source === "custom" || set.source === type);

//   // const optionSourceKey = (field: Field) => {
//   //   const type = optionTypeForControl(fieldControlTypeId(field));
//   //   const vs = field.vs != null ? String(field.vs) : "";
//   //   return type && vs ? `${type}:${vs}` : "";
//   // };

//   const optionSourceKey = (field: Field) => {
//   const type = optionTypeForControl(fieldControlTypeId(field));
//   // 🟢 FIX: Prioritize using field.id if it is a real column from the database
//   if (type && field.id > 0) {
//     return `${type}:${field.id}`;
//   }
//   const vs = field.vs != null ? String(field.vs) : "";
//   return type && vs ? `${type}:${vs}` : "";
// };
//   const getFieldValueSet = (field: Field) => {
//     const vs = field.vs != null ? String(field.vs) : "";
//     return valueSets.find((set) => set.id === vs);
//   };

//   const generateValueSetOptions = (set: ValueSet) =>
//     set.v.map((value, index) => ({
//       id: index + 1,
//       name: String(value),
//       isSelected: false,
//       position: index + 1,
//       columnId: 0,
//       dropDownConfigId: 0,
//     }));

//   const loadSourceOptions = async (field: Field) => {
//     const key = optionSourceKey(field);
//     if (!key) return [];
//     if (optionValuesBySource[key]) return optionValuesBySource[key];

//     const valueSet = getFieldValueSet(field);
//     if (valueSet) {
//       const values = generateValueSetOptions(valueSet);
//       setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
//       return values;
//     }

//     const [type, sourceId] = key.split(":");
//     setOptionLoadingBySource((prev) => ({ ...prev, [key]: true }));
//     try {
//       const data = await apiJson(`/api/formbuilder/dynamic-column-options?type=${type}&id=${sourceId}`);
//       const values = asArray(data).map(normalizeSourceOptionValue);
//       setOptionValuesBySource((prev) => ({ ...prev, [key]: values }));
//       return values;
//     } finally {
//       setOptionLoadingBySource((prev) => ({ ...prev, [key]: false }));
//     }
//   };

//   const getCachedOptions = (field: Field) => {
//   // 1. Check for real database options first
//   const key = optionSourceKey(field);
//   if (key && optionValuesBySource[key] && optionValuesBySource[key].length > 0) {
//     return optionValuesBySource[key];
//   }

//   // 2. Fall back to global mock generation only if no loaded records exist
//   const valueSet = getFieldValueSet(field);
//   if (valueSet) return generateValueSetOptions(valueSet);

//   return [];
// };

// //   const getCachedOptions = (field: Field) => {
// //   // 1. Look for options fetched from the database first
// //   const key = optionSourceKey(field);
// //   if (key && optionValuesBySource[key] && optionValuesBySource[key].length > 0) {
// //     return optionValuesBySource[key];
// //   }

// //   // 2. Fall back to generating options from the value set if no data exists yet
// //   const valueSet = getFieldValueSet(field);
// //   if (valueSet) return generateValueSetOptions(valueSet);

// //   return [];
// // };

//   // const getCachedOptions = (field: Field) => {
//   //   const valueSet = getFieldValueSet(field);
//   //   if (valueSet) return generateValueSetOptions(valueSet);

//   //   const key = optionSourceKey(field);
//   //   return key ? optionValuesBySource[key] ?? [] : [];
//   // };
//   const selectedOptionsForField = (field: Field, options = getCachedOptions(field)) => {
//     const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
//     return options.filter((option) => selectedIds.has(option.id));
//   };
//   useEffect(() => {
//     if (!seed) return;

//     if (!seed.taskId) {
//       // Clean canvas for a brand new task
//       setFormName(seed.formName || "Survey Form");
//       setMarkerPath("0");
//       setUom("0");
//       setTaskType("0");
//       setProgress(0);
//       setLocationSelection(false);
//       setPages([{ id: "p1", name: "Page 1" }]);
//       setActivePg("p1");
//       setFields([]);
//       setPublishedColumnIds({});
//       setPublishedTaskId(null);
//       setDraftStatus("New task builder ready");
//       return;
//     }

//     // Load an existing task structure for editing
//     async function loadTaskIntoBuilder() {

//       try {
//         setDraftStatus("Loading task fields...");
//         const data = await apiJson(`/api/formbuilder/tasks?id=${seed?.taskId}`);
        
//         if (data.Name) setFormName(data.Name);
//         if (data.MarkerPath) setMarkerPath(data.MarkerPath);
//         if (data.UOM) setUom(data.UOM);
//         if (data.TaskType) setTaskType(data.TaskType);
//         if (data.Progress !== undefined) setProgress(Number(data.Progress) || 0);
//         if (data.LocationSelection !== undefined) setLocationSelection(Boolean(data.LocationSelection));
//         setPublishedTaskId(Number(seed?.taskId));

//         const backendRows = asArray(data.DynamicColumns ?? data.dynamicColumns).map(normalizeTaskDynamicColumn);
        
//         // 1. Rebuild pages dynamically based on task data
//         const maxPageNo = Math.max(1, ...backendRows.map(r => r.pageNo));
//         const rebuiltPages: Page[] = [];
//         for (let p = 1; p <= maxPageNo; p++) {
//           rebuiltPages.push({ id: `p${p}`, name: `Page ${p}` });
//         }
//         setPages(rebuiltPages);
//         setActivePg("p1");

//         // 2. Rebuild fields array & original backend column associations
//         const rebuiltFields: Field[] = [];


//         const colIdsMap: PublishedColumnMap = {};

//         for (let p = 1; p <= maxPageNo; p++) {
//           const pageRows = backendRows.filter(r => r.pageNo === p);
//           let activeSectionTitle = "";

//           for (const row of pageRows) {
//             // Inject section headers if row has section title attributes defined
//             if (row.sectionTitle && row.sectionTitle !== activeSectionTitle) {
//               activeSectionTitle = row.sectionTitle;
//               rebuiltFields.push({
//                 id: Math.floor(Math.random() * -10000), // temp section unique ID
//                 t: "section",
//                 l: activeSectionTitle,
//                 r: false,
//                 pg: `p${p}`
//               });
//             }
//             const fType = fieldTypeForControl(row.controlTypeId);
// const assignedVs = 
//   row.controlTypeId === 2 ? `col_${row.id}` : 
//   row.controlTypeId === 3 ? `col_${row.id}` : 
//   row.controlTypeId === 9 ? `col_${row.id}` : "";

// colIdsMap[row.id] = row.id;

// rebuiltFields.push({
//   id: row.id,
//   t: fType,
//   controlTypeId: row.controlTypeId,
//   l: row.name,
//   r: false,
//   pg: `p${p}`,
//   vs: assignedVs
// });

//             // const fType = fieldTypeForControl(row.controlTypeId);
//             // const assignedVs = 
//             //   row.controlTypeId === 2 ? "backend_dropdown_values" : 
//             //   row.controlTypeId === 3 ? "backend_radio_values" : 
//             //   row.controlTypeId === 9 ? "backend_checkbox_values" : "";

//             // colIdsMap[row.id] = row.id;

//             // rebuiltFields.push({
//             //   id: row.id, // sync directly with database column ID
//             //   t: fType,
//             //   controlTypeId: row.controlTypeId,
//             //   l: row.name,
//             //   r: false,
//             //   pg: `p${p}`,
//             //   vs: assignedVs
//             // });
//           }
//         }

// // for (const field of rebuiltFields) {
// //   if (!isOptionField(field)) continue;
// //   const colData = await apiJson(`/api/formbuilder/dynamic-columns?id=${field.id}`);
// //   const optKey = optionTypeForControl(field.controlTypeId); // "dropdown" | "radio" | "checkbox"
// //   const rawOptions =
// //     optKey === "dropdown" ? colData.DropDownValues :
// //     optKey === "radio" ? colData.RadioButtonValues :
// //     optKey === "checkbox" ? colData.CheckBoxValues : [];
// //   const selectedIds = (rawOptions ?? [])
// //     .filter((o:any) => o.IsSelected)
// //     .map((o:any) => Number(o.Id));
// //   field.selectedOptionIds = selectedIds;
// // }


// // for (const field of rebuiltFields) {
// //   if (!isOptionField(field)) continue;
// //   try {
// //     const colData = await apiJson(`/api/formbuilder/dynamic-columns?id=${field.id}`);
// //     console.log("RAW colData for", field.id, colData);
// //     const optKey = optionTypeForControl(field.controlTypeId);
// //     const rawOptions =
// //       optKey === "dropdown" ? colData.DropDownValues :
// //       optKey === "radio" ? colData.RadioButtonValues :
// //       optKey === "checkbox" ? colData.CheckBoxValues : [];

// //     const normalized = (rawOptions ?? []).map((o, idx) => normalizeSourceOptionValue(o, idx));
// //     const selectedIds = normalized.filter((o) => o.isSelected).map((o) => Number(o.id));
// //     field.selectedOptionIds = selectedIds;

// //     const sourceKey = optionSourceKey(field); // SAME function the read-side uses — guaranteed match
// //     setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));
// //     console.log("EDIT-LOAD", field.id, "key=", sourceKey, "selected=", selectedIds, "normalized count=", normalized.length);
// //   } catch (err) {
// //     console.warn("Failed to load saved options for field", field.id, err);
// //   }
// // }
// for (const field of rebuiltFields) {
//   if (!isOptionField(field)) continue;
//   try {
//     const optKey = optionTypeForControl(field.controlTypeId); // "dropdown" | "radio" | "checkbox"
//     if (!optKey) continue;

//     // Hit the dedicated options endpoint instead of relying on the column-detail response
//     const optionsData = await apiJson(
//       `/api/formbuilder/dynamic-column-options?type=${optKey}&id=${field.id}`
//     );

//     const normalized = asArray(optionsData).map((o, idx) => normalizeSourceOptionValue(o, idx));
//     const selectedIds = normalized.filter((o) => o.isSelected).map((o) => Number(o.id));
//     field.selectedOptionIds = selectedIds;

//     const sourceKey = optionSourceKey(field);
//     setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));

//     console.log("EDIT-LOAD", field.id, "key=", sourceKey, "selected=", selectedIds, "count=", normalized.length);
//   } catch (err) {
//     console.warn("Failed to load saved options for field", field.id, err);
//   }
// }


// // for (const field of rebuiltFields) {
// //   if (!isOptionField(field)) continue;
// //   try {
// //     const colData = await apiJson(`/api/formbuilder/dynamic-columns?id=${field.id}`);
// //     const optKey = optionTypeForControl(field.controlTypeId);
// //     const rawOptions =
// //       optKey === "dropdown" ? colData.DropDownValues :
// //       optKey === "radio" ? colData.RadioButtonValues :
// //       optKey === "checkbox" ? colData.CheckBoxValues : [];

// //     const normalized = (rawOptions ?? []).map((o, idx) => normalizeSourceOptionValue(o, idx));
// //     const selectedIds = normalized.filter((o) => o.isSelected).map((o) => Number(o.id));
// //     field.selectedOptionIds = selectedIds;

// //     const sourceKey = `${optKey}:${field.vs}`;  // now unique per field since field.vs = col_<id>
// //     setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));
// //   } catch (err) {
// //     console.warn("Failed to load saved options for field", field.id, err);
// //   }
// // }
// // for (const field of rebuiltFields) {
// //   if (!isOptionField(field)) continue;
// //   try {
// //     const colData = await apiJson(`/api/formbuilder/dynamic-columns?id=${field.id}`);
// //     const optKey = optionTypeForControl(field.controlTypeId);
// //     const rawOptions =
// //       optKey === "dropdown" ? colData.DropDownValues :
// //       optKey === "radio" ? colData.RadioButtonValues :
// //       optKey === "checkbox" ? colData.CheckBoxValues : [];

// //     const normalized = (rawOptions ?? []).map((o, idx) => normalizeSourceOptionValue(o, idx));
// //     const selectedIds = normalized.filter((o) => o.isSelected).map((o) => Number(o.id));
// //     field.selectedOptionIds = selectedIds;
// //           const sourceKey = optionSourceKey(field); 
// //     // const sourceKey = `${optKey}:${field.vs}`;  
// //     // // now unique per field since field.vs = col_<id>
// //     setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));
// //   } catch (err) {
// //     console.warn("Failed to load saved options for field", field.id, err);
// //   }
// // }

// // for (const field of rebuiltFields) {
// //   if (!isOptionField(field)) continue;
// //   try {
// //     const colData = await apiJson(`/api/formbuilder/dynamic-columns?id=${field.id}`);
// //     const optKey = optionTypeForControl(field.controlTypeId); // "dropdown" | "radio" | "checkbox"
// //     const rawOptions =
// //       optKey === "dropdown" ? colData.DropDownValues :
// //       optKey === "radio" ? colData.RadioButtonValues :
// //       optKey === "checkbox" ? colData.CheckBoxValues : [];

// //     const normalized = (rawOptions ?? []).map((o: any, idx: number) =>
// //       normalizeSourceOptionValue(o, idx)
// //     );

// //     const selectedIds = normalized
// //       .filter((o) => o.isSelected)
// //       .map((o) => Number(o.id));

// //     field.selectedOptionIds = selectedIds;

// //     // 🟢 Critical: seed optionValuesBySource so the panel renders THIS exact list,
// //     // with ids that match what we just put into selectedOptionIds
// //     // 🟢 FIX: Change the cache key name to use field.id so it is unique to this column
// // const sourceKey = `${optKey}:${field.id}`;
// // setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));
// //     // const sourceKey = `${optKey}:${field.vs}`;
// //     // setOptionValuesBySource((prev) => ({ ...prev, [sourceKey]: normalized }));
// //   } catch (err) {
// //     console.warn("Failed to load saved options for field", field.id, err);
// //   }
// // }

//         setFields(rebuiltFields);
//         setPublishedColumnIds(colIdsMap);
//         setDraftStatus("Task loaded completely");
//       } catch (err) {
//         console.error("Failed to parse edit seed task layout", err);
//         setPublishStatus("Error loading task fields.");
//       }
//     }

//     loadTaskIntoBuilder();
//   }, [seed]);

  
// useEffect(() => {
//   console.log("fields =", fields);
// }, [fields]);

// useEffect(() => {
//   if (selField?.vs == null || selField.vs === "" || !optionSourceKey(selField)) return;
//   loadSourceOptions(selField).catch((err) => {
//     setPublishStatus(err instanceof Error ? err.message : "Failed to load option values");
//   });
// }, [selField?.id, selField?.vs, selField?.controlTypeId]);

// useEffect(() => {
//   if (!backendValuesLoaded || !valueSets.length) return;

//   setFields((prev) => {
//     let updated = false;
//     const next = prev.map((field) => {
//       if (!isOptionField(field) || field.vs != null && field.vs !== "") return field;
//       const fieldType = fieldTypeForControl(field.controlTypeId);
//       const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;
//       if (!defaultValueSet) return field;
//       updated = true;
//       return { ...field, vs: defaultValueSet };
//     });
//     return updated ? next : prev;
//   });
// }, [backendValuesLoaded, valueSets]);

// // useEffect(() => {
// //   console.log("controlTypeOptions =", controlTypeOptions);
// // }, [controlTypeOptions]);


//   useEffect(() => {
//   loadControlTypes();
// }, []);

// const loadControlTypes = async () => {
//   try {
//    const data = await apiJson("/api/formbuilder/lookups?type=control-types");
//    console.log("Fetched control types:", data);

//     setControlTypeOptions(
//       data.map((x: any) => ({
//          value: x.Value,
//          label: x.Text,
//         Text: x.Text,
//       })) 
//     );
//   } catch (err) {
//     console.error(err);
//   }
// };


//   // useEffect(() => {
//   //   const raw = window.localStorage.getItem(FORM_BUILDER_DRAFT_KEY);
//   //   if (!raw) return;

//   //   try {
//   //     const draft = JSON.parse(raw);
//   //     if (draft.formName) setFormName(draft.formName);
//   //     if (draft.markerPath) setMarkerPath(draft.markerPath);
//   //     if (draft.uom) setUom(draft.uom);
//   //     if (draft.taskType) setTaskType(draft.taskType);
//   //     if (draft.progress !== undefined) setProgress(Number(draft.progress) || 0);
//   //     if (draft.locationSelection !== undefined) setLocationSelection(Boolean(draft.locationSelection));
//   //     if (Array.isArray(draft.pages) && draft.pages.length) {
//   //       setPages(draft.pages);
//   //       setActivePg(draft.pages[0].id);
//   //       setPrevPg(draft.pages[0].id);
//   //     }
//   //     if (Array.isArray(draft.fields)) setFields(draft.fields);
//   //     if (Array.isArray(draft.valueSets) && draft.valueSets.length) {
//   //       setValueSets(draft.valueSets);
//   //       setSelVS(draft.valueSets[0].id);
//   //     }
//   //     if (draft.publishedColumnIds && typeof draft.publishedColumnIds === "object") {
//   //       setPublishedColumnIds(draft.publishedColumnIds);
//   //     }
//   //     if (draft.publishedTaskId) setPublishedTaskId(Number(draft.publishedTaskId));

//   //     const maxFieldId = Math.max(10, ...asArray(draft.fields).map((f: Field) => Number(f.id) || 0));
//   //     _id = Math.max(_id, maxFieldId);
//   //     setDraftStatus("Draft loaded");
//   //   } catch {
//   //     setDraftStatus("Saved draft could not be loaded");
//   //   }
//   // }, []);

//   useEffect(() => {
//     if (!seed) return;

//     if (seed.formName) setFormName(seed.formName);
//     if (seed.taskId !== undefined) setPublishedTaskId(seed.taskId);
//     setTab("build");
//     setDraftStatus(seed.taskId ? "Loaded task builder" : "New task builder");
//   }, [seed]);

//   const saveDraft = () => {
//     window.localStorage.setItem(
//       FORM_BUILDER_DRAFT_KEY,
//       JSON.stringify({ formName, markerPath, uom, taskType, progress, locationSelection, pages, fields, valueSets, publishedColumnIds, publishedTaskId }),
//     );
//     setDraftStatus("Draft saved");
//   };

//   const persistDraft = (columnIds = publishedColumnIds, taskId = publishedTaskId) => {
//     window.localStorage.setItem(
//       FORM_BUILDER_DRAFT_KEY,
//       JSON.stringify({ formName, markerPath, uom, taskType, progress, locationSelection, pages, fields, valueSets, publishedColumnIds: columnIds, publishedTaskId: taskId }),
//     );
//   };

//   const getApiId = (data: any) =>
//     Number(data?.Id ?? data?.id ?? data?.Data?.Id ?? data?.data?.Id ?? data?.result?.Id ?? data?.Result?.Id ?? 0);

//   const loadSimpleValues = async (endpoint: string): Promise<SimpleValueItem[]> => {
//     const data = await apiJson(endpoint);
//     return asArray(data).map((item: any) => ({
//       id: Number(item.Id ?? item.id ?? 0),
//       name: String(item.Name ?? item.name ?? ""),
//     }));
//   };

//   useEffect(() => {
//     let cancelled = false;

//     async function loadBuilderDefaults() {
//       try {
//         const [dropdownValues, radioValues, checkboxValues, uomData, taskTypeData] = await Promise.allSettled([
//           loadSimpleValues("/api/dynamicvalues"),
//           loadSimpleValues("/api/radiobuttonvalues"),
//           loadSimpleValues("/api/checkboxvalues"),
//           apiJson("/api/formbuilder/lookups?type=uom"),
//           apiJson("/api/formbuilder/lookups?type=task-type"),
//         ]);

//         if (cancelled) return;

//         const backendSets: ValueSet[] = [
//           {
//             id: "backend_dropdown_values",
//             n: "Dropdown Values",
//             source: "dropdown",
//             locked: true,
//             v: dropdownValues.status === "fulfilled" ? dropdownValues.value.map((item) => item.name).filter(Boolean) : [],
//           },
//           {
//             id: "backend_radio_values",
//             n: "Radio Button Values",
//             source: "radio",
//             locked: true,
//             v: radioValues.status === "fulfilled" ? radioValues.value.map((item) => item.name).filter(Boolean) : [],
//           },
//           {
//             id: "backend_checkbox_values",
//             n: "Checkbox Values",
//             source: "checkbox",
//             locked: true,
//             v: checkboxValues.status === "fulfilled" ? checkboxValues.value.map((item) => item.name).filter(Boolean) : [],
//           },
//         ];

//         setValueSets((prev) => {
//           const customSets = prev.filter((set) => !set.locked && !String(set.id).startsWith("backend_"));
//           const merged = [...backendSets, ...customSets];
//           if (!selVS && merged.length) setSelVS(merged[0].id);
//           return merged;
//         });
//         if (uomData.status === "fulfilled") setUomOptions(toLookupOptions(uomData.value, DEFAULT_UOM_OPTIONS));
//         if (taskTypeData.status === "fulfilled") setTaskTypeOptions(toLookupOptions(taskTypeData.value, DEFAULT_TASK_TYPE_OPTIONS));
//         setBackendValuesLoaded(true);
//       } catch (err) {
//         if (!cancelled) setPublishStatus(err instanceof Error ? err.message : "Failed to load predefined values");
//       }
//     }

//     loadBuilderDefaults();

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   const ensureValueIds = async (type: FieldType, values: string[]): Promise<Map<string, number>> => {
//     const endpoint = VALUE_ENDPOINT_BY_FIELD[type];
//     if (!endpoint) return new Map<string, number>();

//     let existing = await loadSimpleValues(endpoint);
//     const ids = new Map<string, number>(existing.map((item) => [item.name.trim().toLowerCase(), item.id]));

//     for (const value of values) {
//       const key = value.trim().toLowerCase();
//       if (!key || ids.has(key)) continue;

//       const saved = await apiJson(endpoint, {
//         method: "POST",
//         body: JSON.stringify({ Id: 0, Name: value.trim() }),
//       });
//       const savedId = getApiId(saved);
//       if (savedId) ids.set(key, savedId);
//     }

//     existing = await loadSimpleValues(endpoint);
//     existing.forEach((item) => ids.set(item.name.trim().toLowerCase(), item.id));

//     return ids;
//   };

//   const resolveSavedColumnId = async (field: Field, response: any) => {
//     const responseId = getApiId(response);
//     if (responseId) return responseId;

//     const rows: DynamicColumn[] = asArray(await apiJson("/api/formbuilder/dynamic-columns")).map(normalizeDynamicColumn);
//     const match = rows
//       .filter((row) => row.name === field.l)
//       .sort((a, b) => b.id - a.id)[0];

//     return match?.id || 0;
//   };

//   const resolveSavedTaskId = async (response: any) => {
//     const responseId = getApiId(response);
//     if (responseId) return responseId;
//     if (publishedTaskId) return publishedTaskId;

//     const rows: Task[] = asArray(await apiJson("/api/formbuilder/tasks")).map(normalizeTask);
//     const match = rows
//       .filter((row) => row.name === formName.trim())
//       .sort((a, b) => b.id - a.id)[0];

//     return match?.id || null;
//   };

//   const sectionForField = (field: Field) => {
//     let title = "";
//     for (const candidate of fields) {
//       if (candidate.pg !== field.pg) continue;
//       if (candidate.id === field.id) break;
//       if (candidate.t === "section") title = candidate.l;
//     }
//     return title;
//   };

 

//   const publishToBackend = async () => {    
//    console.log("Publishing with fields =", fields);
    
//     const backendFields = fields.filter((field) => field.t !== "section");
//     // console.log("Backend fields to publish =", backendFields);

//     if (!formName.trim()) {
//       setPublishStatus("Form name is required before publishing.");
//       return;
//     }
//     if (backendFields.length === 0) {
//       setPublishStatus("Add at least one field before publishing.");
//       return;
//     }
//     if (!uom || uom === "0") {
//       setPublishStatus("Please select UOM before publishing.");
//       return;
//     }
//     if (!taskType || taskType === "0") {
//       setPublishStatus("Please select Task Type before publishing.");
//       return;
//     }
//     if (progress <= 0) {
//       setPublishStatus("Progress increment must be greater than 0.");
//       return;
//     }
//     saveDraft();

//     for (const field of backendFields) {
//    console.log("field =", field);
//   // console.log("field.vs =", field.vs);
//   // console.log("valueSets =", valueSets);
//   // console.log("field.vs =", field.vs);

// // console.log(
// //   "valueSet ids =",
// //   valueSets.map(v => v.id)
// // );

//       if (!field.l.trim()) {
//         setPublishStatus("Every field needs a label before publishing.");
//         return;
//       }
//       if (isOptionField(field)) {
//         const sourceOptions = await loadSourceOptions(field);
//         const selectedOptions = selectedOptionsForField(field, sourceOptions);
//         const fallbackSet = valueSets.find((set) => set.id === field.vs);

//         if (selectedOptions.length === 0 && (!fallbackSet || fallbackSet.v.length === 0)) {
//           setPublishStatus(`${field.l} needs at least one selected option value.`);
//           return;
//         }
//       }
//     }

//     setPublishing(true);
//     setPublishStatus("Publishing value sets...");

//     try {
//       const valueIdsBySet = new Map<string, Map<string, number>>();
//       for (const field of backendFields) {
//         if (!isOptionField(field) || !field.vs) continue;
//         if ((field.selectedOptionIds ?? []).length > 0) continue;
//         const optionType = optionTypeForControl(fieldControlTypeId(field)) as FieldType;
//         if (valueIdsBySet.has(`${optionType}:${field.vs}`)) continue;

//         const vs = valueSets.find((set) => set.id === field.vs);
//         if (!vs) continue;
//         valueIdsBySet.set(`${optionType}:${field.vs}`, await ensureValueIds(optionType, vs.v));
//       }



//       setPublishStatus("Saving dynamic columns...");
//       // 🟢 FIX: Start with a clean object so we only map columns currently on the canvas layout
//       const nextColumnIds: PublishedColumnMap = {};

//       for (const field of backendFields) {
//         const controlTypeId = fieldControlTypeId(field);
//         const selectedSet = field.vs ? valueSets.find((set) => set.id === field.vs) : null;
//         const optionType = optionTypeForControl(controlTypeId) as FieldType;
//         const optionIds = field.vs ? valueIdsBySet.get(`${optionType}:${field.vs}`) : null;
        
//         // 🟢 FIX: Safely pull original tracking IDs from the component state map
//         const existingColumnId = publishedColumnIds[field.id] || 0;
        
//         const sourceOptions = await loadSourceOptions(field);
//         const selectedSourceOptions = selectedOptionsForField(field, sourceOptions);
//         const optionPayload = selectedSourceOptions.length > 0
//           ? selectedSourceOptions.map((option, index) => ({
//             Id: option.id,
//             ColumnId: existingColumnId,
//             DropDownConfigId: option.dropDownConfigId,
//             Position: option.position || index + 1,
//             IsSelected: true,
//           }))
//           : selectedSet?.v.map((value, index) => ({
//             Id: optionIds?.get(value.trim().toLowerCase()) || 0,
//             ColumnId: existingColumnId,
//             DropDownConfigId: 0,
//             Position: index + 1,
//             IsSelected: true,
//           })) ?? [];

//         const columnPayload = {
//           Id: existingColumnId,
//           Name: field.l.trim(),
//           ControlTypeId: controlTypeId,
//           LoadingFrom: controlTypeId === 2 ? "2" : "0",
//           LoadingData: "0",
//           LoadingOCR: false,
//           LoadingPrintText: false,
//           RCM: field.r ? 2 : 0,
//           DropDownValues: controlTypeId === 2 ? optionPayload : [],
//           RadioButtonValues: controlTypeId === 3 ? optionPayload : [],
//           CheckBoxValues: controlTypeId === 9 ? optionPayload : [],
//         };

//         const saved = await apiJson("/api/formbuilder/dynamic-columns", {
//           method: "POST",
//           body: JSON.stringify(columnPayload),
//         });
//         const savedId = await resolveSavedColumnId(field, saved);
//         if (!savedId) throw new Error(`Backend did not return an id for ${field.l}`);
//         nextColumnIds[field.id] = savedId;
//         updateField(field.id, { id: savedId });
//       }

//       // Delete any previously published backend columns that are no longer on the layout canvas
//       try {
//         const originalIds = Object.values(publishedColumnIds || {});
//         const keptIds = Object.values(nextColumnIds || {});
//         const toDelete = originalIds.filter((id) => id && !keptIds.includes(id));
        
//         for (const id of toDelete) {
//           try {
//             await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`, { method: "DELETE" });
//           } catch (err) {
//             console.warn("Failed to delete old column", id, err);
//           }
//         }
//       } catch (err) {
//         console.warn("Error while deleting stale columns", err);
//       }








//       // setPublishStatus("Saving dynamic columns...");
//       // const nextColumnIds: PublishedColumnMap = {};
//       // // const nextColumnIds: PublishedColumnMap = { ...publishedColumnIds };

//       // for (const field of backendFields) {
//       //   const controlTypeId = fieldControlTypeId(field);
//       //   const selectedSet = field.vs ? valueSets.find((set) => set.id === field.vs) : null;
//       //   const optionType = optionTypeForControl(controlTypeId) as FieldType;
//       //   const optionIds = field.vs ? valueIdsBySet.get(`${optionType}:${field.vs}`) : null;
//       //   const existingColumnId = nextColumnIds[field.id] || 0;
//       //   const sourceOptions = await loadSourceOptions(field);
//       //   const selectedSourceOptions = selectedOptionsForField(field, sourceOptions);
//       //   const optionPayload = selectedSourceOptions.length > 0
//       //     ? selectedSourceOptions.map((option, index) => ({
//       //       Id: option.id,
//       //       ColumnId: existingColumnId,
//       //       DropDownConfigId: option.dropDownConfigId,
//       //       Position: option.position || index + 1,
//       //       IsSelected: true,
//       //     }))
//       //     : selectedSet?.v.map((value, index) => ({
//       //       Id: optionIds?.get(value.trim().toLowerCase()) || 0,
//       //       ColumnId: existingColumnId,
//       //       DropDownConfigId: 0,
//       //       Position: index + 1,
//       //       IsSelected: true,
//       //     })) ?? [];

//       //   const columnPayload = {
//       //     Id: existingColumnId,
//       //     Name: field.l.trim(),
//       //     ControlTypeId: controlTypeId,
//       //     LoadingFrom: controlTypeId === 2 ? "2" : "0",
//       //     LoadingData: "0",
//       //     LoadingOCR: false,
//       //     LoadingPrintText: false,
//       //     RCM: field.r ? 2 : 0,
//       //     DropDownValues: controlTypeId === 2 ? optionPayload : [],
//       //     RadioButtonValues: controlTypeId === 3 ? optionPayload : [],
//       //     CheckBoxValues: controlTypeId === 9 ? optionPayload : [],
//       //   };
//       // //  console.log( "columnpayload:", columnPayload);
//       //   const saved = await apiJson("/api/formbuilder/dynamic-columns", {
//       //     method: "POST",
//       //     body: JSON.stringify(columnPayload),
//       //   });
//       //   const savedId = await resolveSavedColumnId(field, saved);
//       //   if (!savedId) throw new Error(`Backend did not return an id for ${field.l}`);
//       //   nextColumnIds[field.id] = savedId;
//       // }

//       setPublishStatus("Creating task view...");
//       const taskForm = await apiJson(`/api/formbuilder/tasks?id=${publishedTaskId ?? 0}`);
//       const backendTaskRows: TaskDynamicColumn[] = asArray(taskForm?.DynamicColumns ?? taskForm?.dynamicColumns).map(normalizeTaskDynamicColumn);
//       const firstGlobalFieldId = backendFields.find((field) => {
//         const controlTypeId = fieldControlTypeId(field);
//         return ![5, 8].includes(controlTypeId);
//       })?.id;

//       const formFieldByColumnId = new Map<number, Field>(
//         backendFields.map((field) => [nextColumnIds[field.id], field]),
//       );
//       const taskRowsById = new Map<number, TaskDynamicColumn>(backendTaskRows.map((row) => [row.id, row]));
//       const orderedRows: TaskDynamicColumn[] = backendFields
//         .map((field) => taskRowsById.get(nextColumnIds[field.id]) ?? {
//           id: nextColumnIds[field.id],
//           name: field.l,
//           controlTypeId: fieldControlTypeId(field),
//           taskAttributeId: null,
//           taskSelected: false,
//           globalName: false,
//           sectionTitle: "",
//           sectionNo: 0,
//           pageNo: 0,
//         })
//         .filter((row) => formFieldByColumnId.has(row.id));

//       // const taskPayload = {
//       //   Id: publishedTaskId ?? 0,
//       //   Name: formName.trim(),
//       //   MarkerPath: markerPath || "0",
//       //   UOM: uom,
//       //   TaskType: taskType,
//       //   Progress: progress,
//       //   LocationSelection: locationSelection || backendFields.some((field) => field.t === "location"),
//       //   DynamicColumns: orderedRows.map((row, index) => {
//       //     const field = formFieldByColumnId.get(row.id);
//       //     const pageIndex = field ? pgIdx(field.pg) : 0;
//       //     return {
//       //       Position: index,
//       //       Id: row.id,
//       //       TaskAttributeId: row.taskAttributeId,
//       //       TaskSelected: true,
//       //       GlobalName: field?.id === firstGlobalFieldId,
//       //       SectionTitle: field ? sectionForField(field) : row.sectionTitle,
//       //       SectionNo: field ? Math.max(pageIndex + 1, 1) : row.sectionNo,
//       //       PageNo: field ? Math.max(pageIndex + 1, 1) : row.pageNo,
//       //     };
//       //   }),
//       // };


// const taskPayload = {
//   Id: publishedTaskId ?? 0,
//   Name: formName.trim(),
//   MarkerPath: markerPath || "0",
//   UOM: uom,
//   TaskType: taskType,
//   Progress: progress,
//   LocationSelection: locationSelection || backendFields.some((field) => field.t === "location"),
//   DynamicColumns: orderedRows.map((row, index) => {
//     const field = formFieldByColumnId.get(row.id);
//     const pageIndex = field ? pgIdx(field.pg) : 0;
    
//     // ─── DYNAMIC SECTION NUMBER CALCULATION ───
//     let calculatedSectionNo = 0; 
//     if (field) {
//       // Filter fields on the current page that come before or match the current field
//       const pageFieldsList = fields.filter((f) => f.pg === field.pg);
//       const currentFieldGlobalIdx = pageFieldsList.findIndex((f) => f.id === field.id);
      
//       // Count how many "section" types exist before this field on this page
//       const sectionsBefore = pageFieldsList
//         .slice(0, currentFieldGlobalIdx + 1)
//         .filter((f) => f.t === "section").length;

//       // Default to section 1 if no section headers have been dragged/added above it yet
//       calculatedSectionNo = sectionsBefore === 0 ? 1 : sectionsBefore;
//     } else {
//       calculatedSectionNo = row.sectionNo;
//     }

//     return {
//       Position: index,
//       Id: row.id,
//       TaskAttributeId: row.taskAttributeId,
//       TaskSelected: true,
//       GlobalName: field?.id === firstGlobalFieldId,
//       SectionTitle: field ? sectionForField(field) : row.sectionTitle,
//       SectionNo: calculatedSectionNo, // Now dynamically computed sequential index
//       PageNo: field ? Math.max(pageIndex + 1, 1) : row.pageNo,
//     };
//   }),
// };

//       const savedTask = await apiJson("/api/formbuilder/tasks", {
//         method: "POST",
//         body: JSON.stringify(taskPayload),
//       });
//       const savedTaskId = await resolveSavedTaskId(savedTask);

//       setPublishedColumnIds(nextColumnIds);
//       setPublishedTaskId(savedTaskId ?? null);
//       persistDraft(nextColumnIds, savedTaskId ?? null);
//       setDraftStatus("Draft saved");
//       setPublishStatus(`Published ${backendFields.length} fields and created the task view.`);
//       // Clear form after successful publish
// setFormName("Survey Form");
// setMarkerPath("0");
// setUom("0");
// setTaskType("0");
// setProgress(0);
// setLocationSelection(false);

// setPages([{ id: "p1", name: "Page 1" }]);
// setActivePg("p1");
// setPrevPg("p1");

// setFields([]);
// setSelId(null);

// setPublishedColumnIds({});
// setPublishedTaskId(null);

//  // Clear saved draft
// // localStorage.removeItem(FORM_BUILDER_DRAFT_KEY);

//     } catch (err) {
//       setPublishStatus(err instanceof Error ? err.message : "Publish failed");
//     } finally {
//       setPublishing(false);
//     }
//   };




//   const addField = (fieldType: FieldType, value: number, backendId?: number) => {
//   const id = backendId ?? nid(); // Use the actual DB ID if it exists
  
//   const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
//   const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);
//   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// const assignedVs = 
//   value === 2 ? `col_${id}` : 
//   value === 3 ? `col_${id}` : 
//   value === 9 ? `col_${id}` : 
//   defaultValueSet || "";

//   // const assignedVs = 
//   //   value === 2 ? "backend_dropdown_values" : 
//   //   value === 3 ? "backend_radio_values" : 
//   //   value === 9 ? "backend_checkbox_values" : 
//   //   defaultValueSet || "";

//   const newField: Field = {
//     id, // This links the canvas item directly to your DB identity row
//     t: fieldType,
//     controlTypeId: value,
//     l: `${preciseLabel} Field`, 
//     r: false,
//     pg: activePg,
//     vs: assignedVs,
//   };

//   setFields((prev) => [...prev, newField]);
//   setSelId(id);
  
//   if (assignedVs) {
//     setSelVS(assignedVs); 
//   }

//   if ([2, 3, 9].includes(value)) {
//     loadSourceOptions(newField);
//   }
// };


// //   const addField = (fieldType: FieldType, value: number) => {
// //   const id = nid();
  
// //   const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
// //   const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);
// //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// //   // Extract the assigned Value Set so we can update the right panel
// //   const assignedVs = 
// //     value === 2 ? "backend_dropdown_values" : 
// //     value === 3 ? "backend_radio_values" : 
// //     value === 9 ? "backend_checkbox_values" : 
// //     defaultValueSet || "";

// //   const newField: Field = {
// //     id,
// //     t: fieldType,
// //     controlTypeId: value,
// //     l: `${preciseLabel} Field`, 
// //     r: false,
// //     pg: activePg,
// //     vs: assignedVs,
// //   };

// //   setFields((prev) => [...prev, newField]);
// //   setSelId(id);
  
// //   // NEW: Update the selected Value Set so the right panel refreshes instantly
// //   if (assignedVs) {
// //     setSelVS(assignedVs); 
// //   }

// //   if ([2, 3, 9].includes(value)) {
// //     loadSourceOptions(newField);
// //   }
// // };


// useEffect(() => {
//   if (selField && selField.vs) {
//     setSelVS(selField.vs);
//   }
// }, [selField?.id, selField?.vs]);


  
// // const addField = (fieldType: FieldType, value: number) => {
// //     const id = nid();
    
// //     // 1. Get the authentic exact name from your database control options
// //     const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
// //     const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);

// //     const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// //     // 2. Build the field structure with correct values and matching backend value set IDs
// //     const newField: Field = {
// //       id,
// //       t: fieldType,
// //       controlTypeId: value,
// //       l: `${preciseLabel} Field`, 
// //       r: false,
// //       pg: activePg,
// //       vs:
// //         value === 2
// //           ? "backend_dropdown_values"
// //           : value === 3
// //           ? "backend_radio_values"
// //           : value === 9
// //           ? "backend_checkbox_values"
// //           : defaultValueSet || "",
// //     };

// //     setFields((prev) => [...prev, newField]);
// //     setSelId(id);

// //     // 3. Trigger option value loaders immediately for selectable types
// //     if ([2, 3, 9].includes(value)) {
// //       loadSourceOptions(newField);
// //     }
// //   };


// //   const addField = (fieldType: FieldType, value: number) => {
// //   const id = nid();
  
// //   // Find the exact name from your control type configurations list
// //   const matchingControl = controlTypeOptions.find((c) => Number(c.value) === value);
// //   const preciseLabel = matchingControl?.Text || matchingControl?.label || fieldLabel(fieldType);

// //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// //   const defaultDropdownColumn = availableColumns.find(
// //     (c) => Number(c.ControlTypeId ?? c.controlTypeId) === 2
// //   );

// //   const newField: Field = {
// //     id,
// //     t: fieldType,
// //     controlTypeId: value,
// //     // Use the authentic backend configuration name for the workspace label text
// //     l: `${preciseLabel} Field`, 
// //     r: false,
// //     pg: activePg,
// //     vs:
// //       value === 2
// //         ? String(
// //             defaultDropdownColumn?.Id ??
// //             defaultDropdownColumn?.id ??
// //             defaultValueSet ??
// //             ""
// //           )
// //         : value === 3
// //         ? "backend_radio_values"
// //         : value === 9
// //         ? "backend_checkbox_values"
// //         : defaultValueSet || "",
// //   };

// //   setFields((prev) => [...prev, newField]);
// //   setSelId(id);

// //   if ([2, 3, 9].includes(value)) {
// //     loadSourceOptions(newField);
// //   }
// // };
// //   const addField = (fieldType: FieldType, value: number) => {
// //   const id = nid();
  
// //   // BYPASS THE BROKEN HARDCODED MAP LINE:
// //   // const fieldType = fieldTypeForControl(value, t);

// //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// //   const defaultDropdownColumn = availableColumns.find(
// //     (c) => Number(c.ControlTypeId ?? c.controlTypeId) === 2
// //   );

// //   const newField = {
// //     id,
// //     t: fieldType,
// //     controlTypeId: value,
// //     l: `${fieldLabel(fieldType)} Field`,
// //     r: false,
// //     pg: activePg,
// //     vs:
// //       value === 2
// //         ? String(
// //             defaultDropdownColumn?.Id ??
// //             defaultDropdownColumn?.id ??
// //             defaultValueSet ??
// //             ""
// //           )
// //         : defaultValueSet,
// //   };

// //   console.log("newField", newField);

// //   setFields((prev) => [...prev, newField]);
// //   setSelId(id);

// //   if (value === 2) {
// //     loadSourceOptions(newField);
// //   }
// // };

//   // const addField = (t: FieldType, value: number) => {
//   //   const id = nid();
//   //   const fieldType = fieldTypeForControl(value, t);
//   //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

//   //   const defaultDropdownColumn = availableColumns.find(
//   //     (c) => Number(c.ControlTypeId ?? c.controlTypeId) === 2
//   //   );

//   //   const newField = {
//   //     id,
//   //     t: fieldType,
//   //     controlTypeId: value,
//   //     l: `${fieldLabel(fieldType)} Field`,
//   //     r: false,
//   //     pg: activePg,
//   //     vs:
//   //       value === 2
//   //         ? String(
//   //             defaultDropdownColumn?.Id ??
//   //             defaultDropdownColumn?.id ??
//   //             defaultValueSet ??
//   //             ""
//   //           )
//   //         : defaultValueSet,
//   //   };

//   //   console.log("newField", newField);

//   //   setFields((prev) => [...prev, newField]);
//   //   setSelId(id);

//   //   if (value === 2) {
//   //     loadSourceOptions(newField);
//   //   }
//   // };

// // const addField = (t: FieldType, value: number) => {
// //   const id = nid();
// //   const fieldType = fieldTypeForControl(value, t);

// //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;

// //   const defaultDropdownColumn = availableColumns.find(
// //     (c) => Number(c.ControlTypeId ?? c.controlTypeId) === 2
// //   );

// //   const newField = {
// //     id,
// //     t: fieldType,
// //     controlTypeId: value,
// //     l: `${fieldLabel(fieldType)} Field`,
// //     r: false,
// //     pg: activePg,
// //     vs:
// //       value === 2 && defaultDropdownColumn
// //         ? columnId(defaultDropdownColumn)
// //         : defaultValueSet,
// //   };


// //   setFields((prev) => [...prev, newField]);
// //   setSelId(id);

// //   if (value === 2) {
// //     loadSourceOptions(newField);
// //   }

// //   console.log("newField", newField);
// // console.log("newField.vs", newField.vs);
// // };




//   // const addField = (t: FieldType, value:number ) => {
//   //   const id = nid();
//   //   const fieldType = fieldTypeForControl(value, t);
//   //   const defaultValueSet = compatibleValueSets(fieldType)[0]?.id;
//   //   setFields((prev) => [...prev, { id,
//   //      t: fieldType,
//   //     controlTypeId: value, 
//   //     l: `${fieldLabel(fieldType)} Field`, r: false, pg: activePg, vs: defaultValueSet }]);
//   //   setSelId(id);
//   // };

//   const deleteField = (id: number) => {
//     setFields((prev) => prev.filter((f) => f.id !== id));
//     if (selId === id) setSelId(null);
//   };

//   const moveField = (id: number, dir: "up" | "dn") => {
//     const pf = pgFields(activePg);
//     const all = [...fields];
//     const pi = pf.findIndex((f) => f.id === id);
//     if (dir === "up" && pi > 0) {
//       const ai = all.findIndex((f) => f.id === id);
//       const bi = all.findIndex((f) => f.id === pf[pi - 1].id);
//       [all[bi], all[ai]] = [all[ai], all[bi]];
//     } else if (dir === "dn" && pi < pf.length - 1) {
//       const ai = all.findIndex((f) => f.id === id);
//       const bi = all.findIndex((f) => f.id === pf[pi + 1].id);
//       [all[ai], all[bi]] = [all[bi], all[ai]];
//     }
//     setFields(all);
//   };
  

//   const updateField = (id: number, patch: Partial<Field>) =>
//     setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

//   const toggleFieldOption = (field: Field, optionId: number) => {
//     const selectedIds = new Set((field.selectedOptionIds ?? []).map(Number));
//     if (selectedIds.has(optionId)) {
//       selectedIds.delete(optionId);
//     } else {
//       selectedIds.add(optionId);
//     }
//     updateField(field.id, { selectedOptionIds: Array.from(selectedIds) });
//   };

//   const addPage = () => {
//     const id = "p" + nid();
//     setPages((prev) => [...prev, { id, name: "New Page" }]);
//     setActivePg(id);
//     setEditPgId(id);
//     setTimeout(() => pgRenameRef.current?.focus(), 50);
//   };

//   const deletePage = (pid: string) => {
//     if (pages.length <= 1) return;
//     const rem = pages.filter((p) => p.id !== pid);
//     const fb = rem[0].id;
//     setPages(rem);
//     setFields((prev) => prev.map((f) => (f.pg === pid ? { ...f, pg: fb } : f)));
//     if (activePg === pid) setActivePg(fb);
//   };

//   const addValueSet = () => {
//     if (!newVsName.trim()) return;
//     const id = newVsName.toLowerCase().replace(/\s+/g, "_") + "_" + nid();
//     setValueSets((prev) => [...prev, { id, n: newVsName.trim(), v: [] }]);
//     setSelVS(id);
//     setNewVsName("");
//   };

//   const addVsValue = () => {
//     if (!newVsVal.trim() || !selVS) return;
//     setValueSets((prev) =>
//       prev.map((v) => (v.id === selVS ? { ...v, v: [...v.v, newVsVal.trim()] } : v))
//     );
//     setNewVsVal("");
//   };

//   const saveVsEdit = (i: number) => {
//     if (!selVS) return;
//     setValueSets((prev) =>
//       prev.map((v) => (v.id === selVS ? { ...v, v: v.v.map((val, j) => (j === i ? editVsVal : val)) } : v))
//     );
//     setEditVsIdx(null);
//   };

//   const deleteVsValue = (i: number) => {
//     if (!selVS) return;
//     setValueSets((prev) =>
//       prev.map((v) => (v.id === selVS ? { ...v, v: v.v.filter((_, j) => j !== i) } : v))
//     );
//   };

//    useEffect(() => {
//   if (!selField) return;
//   if (Number(selField.controlTypeId) !== 2) return;
//   if (!selField.vs) return;

//   loadSourceOptions(selField);
// }, [selField?.id, selField?.vs, selField?.controlTypeId]);


// // onDragStart={(e) => e.dataTransfer.setData("fieldId", String(f.id))}


//   //   const addsection=()=>{
//   //     const id= nid();
//   //     const newSection: Field={
//   //       id,
//   //       t:"section",
//   //       l:"New Section Title",
//   //       r:false,
//   //       pg:activePg,
//   //     };
//   //     setFields((prev)=>[...prev,newSection]);
//   //     setSelId(id);
 
//   //  }

//   const addsection = () => {
//   const id = nid();
//   const newSection: Field = {
//     id,
//     t: "section",
//     l: "NEW SECTION TITLE",
//     r: false,
//     pg: activePg,
//   };

//   setFields((prev) => [...prev, newSection]);
//   setSelId(id); // Instantly highlight the section properties panel
// };


// // const reorderFields = (draggedId: number, targetId: number) => {
// //   const allFields = [...fields];
// //   const draggedIdx = allFields.findIndex((f) => f.id === draggedId);
// //   const targetIdx = allFields.findIndex((f) => f.id === targetId);

// //   if (draggedIdx === -1 || targetIdx === -1) return;

// //   // Remove the dragged item and insert it at the target position
// //   const [draggedItem] = allFields.splice(draggedIdx, 1);
// //   allFields.splice(targetIdx, 0, draggedItem);

// //   setFields(allFields);
// // };

// // const reorderFields = (draggedId: number, targetId: number) => {
// //   setFields((prev) => {
// //     const allFields = [...prev];
// //     const draggedIdx = allFields.findIndex((f) => f.id === draggedId);
// //     const targetIdx = allFields.findIndex((f) => f.id === targetId);

// //     if (draggedIdx === -1 || targetIdx === -1) return prev;

// //     // Splice array re-injection
// //     const [draggedItem] = allFields.splice(draggedIdx, 1);
// //     allFields.splice(targetIdx, 0, draggedItem);

// //     return allFields;
// //   });
// // };

// const reorderFields = (draggedId: number, targetId: number) => {
//   setFields((prev) => {
//     const allFields = [...prev];
//     const draggedIdx = allFields.findIndex((f) => f.id === draggedId);
//     const targetIdx = allFields.findIndex((f) => f.id === targetId);

//     if (draggedIdx === -1 || targetIdx === -1) return prev;

//     // Remove the dragged element from its old global position
//     const [draggedItem] = allFields.splice(draggedIdx, 1);
    
//     // Re-insert the dragged element directly at the target's global position
//     allFields.splice(targetIdx, 0, draggedItem);

//     return allFields;
//   });
// };

// // {pgFields(activePg).map((f, i) => {
// //   const on = selId === f.id;
// //   const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
  
// //   return (
// //     <div
// //       key={f.id}
// //       onClick={() => setSelId(on ? null : f.id)}
      
// //       // ─── DRAG AND DROP HANDLERS ───
// //       draggable
// //       onDragStart={(e) => {
// //         // Store the ID of the field currently being dragged
// //         e.dataTransfer.setData("text/plain", String(f.id));
// //       }}
// //       onDragOver={(e) => {
// //         // Necessary override to permit dropping items on this region
// //         e.preventDefault();
// //       }}
// //       onDrop={(e) => {
// //         e.preventDefault();
// //         const draggedId = Number(e.dataTransfer.getData("text/plain"));
// //         if (draggedId !== f.id) {
// //           reorderFields(draggedId, f.id);
// //         }
// //       }}

// //       style={{
// //         display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
// //         cursor: "grab", // Changes the cursor to a hand grip indicator for clarity
// //         borderBottom: "1px solid #edf0f3",
// //         borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
// //         background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
// //       }}
// //     >
// //       <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
// //       <span style={{ fontSize: 9, color: "#c0c7d0", minWidth: 16, textAlign: "center" }}>{i + 1}</span>
      
// //       {f.t === "section" ? (
// //         <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
// //           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
// //           <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{f.l}</span>
// //           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
// //         </div>
// //       ) : (
// //         <>
// //           <span style={{ fontSize: 12.5, color: "#374151", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
// //             {f.l}{f.r && <span style={{ color: "#e53e3e", fontSize: 10 }}> *</span>}
// //           </span>
// //           <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{f.t}</span>
// //           {vs && <span style={{ fontSize: 9, color: TEAL, background: "#e8f7f4", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{vs.n}</span>}
// //         </>
// //       )}
      
// //       {on && (
// //         <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
// //           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "up"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↑</button>
// //           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "dn"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↓</button>
// //           <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#e53e3e", cursor: "pointer" }}>×</button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // })}
// // {pgFields(activePg).map((f, i) => {
// //   const on = selId === f.id;
// //   const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
  
// //   return (
// //     <div
// //       key={f.id}
// //       onClick={() => setSelId(on ? null : f.id)}
      
// //       // DRAG AND DROP ATTRIBUTES HERE
// //       draggable
// //       onDragStart={(e) => {
// //         e.dataTransfer.setData("text/plain", String(f.id));
// //       }}
// //       onDragOver={(e) => {
// //         e.preventDefault(); // Necessary to allow dropping
// //       }}
// //       onDrop={(e) => {
// //         e.preventDefault();
// //         const draggedId = Number(e.dataTransfer.getData("text/plain"));
// //         if (draggedId !== f.id) {
// //           reorderFields(draggedId, f.id);
// //         }
// //       }}

// //       style={{
// //         display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
// //         cursor: "grab", borderBottom: "1px solid #edf0f3", // Changed cursor to grab for better UX
// //         borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
// //         background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
// //       }}
// //     >
// //       <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
// //       {/* ... rest of your inner field rendering code (Section titles, Labels, Dropdowns, Buttons) ... */}
// //     </div>
// //   );
// // })}

// // {pgFields(activePg).map((f, i) => {
// //   const on = selId === f.id;
// //   const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
  
// //   return (
// //     <div
// //       key={f.id}
// //       onClick={() => setSelId(on ? null : f.id)}
      
// //       // ─── STABLE NATIVE DRAG AND DROP HANDLERS ───
// //       draggable
// //       onDragStart={(e) => {
// //         e.dataTransfer.setData("text/plain", String(f.id));
// //         e.currentTarget.style.opacity = "0.4";
// //       }}
// //       onDragEnd={(e) => {
// //         e.currentTarget.style.opacity = "1";
// //       }}
// //       onDragOver={(e) => {
// //         e.preventDefault(); // Necessary to allow dropping on this row item
// //       }}
// //       onDrop={(e) => {
// //         e.preventDefault();
// //         const draggedId = Number(e.dataTransfer.getData("text/plain"));
// //         if (draggedId !== f.id) {
// //           reorderFields(draggedId, f.id);
// //         }
// //       }}

// //       style={{
// //         display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
// //         cursor: "grab", // Gives accurate visual indicator for dragging
// //         borderBottom: "1px solid #edf0f3",
// //         borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
// //         background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
// //         transition: "opacity 0.2s ease",
// //       }}
// //     >
// //       <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
// //       <span style={{ fontSize: 9, color: "#c0c7d0", minWidth: 16, textAlign: "center" }}>{i + 1}</span>
      
// //       {f.t === "section" ? (
// //         <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
// //           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
// //           <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{f.l}</span>
// //           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
// //         </div>
// //       ) : (
// //         <>
// //           <span style={{ fontSize: 12.5, color: "#374151", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
// //             {f.l}{f.r && <span style={{ color: "#e53e3e", fontSize: 10 }}> *</span>}
// //           </span>
// //           <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{f.t}</span>
// //           {vs && <span style={{ fontSize: 9, color: TEAL, background: "#e8f7f4", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{vs.n}</span>}
// //         </>
// //       )}
      
// //       {on && (
// //         <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
// //           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "up"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↑</button>
// //           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "dn"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↓</button>
// //           <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#e53e3e", cursor: "pointer" }}>×</button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // })}

// {pgFields(activePg).map((f, i) => {
//   const on = selId === f.id;
//   const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
  
//   return (
//     <div
//       key={f.id}
//       onClick={() => setSelId(on ? null : f.id)}
      
//       // ─── ROBUST ID-BASED HTML5 DRAG & DROP HANDLERS ───
//       draggable
//       onDragStart={(e) => {
//         e.dataTransfer.setData("text/plain", String(f.id));
//         e.currentTarget.style.opacity = "0.4";
//       }}
//       onDragEnd={(e) => {
//         e.currentTarget.style.opacity = "1";
//       }}
//       onDragOver={(e) => {
//         e.preventDefault(); // Crucial to enable valid dropping zones
//       }}
//       onDrop={(e) => {
//         e.preventDefault();
//         const draggedId = Number(e.dataTransfer.getData("text/plain"));
//         if (draggedId !== f.id) {
//           reorderFields(draggedId, f.id);
//         }
//       }}

//       style={{
//         display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
//         cursor: "grab", // Explicit visual cue that rows can be shifted
//         borderBottom: "1px solid #edf0f3",
//         borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
//         background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
//         transition: "opacity 0.2s ease",
//       }}
//     >
//       <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
//       <span style={{ fontSize: 9, color: "#c0c7d0", minWidth: 16, textAlign: "center" }}>{i + 1}</span>
      
//       {f.t === "section" ? (
//         <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
//           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
//           <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{f.l}</span>
//           <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
//         </div>
//       ) : (
//         <>
//           <span style={{ fontSize: 12.5, color: "#374151", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//             {f.l}{f.r && <span style={{ color: "#e53e3e", fontSize: 10 }}> *</span>}
//           </span>
//           <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{f.t}</span>
//           {vs && <span style={{ fontSize: 9, color: TEAL, background: "#e8f7f4", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{vs.n}</span>}
//         </>
//       )}
      
//       {on && (
//         <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
//           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "up"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↑</button>
//           <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "dn"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↓</button>
//           <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#e53e3e", cursor: "pointer" }}>×</button>
//         </div>
//       )}
//     </div>
//   );
// })}


//   return (
//     <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
//       {/* Page-level header bar with tabs */}
//       <div style={{ background: "#fff", padding: "10px 16px 0", borderBottom: "1px solid #e2e6ea", flexShrink: 0 }}>
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
//           <div>
//             <span style={{ fontSize: 15, fontWeight: 500, color: TEAL }}>Form Builder</span>
//             <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 8 }}>Task Management / Form Builder</span>
//           </div>
//           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//             {draftStatus && <span style={{ fontSize: 10, color: "#718096" }}>{draftStatus}</span>}
//             {publishStatus && (
//               <span style={{ fontSize: 10, color: /failed|required|needs|error/i.test(publishStatus) ? "#dc2626" : TEAL }}>
//                 {publishStatus}
//               </span>
//             )}
//             <button onClick={saveDraft} style={{ ...S.secBtn, padding: "4px 10px", fontSize: 11 }}>Save Draft</button>
//             <button
//               onClick={publishToBackend}
//               disabled={publishing}
//               style={{ ...S.tealBtn, padding: "4px 10px", fontSize: 11, opacity: publishing ? 0.7 : 1 }}
//             >
//               {publishing ? "Publishing..." : "Publish to Backend"}
//             </button>
//             <span style={{ fontSize: 10, color: TEAL, background: "#e8f7f4", padding: "2px 9px", borderRadius: 10 }}>
//               {fieldCount} fields · {pages.length} pages · {fields.filter((f) => f.r).length} required
//             </span>
//           </div>
//         </div>
//         <div style={{ height: 2, background: TEAL, marginBottom: 0 }} />
//         <div style={{ display: "flex" }}>
//           {(["build", "vs", "prev"] as Tab[]).map((t) => (
//             <button
//               key={t}
//               onClick={() => setTab(t)}
//               style={{
//                 padding: "7px 18px", border: "none", background: "transparent", fontSize: 12,
//                 borderBottom: tab === t ? `2px solid ${TEAL}` : "2px solid transparent",
//                 color: tab === t ? TEAL : "#718096", fontWeight: tab === t ? 600 : 400,
//                 cursor: "pointer", marginBottom: -1,
//               }}
//             >
//               {t === "build" ? "Build Form" : t === "vs" ? "Value Sets" : "Mobile Preview"}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Tab Content */}
//       <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
//         {tab === "build" && (
//           <div style={{ display: "grid", gridTemplateColumns: "172px 1fr 252px", height: "100%" }}>
//             {/* Palette */}
//             <div style={{ background: "#fff", borderRight: "1px solid #e2e6ea", overflowY: "auto", display: "flex", flexDirection: "column" }}>
//               <div style={{ padding: "10px 9px 0" }}>
//                 <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Add Field</div>
//                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                 

//                  {/* {controlTypeOptions.map((c) => {
//   // Dynamically resolve the correct lowercase FieldType from the backend label text
//   const textLabel = (c.Text || "").toLowerCase();
//   let resolvedType: FieldType = "text";
  
//   if (textLabel.includes("date")) resolvedType = "date";
//   else if (textLabel.includes("image") || textLabel.includes("photo")) resolvedType = "photo";
//   else if (textLabel.includes("video")) resolvedType = "photo"; // Maps to file-upload component view
//   else if (textLabel.includes("dropdown")) resolvedType = "dropdown";
//   else if (textLabel.includes("radio")) resolvedType = "radio";
//   else if (textLabel.includes("checkbox")) resolvedType = "checkbox";
//   else if (textLabel.includes("textarea")) resolvedType = "textarea";
//   else if (textLabel.includes("number")) resolvedType = "number";

//   return (
//     <button
//       key={c.value}
//       onClick={() => addField(resolvedType, Number(c.value))}
//       style={{
//         background: "#fff", border: "1px solid #e2e6ea", borderRadius: 4,
//         padding: "6px 3px", display: "flex", flexDirection: "column", alignItems: "center",
//         gap: 2, cursor: "pointer",
//       }}
//       onMouseEnter={(e) => {
//         (e.currentTarget as HTMLElement).style.borderColor = TEAL;
//         (e.currentTarget as HTMLElement).style.background = "#f0faf8";
//       }}
//       onMouseLeave={(e) => {
//         (e.currentTarget as HTMLElement).style.borderColor = "#e2e6ea";
//         (e.currentTarget as HTMLElement).style.background = "#fff";
//       }}
//     >
//       <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>{c.Text}</span>
//       <span style={{ fontSize: 9, color: "#94a3b8" }}>{c.Text}</span>
//     </button>
//   );
// })} */}
               
//                   {controlTypeOptions.map((c) => {
//                     const textLabel = String(c.Text ?? c.label ?? "").toLowerCase();
//                     const resolvedType: FieldType = textLabel.includes("date")
//                       ? "date"
//                       : textLabel.includes("image") || textLabel.includes("photo")
//                       ? "photo"
//                       : textLabel.includes("video")
//                       ? "photo"
//                       : textLabel.includes("file") || textLabel.includes("upload")
//                       ? "photo"
//                       : textLabel.includes("dropdown")
//                       ? "dropdown"
//                       : textLabel.includes("radio")
//                       ? "radio"
//                       : textLabel.includes("checkbox")
//                       ? "checkbox"
//                       : textLabel.includes("textarea")
//                       ? "textarea"
//                       : textLabel.includes("decimal") || textLabel.includes("float")
//                       ? "number"
//                       : textLabel.includes("number")
//                       ? "number"
//                       : fieldTypeForControl(Number(c.value));

//                     return (
//                       <button
//                         key={c.value}
//                         onClick={() => addField(resolvedType, Number(c.value))}
//                         style={{
//                           background: "#fff", border: "1px solid #e2e6ea", borderRadius: 4,
//                           padding: "6px 3px", display: "flex", flexDirection: "column", alignItems: "center",
//                           gap: 2, cursor: "pointer",
//                         }}
//                         onMouseEnter={(e) => {
//                           (e.currentTarget as HTMLElement).style.borderColor = TEAL;
//                           (e.currentTarget as HTMLElement).style.background = "#f0faf8";
//                         }}
//                         onMouseLeave={(e) => {
//                           (e.currentTarget as HTMLElement).style.borderColor = "#e2e6ea";
//                           (e.currentTarget as HTMLElement).style.background = "#fff";
//                         }}
//                       >
//                         <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>{c.Text ?? c.label}</span>
//                         <span style={{ fontSize: 9, color: "#94a3b8" }}>{c.Text ?? c.label}</span>
//                       </button>
//                     );
//                   })}
                  
//                     <button  onClick={addsection} style={{
//                         background: "#fff", border: "1px solid #e2e6ea", borderRadius: 4,gridColumn: "span 2",
//                         padding: "6px 3px", display: "flex", flexDirection: "column", alignItems: "center",width:"100%",
//                         gap: 2, cursor: "pointer",
//                       }}>  <span style={{ fontSize: 12, fontWeight: 700, color: "#4a5568" }}>Section</span>
//                       <span style={{ fontSize: 9, color: "#94a3b8" }}>Section</span></button>
//                 </div>
//               </div>
//               <div style={{ flex: 1 }} />
//               <div style={{ borderTop: "1px solid #e2e6ea", padding: 10 }}>
//                 <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Form Settings</div>
//                 <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Form Name</div>
//                 <input
//                   value={formName} onChange={(e) => setFormName(e.target.value)}
//                   style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
//                 />
//                 <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Marker Path</div>
//                 <input
//                   value={markerPath}
//                   onChange={(e) => setMarkerPath(e.target.value)}
//                   style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
//                   placeholder="0"
//                 />
//                 <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>UOM</div>
//                 <select
//                   value={uom}
//                   onChange={(e) => setUom(e.target.value)}
//                   style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#2d3748" }}
//                 >
//                   <option value="0">-- Select --</option>
//                   {uomOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
//                 </select>
//                 <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Task Type</div>
//                 <select
//                   value={taskType}
//                   onChange={(e) => setTaskType(e.target.value)}
//                   style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, background: "#fff", color: "#2d3748" }}
//                 >
//                   <option value="0">-- Select --</option>
//                   {taskTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
//                 </select>
//                 <div style={{ fontSize: 10, color: "#94a3b8", margin: "8px 0 3px" }}>Progress Increment (%)</div>
//                 <input
              
//                   min={1}
//                   max={100}
//                   value={progress}
//                   onChange={(e) => setProgress(Number(e.target.value))}
//                   style={{ width: "100%", padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
//                 />
//                 <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#718096", marginTop: 8 }}>
//                   <input
//                     type="checkbox"
//                     checked={locationSelection}
//                     onChange={(e) => setLocationSelection(e.target.checked)}
//                     style={{ accentColor: TEAL }}
//                   />
//                   User need to update location
//                 </label>
//                 <div style={{ marginTop: 5, fontSize: 10, color: "#94a3b8" }}>{fieldCount} fields across {pages.length} pages</div>
//               </div>
//             </div>

//             {/* Canvas */}
//             <div style={{ background: "#f0f2f5", display: "flex", flexDirection: "column", overflow: "hidden" }}>
//               {/* Page tabs */}
//               <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 10px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
//                 {pages.map((p) => {
//                   const cnt = pgFields(p.id).filter((f) => f.t !== "section").length;
//                   const on = activePg === p.id;


// //                   console.log("Active Page ID:", activePg);
// // console.log("All Fields:", fields);
// // console.log("Filtered Fields for Active Page:", pgFields(activePg));
//                   return (
//                     <div
//                       key={p.id}
//                       onClick={() => { setActivePg(p.id); setEditPgId(null); }}
//                       style={{
//                         display: "flex", alignItems: "center", gap: 5, padding: "7px 9px 6px",
//                         borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
//                         color: on ? TEAL : "#718096", borderRight: "1px solid #f1f5f9",
//                         background: on ? "rgba(29,184,152,0.04)" : "transparent",
//                         whiteSpace: "nowrap", cursor: "pointer", fontSize: 11, fontWeight: on ? 600 : 400,
//                       }}
//                     >
//                       {editPgId === p.id ? (
//                         <input
//                           ref={pgRenameRef}
//                           defaultValue={p.name}
//                           onClick={(e) => e.stopPropagation()}
//                           onChange={(e) => setPages((prev) => prev.map((pp) => (pp.id === p.id ? { ...pp, name: e.target.value } : pp)))}
//                           onBlur={() => setEditPgId(null)}
//                           onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditPgId(null); }}
//                           style={{ width: 78, border: `1px solid ${TEAL}`, borderRadius: 3, padding: "1px 5px", fontSize: 11, outline: "none" }}
//                         />
//                       ) : (
//                         <span onDoubleClick={(e) => { e.stopPropagation(); setEditPgId(p.id); setActivePg(p.id); }}>
//                           {p.name}
//                         </span>
//                       )}
//                       <span style={{ fontSize: 9, background: on ? "rgba(29,184,152,.1)" : "#f1f5f9", color: on ? TEAL : "#94a3b8", padding: "1px 5px", borderRadius: 8, fontWeight: 600 }}>{cnt}</span>
//                       {pages.length > 1 && (
//                         <button
//                           onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
//                           style={{ fontSize: 11, color: "#cbd5e1", border: "none", background: "none", padding: "0 1px", cursor: "pointer" }}
//                         >×</button>
//                       )}
//                     </div>
//                   );
//                 })}
//                 <button onClick={addPage} style={{ border: "none", background: "none", color: TEAL, fontSize: 11, padding: "7px 10px", fontWeight: 600, cursor: "pointer" }}>+ Page</button>
//               </div>

//               {/* Fields */}
//               <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
//                 <div style={{ background: "#fff", borderRadius: 5, border: "1px solid #e2e6ea", overflow: "hidden" }}>
//                    {/* middle form */}
//                   <div style={{ background: "#1a2740", padding: "9px 12px" }}>
//                     <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", letterSpacing: "0.03em" }}>{formName} — {pgName(activePg)}</div>
//                     <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Step{pgIdx(activePg) + 1} of {pages.length}</div>
//                   </div>

//                   <div style={{ height: 3, background: TEAL }} />
//                   {pgFields(activePg).length === 0 ? (
//                     <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: 12, lineHeight: 1.7 }}>
//                       No fields on this page.<br /><span style={{ fontSize: 11 }}>Click a field type on the left to add.</span>
//                     </div>
//                   ) : (
//                     pgFields(activePg).map((f, i) => {
//                       const on = selId === f.id;
//                       const vs = f.vs ? valueSets.find((v) => v.id === f.vs) : null;
                      
//                       return (
//                         <div
//                           key={f.id}
//                           // draggable={true}
//                            onDragStart={(e) => e.dataTransfer.setData("fieldId", String(f.id))}
//                            onDragOver={(e) => e.preventDefault()}
//                           onClick={() => setSelId(on ? null : f.id)}
//                           style={{
//                             display: "flex", alignItems: "center", gap: 7, padding: "6px 9px",
//                             cursor: "pointer", borderBottom: "1px solid #edf0f3",
//                             borderLeft: `3px solid ${on ? TEAL : "transparent"}`,
//                             background: on ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc",
//                           }} 
//                         > 
//                           <span style={{ color: "#d1d5db", fontSize: 10, userSelect: "none" }}>⋮⋮</span>
//                           <span style={{ fontSize: 9, color: "#c0c7d0", minWidth: 16, textAlign: "center" }}>{i + 1}</span>
                          
//                           {f.t === "section" ? (
//   <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
//     <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
//     <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>{f.l}</span>
//     <div style={{ flex: 1, height: 1, background: "#edf0f3" }} />
//   </div>
// ) : (
//   <>
//     <span style={{ fontSize: 12.5, color: "#374151", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
//       {f.l}{f.r && <span style={{ color: "#e53e3e", fontSize: 10 }}> *</span>}
//     </span>
//     {/* This pill on the side will show the structural execution engine variant (e.g. photo or number) */}
//     <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>
//       {controlTypeOptions.find((c) => Number(c.value) === f.controlTypeId)?.Text || f.t}
//     </span>
//     {vs && <span style={{ fontSize: 9, color: TEAL, background: "#e8f7f4", padding: "1px 5px", borderRadius: 3, whiteSpace: "nowrap" }}>{vs.n}</span>}
//   </>
// )}
//                           {on && (
//                             <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
//                               <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "up"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↑</button>
//                               <button onClick={(e) => { e.stopPropagation(); moveField(f.id, "dn"); }} style={{ background: "none", border: "1px solid #e2e6ea", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#718096", cursor: "pointer" }}>↓</button>
//                               <button onClick={(e) => { e.stopPropagation(); deleteField(f.id); }} style={{ background: "none", border: "1px solid #fecaca", borderRadius: 3, padding: "1px 4px", fontSize: 9, color: "#e53e3e", cursor: "pointer" }}>×</button>
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })
//                   )}
//                   <div style={{ textAlign: "center", padding: 9, color: "#d1d5db", fontSize: 10, borderTop: "1px dashed #e9ecef" }}>
//                     ← click a field type to add it to this page
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Properties Panel */}
//             <div style={{ background: "#fff", borderLeft: "1px solid #e2e6ea", overflowY: "auto" }}>
//               {selField ? (
//                 <div style={{ padding: 14 }}>
//                   <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Field Properties</div>               
//                   <div style={{ marginBottom: 12 }}>
//                     <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Label <span style={{ color: "#e53e3e" }}>*</span></label>
//                     <input style={{ ...S.inp, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
//                       value={selField.l} onChange={(e) => updateField(selField.id, { l: e.target.value })} />
//                   </div>

//                   {/* <div style={{ marginBottom: 12 }}>
//                     <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Type</label>
//                     <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", background: "#f9fafb", border: "1px solid #e2e6ea", borderRadius: 4 }}>
//                       <span style={{ fontSize: 11, fontWeight: 700, color: "#4a5568" }}>{fieldIcon(selField.t)}</span>
//                       <span style={{ fontSize: 12, color: "#4a5568" }}>{fieldLabel(selField.t)}</span>
//                       <span style={{ marginLeft: "auto", fontSize: 10, color: TEAL }}>Change ↗</span>
//                     </div>
//                   </div> */}

//                   <div style={{ marginBottom: 12 }}>
//                     <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Page</label>
//                     <select style={{ ...S.sel, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
//                       value={selField.pg} onChange={(e) => updateField(selField.id, { pg: e.target.value })}>
//                       {pages.map((p, i) => <option key={p.id} value={p.id}>Step {i + 1}: {p.name}</option>)}
//                     </select>
//                     <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>⇄ Moves this field to the selected page</div>
//                   </div>

//                   {/* {["text", "number", "textarea"].includes(selField.t) && (
//                     <div style={{ marginBottom: 12 }}>
//                       <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Placeholder</label>
//                       <input style={{ ...S.inp, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
//                         value={selField.ph ?? ""} onChange={(e) => updateField(selField.id, { ph: e.target.value })}
//                         placeholder="Optional hint..." />
//                     </div>
//                  )} */}



//                             {Number(selField.controlTypeId) === 2 && (  
//                                 <div style={{ marginBottom: 12 }}>
                                
//                                  {/* <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>Column Name<span style={{ color: "#e53e3e" }}>*</span></label>
//                                 <select style={{ ...S.sel, padding: "6px 9px", border: "1px solid #e2e6ea", borderRadius: 4, fontSize: 12 }}
//                                     value={selField.vs ?? ""} onChange={async (e) => {
                                       
//                                     const selectedColumnId = e.target.value;
                                        
//                                     const selectedColumn = availableColumns.find((column) => columnId(column) === selectedColumnId);
                                       
//                                     updateField(selField.id, {
//                                           l: selectedColumn ? columnName(selectedColumn) : selField.l,
//                                           vs: selectedColumnId,
//                                           selectedOptionIds: [],
//                                         });
//                                         if (selectedColumnId) {
//                                           await loadSourceOptions({ ...selField, vs: selectedColumnId });
//                                         }
//                                       }}>
//                                     <option value="">-- Select --</option>
//                                     {/* {compatibleValueSets(selField.t).map((v) => <option key={v.id} value={v.id}>{v.n} ({v.v.length})</option>)}
                                  
//                                   {availableColumns
//                                     .filter((column) => Number(column.ControlTypeId ?? column.controlTypeId) === 2)
//                                     .map((column) => (
//                                         <option key={columnId(column)} value={columnId(column)}>
//                                           {columnName(column)}
//                                         </option>
//                                       ))}
//                                  </select> */}

//                                      {selVS && (() => {
//               const vs = valueSets.find((v) => v.id === selVS);
//               if (!vs) return null;
//               return (
//                 <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
//                   <div style={S.cardHeader}>
//                     <span style={S.cardTitle}>{vs.n}</span>
//                     <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
//                   </div>
//                   <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
//                     <input value={newVsVal} onChange={(e) => setNewVsVal(e.target.value)}
//                       placeholder="Add value..."
//                       style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
//                       onKeyDown={(e) => { if (e.key === "Enter") addVsValue(); }}
//                     />
//                     <button onClick={addVsValue} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
//                   </div>
//                   {/* <div style={{ overflowY: "auto", flex: 1 }}>
//                     {vs.v.map((val, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
//                         {editVsIdx === i ? (
//                           <>
//                             <input autoFocus value={editVsVal} onChange={(e) => setEditVsVal(e.target.value)}
//                               style={{ flex: 1, padding: "3px 7px", border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 12, outline: "none" }}
//                               onKeyDown={(e) => { if (e.key === "Enter") saveVsEdit(i); }}
//                             />
//                             <button onClick={() => saveVsEdit(i)} style={{ ...S.tealBtn, padding: "3px 8px", fontSize: 11 }}>Save</button>
//                             <button onClick={() => setEditVsIdx(null)} style={{ ...S.secBtn, padding: "3px 8px", fontSize: 11 }}>Cancel</button>
//                           </>
//                         ) : (
//                           <>
//                             <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
//                             <button onClick={() => { setEditVsIdx(i); setEditVsVal(val); }} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏</button>
//                             <button onClick={() => deleteVsValue(i)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>×</button>
//                           </>
//                         )}
//                       </div>
//                     ))}
//                     {vs.v.length === 0 && <div style={{ padding: "20px 11px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No values yet. Add one above.</div>}
//                   </div> */}
//                 </div>
//               );
//             })()}

//                                   {(() => {
//                                     const key = optionSourceKey(selField); 
//                                     const optionValues = getCachedOptions(selField);
//                                     const selectedIds = new Set((selField.selectedOptionIds ?? []).map(Number));
//                                     const loadingOptions = key ? optionLoadingBySource[key] : false;

//                                     if (loadingOptions) {
//                                       return <div style={{ marginTop: 5, fontSize: 10, color: "#718096" }}>Loading option values...</div>;
//                                     }

//                                     if (optionValues.length === 0) {
//                                       return (
                                           
//                                         <div style={{ marginTop: 5, fontSize: 10, color: "#e53e3e" }}>
//                                           No option values found for this field. Select a valid source or create values in the matching value set.
//                                         </div>
//                                       );
//                                     }

//                                     return (
//                                       <div style={{ marginTop: 8 }}>
                                      
//                                         <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>options  <span style={{ color: "#e53e3e" }}>*</span></label>
//                                         <div style={{ padding: "6px 8px", background: "#f0faf8", borderRadius: 4, border: "1px solid rgba(29,184,152,.2)", maxHeight: 160, overflowY: "auto" }}>
//                                           {optionValues.map((option) => (
//                                             <label key={option.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px", fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
//                                               <input
//                                                 type="checkbox"
//                                                 checked={selectedIds.has(option.id)}
//                                                 onChange={() => toggleFieldOption(selField, option.id)}
//                                                 style={{ accentColor: TEAL, width: 13, height: 13 }}
//                                               />
//                                               <span>{option.name}</span>
//                                             </label>
//                                           ))}
                                       
//                                           <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{selectedIds.size} selected</div>
//                                         </div>
//                                       </div>
//                                     );
//                                   })()}
//                                 </div>
//                             )}

// {Number(selField.controlTypeId) === 3 && (  
//                                 <div style={{ marginBottom: 12 }}>
                                

//                                                        {selVS && (() => {
//               const vs = valueSets.find((v) => v.id === selVS);
//               if (!vs) return null;
//               return (
//                 <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
//                   <div style={S.cardHeader}>
//                     <span style={S.cardTitle}>{vs.n}</span>
//                     <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
//                   </div>
//                   <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
//                     <input value={newVsVal} onChange={(e) => setNewVsVal(e.target.value)}
//                       placeholder="Add value..."
//                       style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
//                       onKeyDown={(e) => { if (e.key === "Enter") addVsValue(); }}
//                     />
//                     <button onClick={addVsValue} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
//                   </div>
//                   {/* <div style={{ overflowY: "auto", flex: 1 }}>
//                     {vs.v.map((val, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
//                         {editVsIdx === i ? (
//                           <>
//                             <input autoFocus value={editVsVal} onChange={(e) => setEditVsVal(e.target.value)}
//                               style={{ flex: 1, padding: "3px 7px", border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 12, outline: "none" }}
//                               onKeyDown={(e) => { if (e.key === "Enter") saveVsEdit(i); }}
//                             />
//                             <button onClick={() => saveVsEdit(i)} style={{ ...S.tealBtn, padding: "3px 8px", fontSize: 11 }}>Save</button>
//                             <button onClick={() => setEditVsIdx(null)} style={{ ...S.secBtn, padding: "3px 8px", fontSize: 11 }}>Cancel</button>
//                           </>
//                         ) : (
//                           <>
//                             <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
//                             <button onClick={() => { setEditVsIdx(i); setEditVsVal(val); }} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏</button>
//                             <button onClick={() => deleteVsValue(i)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>×</button>
//                           </>
//                         )}
//                       </div>
//                     ))}
//                     {vs.v.length === 0 && <div style={{ padding: "20px 11px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No values yet. Add one above.</div>}
//                   </div> */}
//                 </div>
//               );
//             })()}
                                
          
//                                   {(() => {
//                                     const key = optionSourceKey(selField);
//                                     const optionValues = getCachedOptions(selField);
//                                     const selectedIds = new Set((selField.selectedOptionIds ?? []).map(Number));
//                                     const loadingOptions = key ? optionLoadingBySource[key] : false;

//                                     if (loadingOptions) {
//                                       return <div style={{ marginTop: 5, fontSize: 10, color: "#718096" }}>Loading option values...</div>;
//                                     }

//                                     if (optionValues.length === 0) {
//                                       return (
//                                         <div style={{ marginTop: 5, fontSize: 10, color: "#e53e3e" }}>
//                                           No option values found for this field. Select a valid source or create values in the matching value set.
//                                         </div>
//                                       );
//                                     }

//                                     return (
//                                       <div style={{ marginTop: 8 }}>
//                                         <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>options  <span style={{ color: "#e53e3e" }}>*</span></label>
//                                         <div style={{ padding: "6px 8px", background: "#f0faf8", borderRadius: 4, border: "1px solid rgba(29,184,152,.2)", maxHeight: 160, overflowY: "auto" }}>
//                                           {optionValues.map((option) => (
//                                             <label key={option.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px", fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
//                                               <input
//                                                 type="checkbox"
//                                                 checked={selectedIds.has(option.id)}
//                                                 onChange={() => toggleFieldOption(selField, option.id)}
//                                                 style={{ accentColor: TEAL, width: 13, height: 13 }}
//                                               />
//                                               <span>{option.name}</span>
//                                             </label>
//                                           ))}
//                                           <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{selectedIds.size} selected</div>
//                                         </div>
//                                       </div>
//                                     );
//                                   })()}
//                                 </div>
//                             )}




// {Number(selField.controlTypeId) === 9 && (  
//                                 <div style={{ marginBottom: 12 }}>
                                

//                                                        {selVS && (() => {
//               const vs = valueSets.find((v) => v.id === selVS);
//               if (!vs) return null;
//               return (
//                 <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
//                   <div style={S.cardHeader}>
//                     <span style={S.cardTitle}>{vs.n}</span>
//                     <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
//                   </div>
//                   <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
//                     <input value={newVsVal} onChange={(e) => setNewVsVal(e.target.value)}
//                       placeholder="Add value..."
//                       style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
//                       onKeyDown={(e) => { if (e.key === "Enter") addVsValue(); }}
//                     />
//                     <button onClick={addVsValue} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
//                   </div>
//                   {/* <div style={{ overflowY: "auto", flex: 1 }}>
//                     {vs.v.map((val, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
//                         {editVsIdx === i ? (
//                           <>
//                             <input autoFocus value={editVsVal} onChange={(e) => setEditVsVal(e.target.value)}
//                               style={{ flex: 1, padding: "3px 7px", border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 12, outline: "none" }}
//                               onKeyDown={(e) => { if (e.key === "Enter") saveVsEdit(i); }}
//                             />
//                             <button onClick={() => saveVsEdit(i)} style={{ ...S.tealBtn, padding: "3px 8px", fontSize: 11 }}>Save</button>
//                             <button onClick={() => setEditVsIdx(null)} style={{ ...S.secBtn, padding: "3px 8px", fontSize: 11 }}>Cancel</button>
//                           </>
//                         ) : (
//                           <>
//                             <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
//                             <button onClick={() => { setEditVsIdx(i); setEditVsVal(val); }} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏</button>
//                             <button onClick={() => deleteVsValue(i)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>×</button>
//                           </>
//                         )}
//                       </div>
//                     ))}
//                     {vs.v.length === 0 && <div style={{ padding: "20px 11px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No values yet. Add one above.</div>}
//                   </div> */}
//                 </div>
//               );
//             })()}
          
//                                   {(() => {
//                                     const key = optionSourceKey(selField);
//                                     const optionValues = getCachedOptions(selField);
//                                     const selectedIds = new Set((selField.selectedOptionIds ?? []).map(Number));
//                                     const loadingOptions = key ? optionLoadingBySource[key] : false;

//                                     if (loadingOptions) {
//                                       return <div style={{ marginTop: 5, fontSize: 10, color: "#718096" }}>Loading option values...</div>;
//                                     }

//                                     if (optionValues.length === 0) {
//                                       return (
//                                         <div style={{ marginTop: 5, fontSize: 10, color: "#e53e3e" }}>
//                                           No option values found for this field. Select a valid source or create values in the matching value set.
//                                         </div>
//                                       );
//                                     }

//                                     return (
//                                       <div style={{ marginTop: 8 }}>
//                                         <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 4 }}>options  <span style={{ color: "#e53e3e" }}>*</span></label>
//                                         <div style={{ padding: "6px 8px", background: "#f0faf8", borderRadius: 4, border: "1px solid rgba(29,184,152,.2)", maxHeight: 160, overflowY: "auto" }}>
//                                           {optionValues.map((option) => (
//                                             <label key={option.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 2px", fontSize: 11, color: "#4a5568", cursor: "pointer" }}>
//                                               <input
//                                                 type="checkbox"
//                                                 checked={selectedIds.has(option.id)}
//                                                 onChange={() => toggleFieldOption(selField, option.id)}
//                                                 style={{ accentColor: TEAL, width: 13, height: 13 }}
//                                               />
//                                               <span>{option.name}</span>
//                                             </label>
//                                           ))}
//                                           <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{selectedIds.size} selected</div>
//                                         </div>
//                                       </div>
//                                     );
//                                   })()}
//                                 </div>
//                             )}





//                   {/* {selField.t === "photo" && (
//                     <div style={{ marginBottom: 12 }}>
//                       <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 6 }}>Photo Options</label>
//                       <Toggle on={!!selField.embossed} onToggle={() => updateField(selField.id, { embossed: !selField.embossed })} label="Emboss geotag on image" sub="Coordinates printed on photo" />
//                       <Toggle on={!!selField.multiPhoto} onToggle={() => updateField(selField.id, { multiPhoto: !selField.multiPhoto })} label="Allow multiple photos" />
//                       <Toggle on={!!selField.frontCam} onToggle={() => updateField(selField.id, { frontCam: !selField.frontCam })} label="Allow front camera" />
//                     </div>
//                   )}

//                   {selField.t === "location" && (
//                     <div style={{ marginBottom: 12 }}>
//                       <label style={{ fontSize: 10, color: "#718096", display: "block", marginBottom: 6 }}>GPS Settings</label>
//                       <Toggle on={!!selField.showAcc} onToggle={() => updateField(selField.id, { showAcc: !selField.showAcc })} label="Show accuracy radius" />
//                       <Toggle on={!!selField.extGPS} onToggle={() => updateField(selField.id, { extGPS: !selField.extGPS })} label="Allow DGPS/external device" sub="Arrow, Catalyst, Trimble via BT" />
//                       <Toggle on={!!selField.mapCap} onToggle={() => updateField(selField.id, { mapCap: !selField.mapCap })} label="Show map on capture" />
//                     </div>
//                   )} */}

//                   <div style={{ fontSize: 10, color: "#718096", marginBottom: 8 }}>Settings</div>
//                   <Toggle on={selField.r} onToggle={() => updateField(selField.id, { r: !selField.r })} label="Required" sub="Field must be filled" />

//                   <button
//                     onClick={() => deleteField(selField.id)}
//                     style={{ width: "100%", padding: 7, background: "#fff", border: "1px solid #fecaca", color: "#e53e3e", borderRadius: 4, fontSize: 11, marginTop: 8, cursor: "pointer" }}
//                   >
//                     Delete Field
//                   </button>
//                 </div>
//               ) : (
//                 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, color: "#94a3b8", textAlign: "center", gap: 8, padding: 20 }}>
//                   <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" /><line x1="7" y1="16" x2="10" y2="16" /></svg>
//                   <span style={{ fontSize: 12 }}>Select a field to edit</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {tab === "vs" && (
//           <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: 12, padding: 14, height: "100%", overflowY: "auto" }}>
//             {/* Value Set List */}
//             <div style={{ ...S.card, display: "flex", flexDirection: "column", height: "fit-content" }}>
//               <div style={{ ...S.cardHeader, justifyContent: "space-between" }}>
//                 <span style={S.cardTitle}>Value Sets </span>
//               </div>
//               {/* <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
//                 <input value={newVsName} onChange={(e) => setNewVsName(e.target.value)} placeholder="New set name..."
//                   style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none", color: "#2d3748" }}
//                   onKeyDown={(e) => { if (e.key === "Enter") addValueSet(); }}
//                 />
//                 <button onClick={addValueSet} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
//               </div> */}
//               <div style={{ overflowY: "auto", flex: 1 }}>
//                 {valueSets.map((vs) => (
//                   <div key={vs.id} onClick={() => setSelVS(vs.id)}
//                     style={{ padding: "8px 11px", cursor: "pointer", borderBottom: "1px solid #f5f7f9", borderLeft: `3px solid ${selVS === vs.id ? TEAL : "transparent"}`, background: selVS === vs.id ? "#f0faf8" : "transparent" }}>
//                     <div style={{ fontSize: 12, color: "#374151" }}>{vs.n}</div>
//                     <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{vs.v.length} values</div>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Value Set Detail */}
//             {selVS && (() => {
//               const vs = valueSets.find((v) => v.id === selVS);
//               if (!vs) return null;
//               return (
//                 <div style={{ ...S.card, display: "flex", flexDirection: "column" }}>
//                   <div style={S.cardHeader}>
//                     <span style={S.cardTitle}>{vs.n}</span>
//                     <span style={{ fontSize: 10, color: "#94a3b8" }}>{vs.v.length} values</span>
//                   </div>
//                   <div style={{ padding: "7px 10px", borderBottom: "1px solid #edf0f3", display: "flex", gap: 5 }}>
//                     <input value={newVsVal} onChange={(e) => setNewVsVal(e.target.value)}
//                       placeholder="Add value..."
//                       style={{ flex: 1, padding: "5px 8px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 11, outline: "none" }}
//                       onKeyDown={(e) => { if (e.key === "Enter") addVsValue(); }}
//                     />
//                     <button onClick={addVsValue} style={{ ...S.tealBtn, padding: "5px 10px", fontSize: 11 }}>Add</button>
//                   </div>
//                   <div style={{ overflowY: "auto", flex: 1 }}>
//                     {vs.v.map((val, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "center", padding: "6px 11px", borderBottom: "1px solid #f5f7f9", gap: 8 }}>
//                         {editVsIdx === i ? (
//                           <>
//                             <input autoFocus value={editVsVal} onChange={(e) => setEditVsVal(e.target.value)}
//                               style={{ flex: 1, padding: "3px 7px", border: `1px solid ${TEAL}`, borderRadius: 3, fontSize: 12, outline: "none" }}
//                               onKeyDown={(e) => { if (e.key === "Enter") saveVsEdit(i); }}
//                             />
//                             <button onClick={() => saveVsEdit(i)} style={{ ...S.tealBtn, padding: "3px 8px", fontSize: 11 }}>Save</button>
//                             <button onClick={() => setEditVsIdx(null)} style={{ ...S.secBtn, padding: "3px 8px", fontSize: 11 }}>Cancel</button>
//                           </>
//                         ) : (
//                           <>
//                             <span style={{ flex: 1, fontSize: 12, color: "#374151" }}>{val}</span>
//                             <button onClick={() => { setEditVsIdx(i); setEditVsVal(val); }} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏</button>
//                             <button onClick={() => deleteVsValue(i)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "2px 7px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>×</button>
//                           </>
//                         )}
//                       </div>
//                     ))}
//                     {vs.v.length === 0 && <div style={{ padding: "20px 11px", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>No values yet. Add one above.</div>}
//                   </div>
//                 </div>
//               );
//             })()}
//           </div>
//         )}

//         {tab === "prev" && (
//           <div style={{ overflowY: "auto", padding: 14 }}>
//             {/* Mobile preview */}
//             <div style={{ maxWidth: 400, margin: "0 auto" }}>
//               {/* Page selector */}
//               <div style={{ display: "flex", gap: 6, marginBottom: 12, justifyContent: "center" }}>
//                 {pages.map((p, i) => (
//                   <button key={p.id} onClick={() => setPrevPg(p.id)}
//                     style={{ padding: "5px 12px", border: `1px solid ${prevPg === p.id ? TEAL : "#e2e6ea"}`, borderRadius: 16, fontSize: 11, background: prevPg === p.id ? TEAL : "#fff", color: prevPg === p.id ? "#fff" : "#374151", cursor: "pointer" }}>
//                     Step {i + 1}
//                   </button>
//                 ))}
//               </div>
//               {/* Phone mockup */}
//               <div style={{ border: "8px solid #1a2740", borderRadius: 24, padding: 12, background: "#f8fafc", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
//                 <div style={{ height: 3, background: TEAL, borderRadius: 2, marginBottom: 10 }} />
//                 <div style={{ fontSize: 11, fontWeight: 600, color: "#1a2740", marginBottom: 8 }}>{pgName(prevPg)}</div>
//                 {pgFields(prevPg).map((f) => (
//                   <div key={f.id} style={{ marginBottom: 10 }}>
//                     {f.t === "section" ? (
//                       <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
//                         <div style={{ flex: 1, height: 1, background: "#e2e6ea" }} />
//                         <span style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{f.l}</span>
//                         <div style={{ flex: 1, height: 1, background: "#e2e6ea" }} />
//                       </div>
//                     ) : (
//                       <>
//                         <label style={{ fontSize: 10, color: "#374151", display: "block", marginBottom: 3 }}>
//                           {f.l}{f.r && <span style={{ color: "#e53e3e" }}> *</span>}
//                         </label>
//                         {f.t === "dropdown" ? (
//                           <select style={{ ...S.sel, fontSize: 12, padding: "5px 8px" }}>
//                             <option>-- Select --</option>
//                             {selectedOptionsForField(f).map((opt) => (
//                               <option key={opt.id}>{opt.name}</option>
//                             ))}
//                           </select>
//                         ) : f.t === "radio" ? (
//                           <div style={{ display: "flex", gap: 12, padding: "2px 0" }}>
//                             {(valueSets.find((v) => v.id === f.vs)?.v ?? ["Option 1", "Option 2"]).map((opt) => (
//                               <label key={opt} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
//                                 <input type="radio" name={`prev_${f.id}`} style={{ accentColor: TEAL }} /> {opt}
//                               </label>
//                             ))}
//                           </div>
//                         ) : f.t === "checkbox" ? (
//                           <div style={{ display: "flex", gap: 12, padding: "2px 0" }}>
//                             {(valueSets.find((v) => v.id === f.vs)?.v ?? ["Option 1", "Option 2"]).map((opt) => (
//                               <label key={opt} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
//                                 <input type="checkbox" style={{ accentColor: TEAL }} /> {opt}
//                               </label>
//                             ))}
//                           </div>
//                         ) : f.t === "date" ? (
//                           <input type="date" style={{ ...S.inp, fontSize: 12, padding: "5px 8px" }} />
//                         ) : f.t === "textarea" ? (
//                           <textarea style={{ ...S.inp, fontSize: 12, padding: "5px 8px", minHeight: 60, resize: "none" }} placeholder={f.ph ?? ""} />
//                         ) : f.t === "photo" ? (
//                           <div style={{ border: "2px dashed #d1d5db", borderRadius: 6, padding: "12px 0", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>📷 Tap to capture</div>
//                         ) : f.t === "location" ? (
//                           <div style={{ border: "2px dashed #d1d5db", borderRadius: 6, padding: "12px 0", textAlign: "center", fontSize: 11, color: "#94a3b8" }}>📍 Tap to capture location</div>
//                         ) : f.t === "signature" ? (
//                           <div style={{ border: "1px solid #d1d5db", borderRadius: 6, height: 60, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8" }}>✍ Sign here</div>
//                         ) : (
//                           <input type={f.t === "number" ? "number" : "text"} placeholder={f.ph ?? ""} style={{ ...S.inp, fontSize: 12, padding: "5px 8px" }} />
//                         )}
//                       </>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ─── DYNAMIC COLUMNS ──────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// function DynamicColumnsPage() {
//   const [columns, setColumns] = useState<DynamicColumn[]>([
//     { id: 1, name: "Plot Number", controlTypeId: 1, controlTypeName: "Text Box", carryForward: false, mandatory: true, loadingOCR: false, loadingPrintText: false },
//     { id: 2, name: "Land Use Type", controlTypeId: 2, controlTypeName: "Dropdown", carryForward: true, mandatory: false, loadingOCR: false, loadingPrintText: true },
//     { id: 3, name: "Survey Status", controlTypeId: 3, controlTypeName: "Radio Button", carryForward: false, mandatory: true, loadingOCR: false, loadingPrintText: false },
//   ]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [search, setSearch] = useState("");
//   const [columnName, setColumnName] = useState("");
//   const [controlTypeId, setControlTypeId] = useState(1);
//   const [rcm, setRcm] = useState<RCM>(0);
//   const [loadingOCR, setLoadingOCR] = useState(false);
//   const [loadingPrintText, setLoadingPrintText] = useState(false);
//   const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
//   const [loadingFrom, setLoadingFrom] = useState(2);
//   const [showDdSelect, setShowDdSelect] = useState(false);

//   const openForm = (id?: number) => {
//     if (id) {
//       const col = columns.find((c) => c.id === id);
//       if (col) {
//         setEditId(id);
//         setColumnName(col.name);
//         setControlTypeId(col.controlTypeId);
//         setRcm(col.carryForward ? 1 : col.mandatory ? 2 : 0);
//         setLoadingOCR(col.loadingOCR);
//         setLoadingPrintText(col.loadingPrintText);
//         setOptionValues([
//           { id: 1, name: "Option A", isSelected: true, position: 0, columnId: id, dropDownConfigId: 0 },
//           { id: 2, name: "Option B", isSelected: false, position: 1, columnId: id, dropDownConfigId: 0 },
//         ]);
//       }
//     } else {
//       setEditId(null);
//       setColumnName("");
//       setControlTypeId(1);
//       setRcm(0);
//       setLoadingOCR(false);
//       setLoadingPrintText(false);
//       setOptionValues([]);
//     }
//     setShowDdSelect([2, 3, 9].includes(controlTypeId));
//     setModalOpen(true);
//   };

//   const save = () => {
//     const ctName = CONTROL_TYPES.find((c) => c.value === controlTypeId)?.label ?? "";
//     if (editId) {
//       setColumns((prev) => prev.map((c) => c.id === editId ? { ...c, name: columnName, controlTypeId, controlTypeName: ctName, carryForward: rcm === 1, mandatory: rcm === 2, loadingOCR, loadingPrintText } : c));
//     } else {
//       setColumns((prev) => [...prev, { id: nid(), name: columnName, controlTypeId, controlTypeName: ctName, carryForward: rcm === 1, mandatory: rcm === 2, loadingOCR, loadingPrintText }]);
//     }
//     setModalOpen(false);
//   };

//   const deleteCol = (id: number) => {
//     if (confirm("Delete this column?")) setColumns((prev) => prev.filter((c) => c.id !== id));
//   };

//   const filtered = columns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

//   const handleControlChange = (val: number) => {
//     setControlTypeId(val);
//     setShowDdSelect([2, 3, 9].includes(val));
//     if (val === 2 || val === 3 || val === 9) {
//       setOptionValues([
//         { id: nid(), name: "Option 1", isSelected: false, position: 0, columnId: 0, dropDownConfigId: 0 },
//         { id: nid(), name: "Option 2", isSelected: false, position: 1, columnId: 0, dropDownConfigId: 0 },
//       ]);
//     } else {
//       setOptionValues([]);
//     }
//   };

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>Dynamic Columns </span>
//         </div>
//         <TableToolbar onAdd={() => openForm()} addLabel="Dynamic Column" search={search} onSearch={setSearch} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
//             <thead>
//               <tr>
//                 {["Name", "Control Type", "Carry Forward", "Mandatory", "OCR", "Print Text", "Action"].map((h) => (
//                   <th key={h} style={S.th}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((col, i) => (
//                 <tr key={col.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={S.td}>{col.name}</td>
//                   <td style={S.td}>{col.controlTypeName}</td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.carryForward ? "#e8f7f4" : "#f1f5f9", color: col.carryForward ? TEAL : "#94a3b8" }}>{col.carryForward ? "Yes" : "No"}</span></td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.mandatory ? "#fff1f0" : "#f1f5f9", color: col.mandatory ? "#e53e3e" : "#94a3b8" }}>{col.mandatory ? "Yes" : "No"}</span></td>
//                   <td style={S.td}>{col.loadingOCR ? "✓" : "—"}</td>
//                   <td style={S.td}>{col.loadingPrintText ? "✓" : "—"}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button onClick={() => openForm(col.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit</button>
//                       <button onClick={() => deleteCol(col.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={columns.length} showing={filtered.length} />
//       </div>

//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Dynamic Column" : "Add Dynamic Column "}>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Column Name</label>
//           <input style={S.inp} value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Enter column name" />
//         </div>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Control Type</label>
//           <select style={S.sel} value={controlTypeId} onChange={(e) => handleControlChange(Number(e.target.value))}>
//             {CONTROL_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
//           </select>
//         </div>
//         {showDdSelect && (
//           <div style={{ marginBottom: 14 }}>
//             <label style={S.lbl}>Choose Data From</label>
//             <select style={S.sel} value={loadingFrom} onChange={(e) => setLoadingFrom(Number(e.target.value))}>
//               <option value={1}>Master Data</option>
//               <option value={2}>Custom Values</option>
//             </select>
//           </div>
//         )}
//         {optionValues.length > 0 && (
//           <div style={{ marginBottom: 14 }}>
//             <label style={S.lbl}>Option Values</label>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr>
//                   {["Select", "Name", "Position"].map((h) => <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {optionValues.map((opt, i) => (
//                   <tr key={opt.id} style={{ background: opt.isSelected ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                     <td style={{ ...S.td, width: 50 }}>
//                       <input type="checkbox" checked={opt.isSelected}
//                         onChange={() => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, isSelected: !o.isSelected } : o))}
//                         style={{ accentColor: TEAL, width: 14, height: 14 }} />
//                     </td>
//                     <td style={{ ...S.td, color: opt.isSelected ? "#1a5c48" : "#374151" }}>{opt.name}</td>
//                     <td style={S.td}>
//                       <input type="number" value={opt.position}
//                         onChange={(e) => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, position: Number(e.target.value) } : o))}
//                         style={{ width: 70, padding: "3px 6px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12 }} />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//         <div style={{ marginBottom: 14 }}>
//           <label style={{ ...S.lbl, marginBottom: 8 }}>Options</label>
//           <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
//             {([{ v: 0, l: "None" }, { v: 1, l: "Carry Forward" }, { v: 2, l: "Mandatory" }] as { v: RCM; l: string }[]).map(({ v, l }) => (
//               <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//                 <input type="radio" name="rcm" value={v} checked={rcm === v} onChange={() => setRcm(v)} style={{ accentColor: TEAL }} /> {l}
//               </label>
//             ))}
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
//           <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//             <input type="checkbox" checked={loadingOCR} onChange={(e) => setLoadingOCR(e.target.checked)} style={{ accentColor: TEAL }} /> OCR Field
//           </label>
//           <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//             <input type="checkbox" checked={loadingPrintText} onChange={(e) => setLoadingPrintText(e.target.checked)} style={{ accentColor: TEAL }} /> Print Text
//           </label>
//         </div>
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
//           <button onClick={save} style={S.tealBtn}>Save</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ─── TASK PAGE ────────────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// function TaskPage() {
//   const [tasks, setTasks] = useState<Task[]>([
//     { id: 1, name: "Field Survey", markerPath: "pin_green", uom: "Unit", taskType: "Survey", progress: 10, locationSelection: true },
//     { id: 2, name: "Infrastructure Inspection", markerPath: "pin_blue", uom: "KM", taskType: "Inspection", progress: 25, locationSelection: false },
//   ]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [search, setSearch] = useState("");
//   const [taskName, setTaskName] = useState("");
//   const [markerPath, setMarkerPath] = useState("");
//   const [uom, setUom] = useState(UOM_OPTIONS[0]);
//   const [taskType, setTaskType] = useState(TASK_TYPES[0]);
//   const [progress, setProgress] = useState(0);
//   const [locationSelection, setLocationSelection] = useState(false);
//   const [dynamicColumns] = useState([
//     { id: 1, name: "Plot Number", controlTypeId: 1, taskSelected: true, globalName: false, sectionTitle: "Basic Info", sectionNo: 1, pageNo: 1 },
//     { id: 2, name: "Land Use Type", controlTypeId: 2, taskSelected: false, globalName: false, sectionTitle: "", sectionNo: 1, pageNo: 1 },
//     { id: 3, name: "Survey Status", controlTypeId: 3, taskSelected: true, globalName: true, sectionTitle: "Status", sectionNo: 2, pageNo: 2 },
//   ]);
//   const [dcRows, setDcRows] = useState(dynamicColumns.map((c) => ({ ...c })));

//   const openForm = (id?: number) => {
//     if (id) {
//       const task = tasks.find((t) => t.id === id);
//       if (task) {
//         setEditId(id);
//         setTaskName(task.name);
//         setMarkerPath(task.markerPath);
//         setUom(task.uom);
//         setTaskType(task.taskType);
//         setProgress(task.progress);
//         setLocationSelection(task.locationSelection);
//       }
//     } else {
//       setEditId(null);
//       setTaskName("");
//       setMarkerPath("");
//       setUom(UOM_OPTIONS[0]);
//       setTaskType(TASK_TYPES[0]);
//       setProgress(0);
//       setLocationSelection(false);
//     }
//     setDcRows(dynamicColumns.map((c) => ({ ...c })));
//     setModalOpen(true);
//   };

//   const save = () => {
//     if (!taskName) return alert("Task Name required");
//     if (!progress) return alert("Progress required");
//     const enabledRows = dcRows.filter((r) => r.taskSelected && ![5, 8].includes(r.controlTypeId));
//     const hasGlobal = enabledRows.some((r) => r.globalName);
//     if (enabledRows.length > 0 && !hasGlobal) return alert("Please select one Global Name");

//     if (editId) {
//       setTasks((prev) => prev.map((t) => t.id === editId ? { ...t, name: taskName, markerPath, uom, taskType, progress, locationSelection } : t));
//     } else {
//       setTasks((prev) => [...prev, { id: nid(), name: taskName, markerPath, uom, taskType, progress, locationSelection }]);
//     }
//     setModalOpen(false);
//   };

//   const deleteTask = (id: number) => {
//     if (confirm("Delete this task?")) setTasks((prev) => prev.filter((t) => t.id !== id));
//   };

//   const filtered = tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>Task Management</span>
//         </div>
//         <TableToolbar onAdd={() => openForm()} addLabel="Task" search={search} onSearch={setSearch} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
//             <thead>
//               <tr>
//                 {["Name", "Task Type", "Progress Increment", "Update Location Required", "Action"].map((h) => (
//                   <th key={h} style={S.th}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((task, i) => (
//                 <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={S.td}>{task.name}</td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e8f7f4", color: TEAL }}>{task.taskType}</span></td>
//                   <td style={S.td}>{task.progress}%</td>
//                   <td style={S.td}>{task.locationSelection ? <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>Yes</span> : <span style={{ color: "#94a3b8", fontSize: 11 }}>No</span>}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button onClick={() => openForm(task.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit</button>
//                       <button onClick={() => deleteTask(task.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={tasks.length} showing={filtered.length} />
//       </div>

//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Task" : "Add Task "} wide>
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
//           <div>
//             <label style={S.lbl}>Task Name</label>
//             <input style={S.inp} value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task Name" />
//           </div>
//           <div>
//             <label style={S.lbl}>Marker Path</label>
//             <input style={S.inp} value={markerPath} onChange={(e) => setMarkerPath(e.target.value)} placeholder="e.g. pin_green" />
//           </div>
//           <div>
//             <label style={S.lbl}>UOM</label>
//             <select style={S.sel} value={uom} onChange={(e) => setUom(e.target.value)}>
//               {UOM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
//             </select>
//           </div>
//           <div>
//             <label style={S.lbl}>Task Type</label>
//             <select style={S.sel} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
//               {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
//             </select>
//           </div>
//           <div>
//             <label style={S.lbl}>Progress Increment (%)</label>
//             <input type="number" style={S.inp} value={progress} onChange={(e) => setProgress(Number(e.target.value))} min={0} max={100} />
//           </div>
//         </div>
//         <div style={{ marginBottom: 14 }}>
//           <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
//             <input type="checkbox" checked={locationSelection} onChange={(e) => setLocationSelection(e.target.checked)} style={{ accentColor: TEAL, width: 15, height: 15 }} />
//             User Need To Update Location
//           </label>
//         </div>
//         <hr style={{ border: "none", borderTop: "1px solid #edf0f3", margin: "14px 0" }} />
//         {/* Dynamic Columns sub-table */}
//         <div style={{ fontSize: 11, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Dynamic Columns</div>
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse" }}>
//             <thead>
//               <tr>
//                 {["Select", "Name", "Global Name", "Section Title", "Section No.", "Page No."].map((h) => (
//                   <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dcRows.map((row, i) => {
//                 const showGlobal = ![5, 8].includes(row.controlTypeId);
//                 return (
//                   <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                     <td style={S.td}>
//                       <input type="checkbox" checked={row.taskSelected}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, taskSelected: e.target.checked, globalName: e.target.checked ? r.globalName : false } : r))}
//                         style={{ accentColor: TEAL, width: 14, height: 14 }} />
//                     </td>
//                     <td style={S.td}>{row.name}</td>
//                     <td style={{ ...S.td, textAlign: "center" }}>
//                       {showGlobal && (
//                         <input type="radio" name="globalTask" checked={row.globalName} disabled={!row.taskSelected}
//                           onChange={() => setDcRows((prev) => prev.map((r) => ({ ...r, globalName: r.id === row.id })))}
//                           style={{ accentColor: TEAL }} />
//                       )}
//                     </td>
//                     <td style={S.td}>
//                       <input type="text" value={row.sectionTitle}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionTitle: e.target.value } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 120 }} />
//                     </td>
//                     <td style={S.td}>
//                       <input type="number" value={row.sectionNo}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionNo: Number(e.target.value) } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
//                     </td>
//                     <td style={S.td}>
//                       <input type="number" value={row.pageNo}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, pageNo: Number(e.target.value) } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
//           <button onClick={save} style={S.tealBtn}>Save Task</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ─── DROPDOWN / RADIO / CHECKBOX VALUES ──────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// function SimpleValuePage({ title, addLabel }: { title: string; addLabel: string }) {
//   const [items, setItems] = useState<{ id: number; name: string }[]>([
//     { id: 1, name: "Active" },
//     { id: 2, name: "Inactive" },
//     { id: 3, name: "Pending" },
//   ]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [name, setName] = useState("");
//   const [search, setSearch] = useState("");

//   const openForm = (id?: number) => {
//     if (id) {
//       setEditId(id);
//       setName(items.find((i) => i.id === id)?.name ?? "");
//     } else {
//       setEditId(null);
//       setName("");
//     }
//     setModalOpen(true);
//   };

//   const save = () => {
//     if (editId) {
//       setItems((prev) => prev.map((i) => i.id === editId ? { ...i, name } : i));
//     } else {
//       setItems((prev) => [...prev, { id: nid(), name }]);
//     }
//     setModalOpen(false);
//   };

//   const del = (id: number) => {
//     if (confirm("Delete this item?")) setItems((prev) => prev.filter((i) => i.id !== id));
//   };

//   const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>{title}</span>
//         </div>
//         <TableToolbar onAdd={() => openForm()} addLabel={addLabel} search={search} onSearch={setSearch} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse" }}>
//             <thead>
//               <tr>
//                 {["#", "Name", "Action"].map((h) => <th key={h} style={S.th}>{h}</th>)}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((item, i) => (
//                 <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={{ ...S.td, width: 40 }}>{i + 1}</td>
//                   <td style={S.td}>{item.name}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button onClick={() => openForm(item.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>✏ Edit </button>
//                       <button onClick={() => del(item.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>🗑</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={items.length} showing={filtered.length} />
//       </div>
//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `Edit ${addLabel}` : `Add ${addLabel}`}>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Name</label>
//           <input style={S.inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${addLabel} name`} />
//         </div>
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn}>Cancel</button>
//           <button onClick={save} style={S.tealBtn}>Save</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// // ═══════════════════════════════════════════════════════════════════════════════
// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// // ═══════════════════════════════════════════════════════════════════════════════
// function ApiSimpleValuePage({ title, addLabel, endpoint }: { title: string; addLabel: string; endpoint: string }) {
//   const [items, setItems] = useState<{ id: number; name: string }[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [name, setName] = useState("");
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   const loadData = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const data = await apiJson(endpoint);
//       setItems(asArray(data).map((item: any) => ({
//         id: Number(item.Id ?? item.id ?? 0),
//         name: String(item.Name ?? item.name ?? ""),
//       })));
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadData();
//   }, [endpoint]);

//   const openForm = async (id?: number) => {
//     setError("");

//     if (!id) {
//       setEditId(null);
//       setName("");
//       setModalOpen(true);
//       return;
//     }

//     try {
//       const data = await apiJson(`${endpoint}?id=${id}`);
//       setEditId(Number(data.Id ?? data.id ?? id));
//       setName(String(data.Name ?? data.name ?? ""));
//       setModalOpen(true);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load item");
//     }
//   };

//   const save = async () => {
//     if (!name.trim()) {
//       setError(`${addLabel} name is required`);
//       return;
//     }

//     setSaving(true);
//     setError("");
//     try {
//       await apiJson(endpoint, {
//         method: "POST",
//         body: JSON.stringify({ Id: editId ?? 0, Name: name.trim() }),
//       });
//       setModalOpen(false);
//       await loadData();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const del = async (id: number) => {
//     if (!confirm("Delete this item?")) return;

//     setSaving(true);
//     setError("");
//     try {
//       await apiJson(`${endpoint}?id=${id}`, { method: "DELETE" });
//       await loadData();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Delete failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>{title}</span>
//         </div>
//         <TableToolbar onAdd={() => openForm()} addLabel={addLabel} search={search} onSearch={setSearch} />
//         <StatusLine loading={loading} saving={saving} error={error} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse" }}>
//             <thead>
//               <tr>
//                 {["#", "Name", "Action"].map((h) => <th key={h} style={S.th}>{h}</th>)}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((item, i) => (
//                 <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={{ ...S.td, width: 40 }}>{i + 1}</td>
//                   <td style={S.td}>{item.name}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button onClick={() => openForm(item.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>Edit</button>
//                       <button onClick={() => del(item.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {!loading && filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={3} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={items.length} showing={filtered.length} />
//       </div>
//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? `Edit ${addLabel}` : `Add ${addLabel}`}>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Name</label>
//           <input style={S.inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={`Enter ${addLabel} name`} />
//         </div>
//         {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
//           <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// function ApiDynamicColumnsPage() {
//   const [columns, setColumns] = useState<DynamicColumn[]>([]);
//   const [controlTypeOptions, setControlTypeOptions] = useState<LookupOption[]>(DEFAULT_CONTROL_TYPE_OPTIONS);
//   const [loadingFromOptions, setLoadingFromOptions] = useState<LookupOption[]>(DEFAULT_LOADING_FROM);
//   const [masterDataOptions, setMasterDataOptions] = useState<LookupOption[]>([]);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [search, setSearch] = useState("");
//   const [columnName, setColumnName] = useState("");
//   const [controlTypeId, setControlTypeId] = useState(1);
//   const [rcm, setRcm] = useState<RCM>(0);
//   const [loadingOCR, setLoadingOCR] = useState(false);
//   const [loadingPrintText, setLoadingPrintText] = useState(false);
//   const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
//   const [loadingFrom, setLoadingFrom] = useState("2");
//   const [loadingData, setLoadingData] = useState("0");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   const loadColumns = async () => {
//     setLoading(true);
//     setError("");
//     try {
    
//       const data = await apiJson("/api/formbuilder/dynamic-columns");
//       // console.log("Loaded columns:", data);
//       setColumns(asArray(data).map(normalizeDynamicColumn));
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load dynamic columns");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadColumns();

//     async function loadLookups() {
//       const [controlTypes, loadingFroms, masterData] = await Promise.allSettled([
//         apiJson("/api/formbuilder/lookups?type=control-types"),
//         apiJson("/api/formbuilder/lookups?type=loading-from"),
//         apiJson("/api/formbuilder/lookups?type=master-data"),
//       ]);

//       if (controlTypes.status === "fulfilled") setControlTypeOptions(toLookupOptions(controlTypes.value, DEFAULT_CONTROL_TYPE_OPTIONS));
//       if (loadingFroms.status === "fulfilled") setLoadingFromOptions(toLookupOptions(loadingFroms.value, DEFAULT_LOADING_FROM));
//       if (masterData.status === "fulfilled") setMasterDataOptions(toLookupOptions(masterData.value));
//     }

//     loadLookups();
//   }, []);

//   const loadOptionValues = async (columnId: number, typeId: number, loadingFromValue = loadingFrom) => {
//     const type = typeId === 2 ? "dropdown" : typeId === 3 ? "radio" : typeId === 9 ? "checkbox" : "";

//     if (!type || (type === "dropdown" && loadingFromValue !== "2")) {
//       setOptionValues([]);
//       return;
//     }

//     const data = await apiJson(`/api/formbuilder/dynamic-column-options?type=${type}&id=${columnId || 0}`);
//     setOptionValues(asArray(data).map(normalizeOptionValue));
//   };

//   const openForm = async (id?: number) => {
//     setError("");

//     if (!id) {
//       setEditId(null);
//       setColumnName("");
//       setControlTypeId(1);
//       setRcm(0);
//       setLoadingOCR(false);
//       setLoadingPrintText(false);
//       setLoadingFrom("2");
//       setLoadingData("0");
//       setOptionValues([]);
//       setModalOpen(true);
//       return;
//     }

//     setSaving(true);
//     try {
//       const data = await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`);
//       const column = normalizeDynamicColumn(data);
//       setEditId(column.id);
//       setColumnName(column.name);
//       setControlTypeId(column.controlTypeId);
//       setRcm(column.carryForward ? 1 : column.mandatory ? 2 : 0);
//       setLoadingOCR(column.loadingOCR);
//       setLoadingPrintText(column.loadingPrintText);
//       setLoadingFrom(column.loadingFrom || "2");
//       setLoadingData(column.loadingData || "0");
//       setModalOpen(true);
//       await loadOptionValues(column.id, column.controlTypeId, column.loadingFrom || "2");
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load column");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleControlChange = async (value: number) => {
//     setControlTypeId(value);
//     setError("");
//     try {
//       await loadOptionValues(editId ?? 0, value, loadingFrom);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load option values");
//     }
//   };

//   const handleLoadingFromChange = async (value: string) => {
//     setLoadingFrom(value);
//     setError("");
//     try {
//       await loadOptionValues(editId ?? 0, controlTypeId, value);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load option values");
//     }
//   };

//   const save = async () => {
//     if (!columnName.trim()) {
//       setError("Column Name cannot be empty");
//       return;
//     }
//     if (controlTypeId === 2 && loadingFrom === "0") {
//       setError("Choose Data From");
//       return;
//     }
//     if (controlTypeId === 2 && loadingFrom === "1" && loadingData === "0") {
//       setError("Choose Master Data");
//       return;
//     }

//     const values = optionValues.map((item) => ({
//       Id: item.id,
//       ColumnId: item.columnId,
//       DropDownConfigId: item.dropDownConfigId,
//       Position: item.position,
//       IsSelected: item.isSelected,
//     }));
//     const payload = {
//       Id: editId ?? 0,
//       Name: columnName.trim(),
//       ControlTypeId: controlTypeId,
//       LoadingFrom: loadingFrom,
//       LoadingData: loadingData,
//       LoadingOCR: loadingOCR,
//       LoadingPrintText: loadingPrintText,
//       RCM: rcm,
//       DropDownValues: controlTypeId === 2 ? values : [],
//       RadioButtonValues: controlTypeId === 3 ? values : [],
//       CheckBoxValues: controlTypeId === 9 ? values : [],
//     };

//     setSaving(true);
//     setError("");
//     try {
//         // console.log("Payload:", payload);
//       await apiJson("/api/formbuilder/dynamic-columns", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });
//       setModalOpen(false);
//       await loadColumns();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deleteCol = async (id: number) => {
//     if (!confirm("Delete this column?")) return;

//     setSaving(true);
//     setError("");
//     try {
//       await apiJson(`/api/formbuilder/dynamic-columns?id=${id}`, { method: "DELETE" });
//       await loadColumns();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Delete failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const filtered = columns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
//   const showOptionRows = optionValues.length > 0 && (controlTypeId === 3 || controlTypeId === 9 || (controlTypeId === 2 && loadingFrom === "2"));

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>Dynamic Columns </span>
//         </div>
//         <TableToolbar onAdd={() => openForm()} addLabel="Dynamic Column" search={search} onSearch={setSearch} />
//         <StatusLine loading={loading} saving={saving} error={error} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
//             <thead>
//               <tr>
//                 {["Name", "Control Type", "Carry Forward", "Mandatory", "OCR", "Print Text", "Action"].map((h) => (
//                   <th key={h} style={S.th}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((col, i) => (
//                 <tr key={col.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={S.td}>{col.name}</td>
//                   <td style={S.td}>{col.controlTypeName}</td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.carryForward ? "#e8f7f4" : "#f1f5f9", color: col.carryForward ? TEAL : "#94a3b8" }}>{col.carryForward ? "Yes" : "No"}</span></td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: col.mandatory ? "#fff1f0" : "#f1f5f9", color: col.mandatory ? "#e53e3e" : "#94a3b8" }}>{col.mandatory ? "Yes" : "No"}</span></td>
//                   <td style={S.td}>{col.loadingOCR ? "Yes" : "No"}</td>
//                   <td style={S.td}>{col.loadingPrintText ? "Yes" : "No"}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button onClick={() => openForm(col.id)} style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}>Edit</button>
//                       <button onClick={() => deleteCol(col.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {!loading && filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={columns.length} showing={filtered.length} />
//       </div>
//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Dynamic Column" : "Add Dynamic Column"}>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Column Name</label>
//           <input style={S.inp} value={columnName} onChange={(e) => setColumnName(e.target.value)} placeholder="Enter column name" />
//         </div>
//         <div style={{ marginBottom: 14 }}>
//           <label style={S.lbl}>Control Type</label>
//           <select style={S.sel} value={controlTypeId} onChange={(e) => handleControlChange(Number(e.target.value))}>
//             {controlTypeOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
//           </select>
//         </div>
//         {controlTypeId === 2 && (
//           <div style={{ marginBottom: 14 }}>
//             <label style={S.lbl}>Choose Data From</label>
//             <select style={S.sel} value={loadingFrom} onChange={(e) => handleLoadingFromChange(e.target.value)}>
//               <option value="0">-- Select --</option>
//               {loadingFromOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//             </select>
//           </div>
//         )}
//         {controlTypeId === 2 && loadingFrom === "1" && (
//           <div style={{ marginBottom: 14 }}>
//             <label style={S.lbl}>Master Data</label>
//             <select style={S.sel} value={loadingData} onChange={(e) => setLoadingData(e.target.value)}>
//               <option value="0">-- Select --</option>
//               {masterDataOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//             </select>
//           </div>
//         )}
//         {showOptionRows && (
//           <div style={{ marginBottom: 14 }}>
//             <label style={S.lbl}>Option Values</label>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr>
//                   {["Select", "Name", "Position"].map((h) => <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>)}
//                 </tr>
//               </thead>
//               <tbody>
//                 {optionValues.map((opt, i) => (
//                   <tr key={`${opt.id}-${i}`} style={{ background: opt.isSelected ? "#f0faf8" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                     <td style={{ ...S.td, width: 50 }}>
//                       <input type="checkbox" checked={opt.isSelected}
//                         onChange={() => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, isSelected: !o.isSelected } : o))}
//                         style={{ accentColor: TEAL, width: 14, height: 14 }} />
//                     </td>
//                     <td style={{ ...S.td, color: opt.isSelected ? "#1a5c48" : "#374151" }}>{opt.name}</td>
//                     <td style={S.td}>
//                       <input type="number" value={opt.position}
//                         onChange={(e) => setOptionValues((prev) => prev.map((o) => o.id === opt.id ? { ...o, position: Number(e.target.value) } : o))}
//                         style={{ width: 70, padding: "3px 6px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12 }} />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//         <div style={{ marginBottom: 14 }}>
//           <label style={{ ...S.lbl, marginBottom: 8 }}>Options</label>
//           <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
//             {([{ v: 0, l: "None" }, { v: 1, l: "Carry Forward" }, { v: 2, l: "Mandatory" }] as { v: RCM; l: string }[]).map(({ v, l }) => (
//               <label key={v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//                 <input type="radio" name="api-rcm" value={v} checked={rcm === v} onChange={() => setRcm(v)} style={{ accentColor: TEAL }} /> {l}
//               </label>
//             ))}
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
//           <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//             <input type="checkbox" checked={loadingOCR} onChange={(e) => setLoadingOCR(e.target.checked)} style={{ accentColor: TEAL }} /> OCR Field
//           </label>
//           <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#374151" }}>
//             <input type="checkbox" checked={loadingPrintText} onChange={(e) => setLoadingPrintText(e.target.checked)} style={{ accentColor: TEAL }} /> Print Text
//           </label>
//         </div>
//         {error && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 10 }}>{error}</div>}
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
//           <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// function ApiTaskPage({ onEditTask, onCreateTask }: { 
//   onEditTask: (taskName: string, taskId: number) => void;
//   onCreateTask: () => void;
// }){
//   const [tasks, setTasks] = useState<Task[]>([]);
//   const [uomOptions, setUomOptions] = useState<LookupOption[]>(DEFAULT_UOM_OPTIONS);
//   const [taskTypeOptions, setTaskTypeOptions] = useState<LookupOption[]>(DEFAULT_TASK_TYPE_OPTIONS);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editId, setEditId] = useState<number | null>(null);
//   const [search, setSearch] = useState("");
//   const [taskName, setTaskName] = useState("");
//   const [markerPath, setMarkerPath] = useState("0");
//   const [uom, setUom] = useState("0");
//   const [taskType, setTaskType] = useState("0");
//   const [progress, setProgress] = useState(0);
//   const [locationSelection, setLocationSelection] = useState(false);
//   const [dcRows, setDcRows] = useState<TaskDynamicColumn[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   const loadTasks = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const data = await apiJson("/api/formbuilder/tasks");
//       setTasks(asArray(data).map(normalizeTask));
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load tasks");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadTasks();

//     async function loadLookups() {
//       const [uomData, taskTypeData] = await Promise.allSettled([
//         apiJson("/api/formbuilder/lookups?type=uom"),
//         apiJson("/api/formbuilder/lookups?type=task-type"),
//       ]);

//       if (uomData.status === "fulfilled") setUomOptions(toLookupOptions(uomData.value, DEFAULT_UOM_OPTIONS));
//       if (taskTypeData.status === "fulfilled") setTaskTypeOptions(toLookupOptions(taskTypeData.value, DEFAULT_TASK_TYPE_OPTIONS));
//     }

//     loadLookups();
//   }, []);

//   const openForm = async (id?: number) => {
//     setSaving(true);
//     setError("");
//     try {
//       const data = await apiJson(`/api/formbuilder/tasks?id=${id ?? 0}`);
//       const task = normalizeTask(data);
//       setEditId(id ?? null);
//       setTaskName(id ? task.name : "");
//       setMarkerPath(id ? task.markerPath : "0");
//       setUom(id ? task.uom : "0");
//       setTaskType(id ? task.taskType : "0");
//       setProgress(id ? task.progress : 0);
//       setLocationSelection(id ? task.locationSelection : false);
//       setDcRows(asArray(data?.DynamicColumns ?? data?.dynamicColumns).map(normalizeTaskDynamicColumn));
//       setModalOpen(true);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to load task form");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const save = async () => {
//     if (!taskName.trim()) {
//       setError("Task Name required");
//       return;
//     }

//     const enabledRows = dcRows.filter((r) => r.taskSelected && ![5, 8].includes(r.controlTypeId));
//     const hasGlobal = enabledRows.some((r) => r.globalName);
//     if (enabledRows.length > 0 && !hasGlobal) {
//       setError("Please select one Global Name");
//       return;
//     }

//     const payload = {
//       Id: editId ?? 0,
//       Name: taskName.trim(),
//       MarkerPath: markerPath || "0",
//       UOM: uom,
//       TaskType: taskType,
//       Progress: progress,
//       LocationSelection: locationSelection,
//       DynamicColumns: dcRows.map((row, index) => ({
//         Position: index,
//         Id: row.id,
//         TaskAttributeId: row.taskAttributeId,
//         TaskSelected: row.taskSelected,
//         GlobalName: row.globalName,
//         SectionTitle: row.sectionTitle,
//         SectionNo: row.sectionNo,
//         PageNo: row.pageNo,
//       })),
//     };

//     setSaving(true);
//     setError("");
//     try {
//       await apiJson("/api/formbuilder/tasks", {
//         method: "POST",
//         body: JSON.stringify(payload),
//       });
//       setModalOpen(false);
//       await loadTasks();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deleteTask = async (id: number) => {
//     if (!confirm("Delete this task?")) return;

//     setSaving(true);
//     setError("");
//     try {
//       await apiJson(`/api/formbuilder/tasks?id=${id}`, { method: "DELETE" });
//       await loadTasks();
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Delete failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const filtered = tasks.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

//   return (
//     <div style={{ padding: 16 }}>
//       <div style={S.card}>
//         <div style={S.cardHeader}>
//           <span style={S.cardTitle}>Task Management</span>
//         </div>
//         <TableToolbar onAdd={onCreateTask} addLabel="Task" search={search} onSearch={setSearch} />
//         <StatusLine loading={loading} saving={saving} error={error} />
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
//             <thead>
//               <tr>
//                 {["Name", "Task Type", "Progress Increment", "Update Location Required", "Action"].map((h) => (
//                   <th key={h} style={S.th}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {filtered.map((task, i) => (
//                 <tr key={task.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                   <td style={S.td}>{task.name}</td>
//                   <td style={S.td}><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e8f7f4", color: TEAL }}>{lookupLabel(taskTypeOptions, task.taskType)}</span></td>
//                   <td style={S.td}>{task.progress}%</td>
//                   <td style={S.td}>{task.locationSelection ? <span style={{ color: TEAL, fontSize: 11, fontWeight: 600 }}>Yes</span> : <span style={{ color: "#94a3b8", fontSize: 11 }}>No</span>}</td>
//                   <td style={S.td}>
//                     <div style={{ display: "flex", gap: 5 }}>
//                       <button 
//                         onClick={() => onEditTask(task.name, task.id)} 
//                         style={{ border: "1px solid #e2e6ea", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#718096", cursor: "pointer" }}
//                       >
//                         ✏ Edit 
//                       </button>
//                       <button onClick={() => deleteTask(task.id)} style={{ border: "1px solid #fecaca", borderRadius: 3, padding: "3px 8px", background: "none", fontSize: 11, color: "#e53e3e", cursor: "pointer" }}>Delete</button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//               {!loading && filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No data found</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//         <Pagination total={tasks.length} showing={filtered.length} />
//       </div>

//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Task" : "Add Task"} wide>
//         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14, marginBottom: 14 }}>
//           <div>
//             <label style={S.lbl}>Task Name</label>
//             <input style={S.inp} value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Task Name" />
//           </div>
//           <div>
//             <label style={S.lbl}>Marker Path</label>
//             <input style={S.inp} value={markerPath} onChange={(e) => setMarkerPath(e.target.value)} placeholder="e.g. pin_green" />
//           </div>
//           <div>
//             <label style={S.lbl}>UOM</label>
//             <select style={S.sel} value={uom} onChange={(e) => setUom(e.target.value)}>
//               <option value="0">-- Select --</option>
//               {uomOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//             </select>
//           </div>
//           <div>
//             <label style={S.lbl}>Task Type</label>
//             <select style={S.sel} value={taskType} onChange={(e) => setTaskType(e.target.value)}>
//               <option value="0">-- Select --</option>
//               {taskTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
//             </select>
//           </div>
//           <div>
//             <label style={S.lbl}>Progress Increment (%)</label>
//             <input type="number" style={S.inp} value={progress} onChange={(e) => setProgress(Number(e.target.value))} min={0} max={100} />
//           </div>
//         </div>
//         <div style={{ marginBottom: 14 }}>
//           <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
//             <input type="checkbox" checked={locationSelection} onChange={(e) => setLocationSelection(e.target.checked)} style={{ accentColor: TEAL, width: 15, height: 15 }} />
//             User Need To Update Location
//           </label>
//         </div>
//         <hr style={{ border: "none", borderTop: "1px solid #edf0f3", margin: "14px 0" }} />
//         <div style={{ fontSize: 11, fontWeight: 700, color: "#718096", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Dynamic Columns</div>
//         <div style={{ overflowX: "auto" }}>
//           <table style={{ width: "100%", borderCollapse: "collapse" }}>
//             <thead>
//               <tr>
//                 {["Select", "Name", "Global Name", "Section Title", "Section No.", "Page No."].map((h) => (
//                   <th key={h} style={{ ...S.th, fontSize: 10 }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {dcRows.map((row, i) => {
//                 const showGlobal = ![5, 8].includes(row.controlTypeId);
//                 return (
//                   <tr key={`${row.id}-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
//                     <td style={S.td}>
//                       <input type="checkbox" checked={row.taskSelected}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, taskSelected: e.target.checked, globalName: e.target.checked ? r.globalName : false } : r))}
//                         style={{ accentColor: TEAL, width: 14, height: 14 }} />
//                     </td>
//                     <td style={S.td}>{row.name}</td>
//                     <td style={{ ...S.td, textAlign: "center" }}>
//                       {showGlobal && (
//                         <input type="radio" name="api-globalTask" checked={row.globalName} disabled={!row.taskSelected}
//                           onChange={() => setDcRows((prev) => prev.map((r) => ({ ...r, globalName: r.id === row.id })))}
//                           style={{ accentColor: TEAL }} />
//                       )}
//                     </td>
//                     <td style={S.td}>
//                       <input type="text" value={row.sectionTitle}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionTitle: e.target.value } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 120 }} />
//                     </td>
//                     <td style={S.td}>
//                       <input type="number" value={row.sectionNo}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, sectionNo: Number(e.target.value) } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
//                     </td>
//                     <td style={S.td}>
//                       <input type="number" value={row.pageNo}
//                         onChange={(e) => setDcRows((prev) => prev.map((r) => r.id === row.id ? { ...r, pageNo: Number(e.target.value) } : r))}
//                         style={{ padding: "3px 7px", border: "1px solid #e2e6ea", borderRadius: 3, fontSize: 12, width: 60 }} />
//                     </td>
//                   </tr>
//                 );
//               })}
//               {dcRows.length === 0 && (
//                 <tr>
//                   <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#94a3b8" }}>No dynamic columns returned from backend</td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//         {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 10 }}>{error}</div>}
//         <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #edf0f3" }}>
//           <button onClick={() => setModalOpen(false)} style={S.secBtn} disabled={saving}>Cancel</button>
//           <button onClick={save} style={{ ...S.tealBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving..." : "Save Task"}</button>
//         </div>
//       </Modal>
//     </div>
//   );
// }

// // export default function TaskManagementPage() {

// //   const [availableColumns, setAvailableColumns] = useState<any[]>([]);
// // // console.log("availableColumns", availableColumns);
// // useEffect(() => {
// //  async function loadcolumns(){
  
// //   try{
// //    const data = await apiJson("/api/formbuilder/dynamic-columns");
// //   // console.log("Loaded columns:", data);
// //   setAvailableColumns(asArray(data));
// //   } catch(err){
// //     console.error("error loading dynamic coloumns:",err)
// //   }
// //  }
// //  loadcolumns()
// // },[])


// //   const [activePage, setActivePage] = useState<SubPage>("task");
// //   const [builderSeed, setBuilderSeed] = useState<BuilderSeed | undefined>(undefined);

// //   const renderPage = () => {
// //     switch (activePage) {
// //       case "form-builder": return <FormBuilder availableColumns={availableColumns} />;
// //       case "dynamic-columns": return <ApiDynamicColumnsPage />;
// //       case "task": return <ApiTaskPage />;
// //       case "dropdown-values": return <ApiSimpleValuePage title="Dropdown Values" addLabel="Dropdown Value" endpoint="/api/dynamicvalues" />;
// //       case "radio-values": return <ApiSimpleValuePage title="Radio Button Values" addLabel="Radio Value" endpoint="/api/radiobuttonvalues" />;
// //       case "checkbox-values": return <ApiSimpleValuePage title="Checkbox Values" addLabel="Checkbox Value" endpoint="/api/checkboxvalues" />;
 
// //       default: return null;
// //     }
// //   };

// //   return (

// //   <div style={{ display: "flex", flexDirection: "column", height: "100%", fontSize: 13, color: "#2d3748" }}>
// //       {/* Sub-nav bar (tabs styled to match NextAdmin's card/tab pattern) */}
// //       <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 16px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", paddingRight: 16, marginRight: 12, borderRight: "1px solid #e2e6ea" }}>
// //           <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2740", letterSpacing: "0.04em" }}>TASK MANAGEMENT</span>
// //         </div>
// //         {SUBNAV.map(({ id, label }) => {
// //           const on = activePage === id;
// //           return (
// //             <button
// //               key={id}
// //               onClick={() => setActivePage(id)}
// //               style={{
// //                 padding: "11px 14px", border: "none", background: "transparent", fontSize: 12,
// //                 borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
// //                 color: on ? TEAL : "#718096", fontWeight: on ? 600 : 400,
// //                 cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
// //               }}
// //             >
// //               {label}
// //             </button>
// //           );
// //         })}
// //       </div>

// //       {/* Page content */}
// //       <div style={{ flex: 1, overflow: activePage === "form-builder" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
// //         {renderPage()}
// //       </div>
// //     </div>
// //   );
// // }

// // export default function TaskManagementPage() {
// //   // 1. Manage which tab is active (defaulting to "task")
// //   const [activeSubPage, setActiveSubPage] = useState<SubPage>("task");
  
// //   // 2. Manage the data passed to the Form Builder when editing
// //   const [builderSeed, setBuilderSeed] = useState<BuilderSeed | undefined>(undefined);

// //   // 3. Handlers for creating and editing
// //   const handleCreateNewTask = () => {
// //     setBuilderSeed(undefined); // Clear seed for a fresh form
// //     setActiveSubPage("form-builder"); 
// //   };

// //   const handleEditTask = (taskName: string, taskId: number) => {
// //     setBuilderSeed({ formName: taskName, taskId: taskId }); // Pass task data to seed
// //     setActiveSubPage("form-builder"); 
// //   };

// //   return (
// //     <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
// //       {/* Sub-Navigation Tabs */}
// //       <div style={{ display: "flex", gap: "10px", padding: "10px", borderBottom: "1px solid #edf0f3" }}>
// //         {SUBNAV.map((nav) => (
// //           <button 
// //             key={nav.id} 
// //             onClick={() => setActiveSubPage(nav.id)}
// //             style={{ 
// //               fontWeight: activeSubPage === nav.id ? "bold" : "normal",
// //               background: "none", border: "none", cursor: "pointer", padding: "5px 10px"
// //             }}
// //           >
// //             {nav.label}
// //           </button>
// //         ))}
// //       </div>

// //       {/* Render the Task Table View */}
// //       <div style={{ flex: 1, overflowY: "auto" }}>
// //         {activeSubPage === "task" && (
// //           <div>
// //             {/* Pass the create handler down to your toolbar */}
// //             <TableToolbar 
// //               onAdd={handleCreateNewTask} 
// //               addLabel="Task" 
// //               search="" 
// //               onSearch={() => {}} 
// //             />
            
// //             {/* NOTE: Inside your actual Task Data Table below, 
// //                 make sure your "Edit" buttons call:
// //                 onClick={() => handleEditTask(task.name, task.id)} 
// //             */}
// //           </div>
// //         )}

// //         {/* Render the Form Builder View */}
// //         {activeSubPage === "form-builder" && (
// //           <FormBuilder 
// //             seed={builderSeed} 
// //             availableColumns={[]} // Pass dynamic columns if needed
// //             onOpenTasks={() => setActiveSubPage("task")} 
// //           />
// //         )}
// //       </div>
// //     </div>
// //   );
// // }

// // export default function TaskManagementPage() {
// //   const [activeSubPage, setActiveSubPage] = useState<SubPage>("task");
// //   const [builderSeed, setBuilderSeed] = useState<BuilderSeed | undefined>(undefined);
// //   const [availableColumns, setAvailableColumns] = useState<any[]>([]);

// //   // Restores your dynamic columns pre-fetching system
// //   useEffect(() => {
// //     async function loadcolumns(){
// //       try {
// //         const data = await apiJson("/api/formbuilder/dynamic-columns");
// //         setAvailableColumns(asArray(data));
// //       } catch(err){
// //         console.error("error loading dynamic columns:", err)
// //       }
// //     }
// //     loadcolumns();
// //   }, []);

// //   const handleCreateNewTask = () => {
// //     setBuilderSeed(undefined); // Clean canvas for new tasks
// //     setActiveSubPage("form-builder"); 
// //   };

// //   const handleEditTask = (taskName: string, taskId: number) => {
// //     setBuilderSeed({ formName: taskName, taskId: taskId }); // Sets the seed for existing tasks
// //     setActiveSubPage("form-builder"); 
// //   };

// //   return (
// //     <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontSize: 13, color: "#2d3748" }}>
// //       {/* Restores your original NextAdmin navigation tab header style */}
// //       <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 16px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
// //         <div style={{ display: "flex", alignItems: "center", paddingRight: 16, marginRight: 12, borderRight: "1px solid #e2e6ea" }}>
// //           <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2740", letterSpacing: "0.04em" }}>TASK MANAGEMENT</span>
// //         </div>
// //         {SUBNAV.map(({ id, label }) => {
// //           const on = activeSubPage === id;
// //           return (
// //             <button
// //               key={id}
// //               onClick={() => setActiveSubPage(id)}
// //               style={{
// //                 padding: "11px 14px", border: "none", background: "transparent", fontSize: 12,
// //                 borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
// //                 color: on ? TEAL : "#718096", fontWeight: on ? 600 : 400,
// //                 cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
// //               }}
// //             >
// //               {label}
// //             </button>
// //           );
// //         })}
// //       </div>

// //       {/* Dynamic Main Workspace Container */}
// //       <div style={{ flex: 1, overflow: activeSubPage === "form-builder" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        
// //         {/* Render your loaded Api Data table view */}
// //         {activeSubPage === "task" && (
// //           <ApiTaskPage 
// //             onEditTask={handleEditTask} 
// //             onCreateTask={handleCreateNewTask} 
// //           />
// //         )}

// //         {/* Render Form Builder */}
// //         {activeSubPage === "form-builder" && (
// //           <FormBuilder 
// //             seed={builderSeed} 
// //             availableColumns={availableColumns} 
// //             onOpenTasks={() => setActiveSubPage("task")} 
// //           />
// //         )}
// //       </div>
// //     </div>
// //   );
// // }


// export default function TaskManagementPage() {
//   const [activeSubPage, setActiveSubPage] = useState<SubPage>("task");
//   const [builderSeed, setBuilderSeed] = useState<BuilderSeed | undefined>(undefined);
//   const [availableColumns, setAvailableColumns] = useState<any[]>([]);

//   useEffect(() => {
//     async function loadcolumns(){
//       try {
//         const data = await apiJson("/api/formbuilder/dynamic-columns");
//         setAvailableColumns(asArray(data));
//       } catch(err){
//         console.error("error loading dynamic columns:", err)
//       }
//     }
//     loadcolumns();
//   }, []);

//   const handleCreateNewTask = () => {
//     setBuilderSeed(undefined); 
//     setActiveSubPage("form-builder"); 
//   };

//   const handleEditTask = (taskName: string, taskId: number) => {
//     setBuilderSeed({ formName: taskName, taskId: taskId }); 
//     setActiveSubPage("form-builder"); 
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontSize: 13, color: "#2d3748" }}>
//       {/* Native Tab Headers */}
//       <div style={{ background: "#fff", borderBottom: "1px solid #e2e6ea", padding: "0 16px", display: "flex", alignItems: "stretch", overflowX: "auto", flexShrink: 0 }}>
//         <div style={{ display: "flex", alignItems: "center", paddingRight: 16, marginRight: 12, borderRight: "1px solid #e2e6ea" }}>
//           <span style={{ fontSize: 12, fontWeight: 700, color: "#1a2740", letterSpacing: "0.04em" }}>TASK MANAGEMENT</span>
//         </div>
//         {SUBNAV.map(({ id, label }) => {
//           const on = activeSubPage === id;
//           return (
//             <button
//               key={id}
//               onClick={() => setActiveSubPage(id)}
//               style={{
//                 padding: "11px 14px", border: "none", background: "transparent", fontSize: 12,
//                 borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent",
//                 color: on ? TEAL : "#718096", fontWeight: on ? 600 : 400,
//                 cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1,
//               }}
//             >
//               {label}
//             </button>
//           );
//         })}
//       </div>

//       {/* Main Container View Controller */}
//       <div style={{ flex: 1, overflow: activeSubPage === "form-builder" ? "hidden" : "auto", display: "flex", flexDirection: "column" }}>
        
//         {activeSubPage === "task" && (
//           <ApiTaskPage 
//             onEditTask={handleEditTask} 
//             onCreateTask={handleCreateNewTask} 
//           />
//         )}

//         {activeSubPage === "form-builder" && (
//           <FormBuilder 
//             seed={builderSeed} 
//             availableColumns={availableColumns} 
//             onOpenTasks={() => setActiveSubPage("task")} 
//           />
//         )}
//       </div>
//     </div>
//   );
// }



