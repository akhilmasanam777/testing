"use client";

import {
  Download,
  FileJson,
  FileText,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

type RawHierarchyNode = {
  id: string;
  text: string;
  parent: string | null;
  Role: string;
};

type HierarchyNode = {
  id: string;
  name: string;
  role: string;
};

type HierarchyMaps = {
  nodeMap: Record<string, HierarchyNode>;
  parentMap: Record<string, string | null>;
  childrenMap: Record<string, string[]>;
  roots: string[];
};

type ChartRow = {
  id: string;
  parent: string | null;
  name: string;
  role: string;
};

type ExportType = "png" | "pdf" | null;

declare global {
  interface Window {
    google?: any;
    toggleHierarchyCollapse?: (id?: string) => void;
    openHierarchyNode?: (id?: string) => void;
  }
}

const GOOGLE_CHARTS_LOADER = "https://www.gstatic.com/charts/loader.js";
let googleChartsPromise: Promise<void> | null = null;

function loadGoogleCharts() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.visualization?.OrgChart) {
    return Promise.resolve();
  }

  if (googleChartsPromise) {
    return googleChartsPromise;
  }

  googleChartsPromise = new Promise<void>((resolve, reject) => {
    const loadPackage = () => {
      if (!window.google?.charts) {
        reject(new Error("Google Charts loader is not available."));
        return;
      }

      window.google.charts.load("current", { packages: ["orgchart"] });
      window.google.charts.setOnLoadCallback(() => resolve());
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_CHARTS_LOADER}"]`,
    );

    if (existingScript) {
      if (window.google?.charts) {
        loadPackage();
      } else {
        existingScript.addEventListener("load", loadPackage, { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google Charts.")),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_CHARTS_LOADER;
    script.async = true;
    script.onload = loadPackage;
    script.onerror = () => reject(new Error("Failed to load Google Charts."));
    document.body.appendChild(script);
  });

  return googleChartsPromise;
}

function trimStr(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeParent(value: unknown) {
  const parent = trimStr(value);
  return !parent || parent === "0" || parent.toLowerCase() === "null"
    ? null
    : parent;
}

function normalizeHierarchyData(data: unknown): RawHierarchyNode[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray((data as any)?.result)
        ? (data as any).result
        : [];

  return list
    .map((item: any, index: number) => {
      const id = trimStr(item?.id ?? item?.Id ?? item?.ID ?? item?.value);

      return {
        id: id || `temp-${index}`,
        text: trimStr(
          item?.text ?? item?.Text ?? item?.name ?? item?.Name ?? item?.label,
        ),
        parent: normalizeParent(
          item?.parent ?? item?.Parent ?? item?.parentId ?? item?.ParentId,
        ),
        Role: trimStr(
          item?.Role ??
            item?.role ??
            item?.designation ??
            item?.Designation ??
            item?.title ??
            item?.Title,
        ),
      };
    })
    .filter((item: RawHierarchyNode) => item.id);
}

function buildMapsFromRaw(rawData: RawHierarchyNode[]): HierarchyMaps {
  const nodeMap: Record<string, HierarchyNode> = {};
  const parentMap: Record<string, string | null> = {};
  const childrenMap: Record<string, string[]> = {};

  rawData.forEach((node) => {
    const id = String(node.id);
    nodeMap[id] = {
      id,
      name: trimStr(node.text),
      role: trimStr(node.Role),
    };
    parentMap[id] = node.parent ? String(node.parent) : null;
    childrenMap[id] = [];
  });

  Object.keys(nodeMap).forEach((id) => {
    const parent = parentMap[id];
    if (parent && childrenMap[parent]) {
      childrenMap[parent].push(id);
    }
  });

  const roots = Object.keys(nodeMap).filter((id) => {
    const parent = parentMap[id];
    return !parent || !nodeMap[parent];
  });

  return { nodeMap, parentMap, childrenMap, roots };
}

function getAncestors(id: string, parentMap: Record<string, string | null>) {
  const ancestors: string[] = [];
  let parent = parentMap[id];

  while (parent) {
    ancestors.push(parent);
    parent = parentMap[parent];
  }

  return ancestors;
}

function isHiddenByCollapsed(
  id: string,
  parentMap: Record<string, string | null>,
  collapsedNodeIds: Set<string>,
) {
  return getAncestors(id, parentMap).some((ancestor) =>
    collapsedNodeIds.has(ancestor),
  );
}

function buildChartRows(
  maps: HierarchyMaps,
  collapsedNodeIds: Set<string>,
  selectedRole: string,
) {
  const included = new Set<string>();
  const normalizedRole = selectedRole.toLowerCase();

  if (!normalizedRole) {
    Object.keys(maps.nodeMap).forEach((id) => {
      if (!isHiddenByCollapsed(id, maps.parentMap, collapsedNodeIds)) {
        included.add(id);
      }
    });
  } else {
    Object.keys(maps.nodeMap)
      .filter(
        (id) => maps.nodeMap[id].role.toLowerCase() === normalizedRole,
      )
      .forEach((id) => {
        if (!isHiddenByCollapsed(id, maps.parentMap, collapsedNodeIds)) {
          included.add(id);
        }

        getAncestors(id, maps.parentMap).forEach((ancestor) => {
          if (
            !isHiddenByCollapsed(ancestor, maps.parentMap, collapsedNodeIds)
          ) {
            included.add(ancestor);
          }
        });
      });
  }

  const rows: ChartRow[] = [];
  const visit = (id: string) => {
    if (!included.has(id)) {
      return;
    }

    const node = maps.nodeMap[id];
    const parent = maps.parentMap[id];

    rows.push({
      id,
      parent: parent && included.has(parent) ? parent : null,
      name: node.name,
      role: node.role,
    });

    (maps.childrenMap[id] || []).forEach(visit);
  };

  maps.roots.forEach(visit);

  return rows;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function makeNodeHtml(
  id: string,
  name: string,
  role: string,
  hasChildren: boolean,
  isCollapsed: boolean,
) {
  const collapseButton = hasChildren
    ? `<button type="button" class="hierarchy-node-button hierarchy-node-collapse" title="${
        isCollapsed ? "Expand" : "Collapse"
      }" onclick="event.stopPropagation(); window.toggleHierarchyCollapse?.(this.closest('.hierarchy-node-card')?.dataset.nodeId)">${
        isCollapsed ? "+" : "-"
      }</button>`
    : "";

  return `
    <div class="hierarchy-node-card" data-node-id="${escapeHtml(id)}">
      ${collapseButton}
      <div class="hierarchy-node-actions">
        <button type="button" class="hierarchy-node-button" title="Details" onclick="event.stopPropagation(); window.openHierarchyNode?.(this.closest('.hierarchy-node-card')?.dataset.nodeId)">i</button>
      </div>
      <div class="hierarchy-node-role" title="${escapeHtml(role)}">${escapeHtml(
        role,
      )}</div>
      <div class="hierarchy-node-name" title="${escapeHtml(name)}">${escapeHtml(
        name,
      )}</div>
    </div>
  `;
}

function collectSubtreeIds(
  id: string,
  childrenMap: Record<string, string[]>,
  output = new Set<string>(),
) {
  output.add(id);
  (childrenMap[id] || []).forEach((childId) =>
    collectSubtreeIds(childId, childrenMap, output),
  );
  return output;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HierarchyClient() {
  const treeWrapRef = useRef<HTMLDivElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const rowsForChartRef = useRef<string[]>([]);
  const panRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const [rawData, setRawData] = useState<RawHierarchyNode[]>([]);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedRole, setSelectedRole] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalRole, setModalRole] = useState("");
  const [zoom, setZoom] = useState(1);
  const [googleReady, setGoogleReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<ExportType>(null);
  const [isPanning, setIsPanning] = useState(false);

  const maps = useMemo(() => buildMapsFromRaw(rawData), [rawData]);

  const roles = useMemo(() => {
    return Array.from(
      new Set(Object.values(maps.nodeMap).map((node) => node.role).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [maps.nodeMap]);

  const selectedNode = selectedNodeId ? maps.nodeMap[selectedNodeId] : null;

  const openNode = useCallback(
    (id?: string) => {
      if (!id || !maps.nodeMap[id]) {
        return;
      }

      const node = maps.nodeMap[id];
      setSelectedNodeId(id);
      setModalName(node.name);
      setModalRole(node.role);
    },
    [maps.nodeMap],
  );

  useEffect(() => {
    let active = true;

    loadGoogleCharts()
      .then(() => {
        if (active) {
          setGoogleReady(true);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHierarchy() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/hierarchyconfig", {
          credentials: "include",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || "Failed to load hierarchy data.");
        }

        const data = await response.json();

        if (active) {
          setRawData(normalizeHierarchyData(data));
          setCollapsedNodeIds(new Set());
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || "Failed to load hierarchy data.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHierarchy();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.toggleHierarchyCollapse = (id?: string) => {
      if (!id) {
        return;
      }

      setCollapsedNodeIds((current) => {
        const next = new Set(current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

    window.openHierarchyNode = openNode;

    return () => {
      delete window.toggleHierarchyCollapse;
      delete window.openHierarchyNode;
    };
  }, [openNode]);

  useEffect(() => {
    if (!googleReady || loading || !treeRef.current) {
      return;
    }

    if (!rawData.length) {
      treeRef.current.innerHTML = "";
      rowsForChartRef.current = [];
      return;
    }

    const rows = buildChartRows(maps, collapsedNodeIds, selectedRole);
    rowsForChartRef.current = rows.map((row) => row.id);

    if (!rows.length) {
      treeRef.current.innerHTML = "";
      return;
    }

    const google = window.google;
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn("string", "Name");
    dataTable.addColumn("string", "Manager");
    dataTable.addColumn("string", "Tooltip");

    rows.forEach((row) => {
      const hasChildren = (maps.childrenMap[row.id] || []).length > 0;
      const html = makeNodeHtml(
        row.id,
        row.name,
        row.role,
        hasChildren,
        collapsedNodeIds.has(row.id),
      );

      dataTable.addRow([
        { v: row.id, f: html },
        row.parent,
        row.role || row.name,
      ]);
    });

    const chart =
      chartRef.current || new google.visualization.OrgChart(treeRef.current);
    chartRef.current = chart;
    google.visualization.events.removeAllListeners(chart);
    chart.draw(dataTable, { allowHtml: true, allowCollapse: false });

    google.visualization.events.addListener(chart, "select", () => {
      const selection = chart.getSelection();
      const row = selection?.[0]?.row;
      const nodeId = typeof row === "number" ? rowsForChartRef.current[row] : "";
      if (nodeId) {
        openNode(nodeId);
      }
    });

    if (selectedNodeId) {
      const selectedRow = rowsForChartRef.current.indexOf(selectedNodeId);
      if (selectedRow >= 0) {
        chart.setSelection([{ row: selectedRow, column: null }]);
      }
    }
  }, [
    collapsedNodeIds,
    googleReady,
    loading,
    maps,
    openNode,
    rawData.length,
    selectedNodeId,
    selectedRole,
  ]);

  const handleSearch = useCallback(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      setSearchMessage("Enter a name or role to search.");
      return;
    }

    const matches = Object.keys(maps.nodeMap).filter((id) => {
      const node = maps.nodeMap[id];
      return (
        node.name.toLowerCase().includes(term) ||
        node.role.toLowerCase().includes(term)
      );
    });

    if (!matches.length) {
      setSearchMessage("No matching node found.");
      return;
    }

    const firstMatch = matches[0];
    const ancestors = getAncestors(firstMatch, maps.parentMap);

    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      ancestors.forEach((ancestor) => next.delete(ancestor));
      return next;
    });

    if (
      selectedRole &&
      maps.nodeMap[firstMatch].role.toLowerCase() !== selectedRole.toLowerCase()
    ) {
      setSelectedRole("");
    }

    setSelectedNodeId(firstMatch);
    setSearchMessage(
      `${matches.length} match${matches.length === 1 ? "" : "es"} found. Selected ${maps.nodeMap[firstMatch].name || firstMatch}.`,
    );
  }, [maps.nodeMap, maps.parentMap, searchTerm, selectedRole]);

  const collapseAll = useCallback(() => {
    setCollapsedNodeIds(
      new Set(
        Object.keys(maps.childrenMap).filter(
          (id) => maps.childrenMap[id].length > 0,
        ),
      ),
    );
  }, [maps.childrenMap]);

  const expandAll = useCallback(() => {
    setCollapsedNodeIds(new Set());
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setZoom((current) => {
      const next = Math.round((current + delta) * 10) / 10;
      return Math.max(0.2, Math.min(2.5, next));
    });
  }, []);

  const exportJSON = useCallback(() => {
    downloadBlob(
      new Blob([JSON.stringify(rawData, null, 2)], {
        type: "application/json",
      }),
      "hierarchy.json",
    );
  }, [rawData]);

  const exportPNG = useCallback(async () => {
    if (!treeWrapRef.current) {
      return;
    }

    try {
      setExporting("png");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(treeWrapRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, "hierarchy.png");
        }
      }, "image/png");
    } finally {
      setExporting(null);
    }
  }, []);

  const exportPDF = useCallback(async () => {
    if (!treeWrapRef.current) {
      return;
    }

    try {
      setExporting("pdf");
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(treeWrapRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;

      pdf.addImage(
        image,
        "PNG",
        (pageWidth - imageWidth) / 2,
        20,
        imageWidth,
        imageHeight,
      );
      pdf.save("hierarchy.pdf");
    } finally {
      setExporting(null);
    }
  }, []);

  const saveNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    setRawData((current) =>
      current.map((node) =>
        node.id === selectedNodeId
          ? { ...node, text: modalName.trim(), Role: modalRole.trim() }
          : node,
      ),
    );
    setSelectedNodeId(null);
  }, [modalName, modalRole, selectedNodeId]);

  const addChildNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    const newId = `temp-${Math.random().toString(36).slice(2, 9)}`;
    const newNode: RawHierarchyNode = {
      id: newId,
      text: "New Node",
      parent: selectedNodeId,
      Role: "",
    };

    setRawData((current) => [...current, newNode]);
    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      next.delete(selectedNodeId);
      return next;
    });
    setSelectedNodeId(newId);
    setModalName(newNode.text);
    setModalRole(newNode.Role);
  }, [selectedNodeId]);

  const deleteNode = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    if (!window.confirm("Delete this node and all its descendants?")) {
      return;
    }

    const idsToDelete = collectSubtreeIds(selectedNodeId, maps.childrenMap);
    setRawData((current) =>
      current.filter((node) => !idsToDelete.has(String(node.id))),
    );
    setCollapsedNodeIds((current) => {
      const next = new Set(current);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedNodeId(null);
  }, [maps.childrenMap, selectedNodeId]);

  const closeModal = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const beginPan = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !treeWrapRef.current) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    panRef.current = {
      dragging: true,
      startX: event.pageX,
      startY: event.pageY,
      scrollLeft: treeWrapRef.current.scrollLeft,
      scrollTop: treeWrapRef.current.scrollTop,
    };
    setIsPanning(true);
  }, []);

  useEffect(() => {
    const move = (event: MouseEvent) => {
      if (!panRef.current.dragging || !treeWrapRef.current) {
        return;
      }

      const dx = event.pageX - panRef.current.startX;
      const dy = event.pageY - panRef.current.startY;
      treeWrapRef.current.scrollLeft = panRef.current.scrollLeft - dx;
      treeWrapRef.current.scrollTop = panRef.current.scrollTop - dy;
    };

    const stop = () => {
      panRef.current.dragging = false;
      setIsPanning(false);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
  }, []);

  return (
    <div className="hierarchy-page page-container">
      <div className="all-pages-header">
        <h1 className="dashboard-title-light">Hierarchy</h1>
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Info className="size-4" />
          <span>{rawData.length} Nodes</span>
        </div>
      </div>

      <div className="card-container">
        <div className="hierarchy-toolbar">
          <div className="hierarchy-search">
            {/* <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" /> */}
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Search name or role..."
              className="hierarchy-input pl-9"
            />
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="hierarchy-command hierarchy-command-ghost"
            title="Find"
          >
            <Search className="size-4" />
            <span>Find</span>
          </button>

          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            className="hierarchy-input min-w-[180px]"
          >
            <option value="">All Roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSelectedRole("");
              setSearchMessage("");
            }}
            className="hierarchy-command hierarchy-command-ghost"
            title="Clear filter"
          >
            <RotateCcw className="size-4" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="hierarchy-command hierarchy-command-ghost"
            title="Collapse all"
          >
            <Minimize2 className="size-4" />
            <span>Collapse</span>
          </button>

          <button
            type="button"
            onClick={expandAll}
            className="hierarchy-command hierarchy-command-ghost"
            title="Expand all"
          >
            <Maximize2 className="size-4" />
            <span>Expand</span>
          </button>

          <div className="hierarchy-zoom" aria-label="Zoom controls">
            <button
              type="button"
              onClick={() => changeZoom(-0.1)}
              title="Zoom out"
              className="hierarchy-icon-command"
            >
              <ZoomOut className="size-4" />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => changeZoom(0.1)}
              title="Zoom in"
              className="hierarchy-icon-command"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={exportPNG}
            disabled={!!exporting || !rawData.length}
            className="hierarchy-command"
            title="Export PNG"
          >
            {exporting === "png" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={exportPDF}
            disabled={!!exporting || !rawData.length}
            className="hierarchy-command"
            title="Export PDF"
          >
            {exporting === "pdf" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            <span>PDF</span>
          </button>

          <button
            type="button"
            onClick={exportJSON}
            disabled={!rawData.length}
            className="hierarchy-command hierarchy-command-ghost"
            title="Download JSON"
          >
            <FileJson className="size-4" />
            <span>JSON</span>
          </button>
        </div>

        {searchMessage && (
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
            {searchMessage}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <div
          ref={treeWrapRef}
          onMouseDown={beginPan}
          className={`hierarchy-tree-wrap mt-4 ${isPanning ? "is-panning" : ""}`}
        >
          {loading && (
            <div className="hierarchy-state">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span>Loading hierarchy...</span>
            </div>
          )}

          {!loading && !error && !rawData.length && (
            <div className="hierarchy-state">
              <span>No hierarchy data found.</span>
            </div>
          )}

          {!loading &&
            !error &&
            rawData.length > 0 &&
            buildChartRows(maps, collapsedNodeIds, selectedRole).length === 0 && (
              <div className="hierarchy-state">
                <span>No nodes match the selected role.</span>
              </div>
            )}

          <div
            ref={treeRef}
            className="hierarchy-tree"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          />
        </div>
      </div>

      {selectedNode && (
        <div className="modal-overlay">
          <div className="hierarchy-modal">
            <div className="flex items-center justify-between gap-4 border-b border-stroke pb-4 dark:border-dark-3">
              <h2 className="text-base font-semibold text-dark dark:text-white">
                Node: {selectedNode.name || selectedNode.id}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="hierarchy-icon-command"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="form-label">Name</span>
                <input
                  value={modalName}
                  onChange={(event) => setModalName(event.target.value)}
                  className="form-input"
                  placeholder="Name"
                />
              </label>

              <label className="block">
                <span className="form-label">Role</span>
                <input
                  value={modalRole}
                  onChange={(event) => setModalRole(event.target.value)}
                  className="form-input"
                  placeholder="Role"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={deleteNode}
                className="hierarchy-command hierarchy-danger"
              >
                <Trash2 className="size-4" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={addChildNode}
                className="hierarchy-command hierarchy-command-ghost"
              >
                <Plus className="size-4" />
                <span>Add Child</span>
              </button>
              <button type="button" onClick={saveNode} className="hierarchy-command">
                <Save className="size-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hierarchy-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .hierarchy-search {
          position: relative;
          min-width: 220px;
          flex: 1 1 260px;
        }

        .hierarchy-input {
          min-height: 38px;
          width: 100%;
          border-radius: 6px;
          border: 1px solid #d5dce8;
          background: #ffffff;
          padding: 8px 10px;
          font-size: 14px;
          color: #1f2937;
          outline: none;
        }

        .dark .hierarchy-input {
          border-color: #273548;
          background: #111827;
          color: #ffffff;
        }

        .hierarchy-input:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
        }

        .hierarchy-command,
        .hierarchy-icon-command {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 6px;
          border: 1px solid #22c55e;
          background: #22c55e;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          transition:
            background 140ms ease,
            border-color 140ms ease,
            opacity 140ms ease;
        }

        .hierarchy-command:hover,
        .hierarchy-icon-command:hover {
          background: #16a34a;
          border-color: #16a34a;
        }

        .hierarchy-command:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .hierarchy-command-ghost,
        .hierarchy-icon-command {
          border-color: #cdd6e3;
          background: #ffffff;
          color: #1f2937;
        }

        .hierarchy-command-ghost:hover,
        .hierarchy-icon-command:hover {
          border-color: #9cadbf;
          background: #f7f9fc;
        }

        .dark .hierarchy-command-ghost,
        .dark .hierarchy-icon-command {
          border-color: #273548;
          background: #111827;
          color: #ffffff;
        }

        .dark .hierarchy-command-ghost:hover,
        .dark .hierarchy-icon-command:hover {
          background: #172235;
          border-color: #334155;
        }

        .hierarchy-danger {
          border-color: #dc2626;
          background: #dc2626;
        }

        .hierarchy-danger:hover {
          border-color: #b91c1c;
          background: #b91c1c;
        }

        .hierarchy-icon-command {
          width: 38px;
          padding: 8px;
        }

        .hierarchy-zoom {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          gap: 6px;
          border-radius: 6px;
          border: 1px solid #cdd6e3;
          background: #ffffff;
          padding: 0 6px;
          color: #1f2937;
          font-size: 13px;
          font-weight: 700;
        }

        .dark .hierarchy-zoom {
          border-color: #273548;
          background: #111827;
          color: #ffffff;
        }

        .hierarchy-tree-wrap {
          position: relative;
          width: 100%;
          height: min(760px, calc(100vh - 250px));
          min-height: 500px;
          overflow: auto;
          border: 1px solid #e5e9f2;
          background: #ffffff;
          cursor: grab;
        }

        .hierarchy-tree-wrap.is-panning {
          cursor: grabbing;
          user-select: none;
        }

        .dark .hierarchy-tree-wrap {
          border-color: #273548;
          background: #0b1220;
        }

        .hierarchy-tree {
          min-width: 100%;
          min-height: 700px;
          padding: 24px;
          transition: transform 140ms ease;
        }

        .hierarchy-state {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
        }

        .dark .hierarchy-state {
          background: rgba(11, 18, 32, 0.82);
          color: #cbd5e1;
        }

        .hierarchy-page .google-visualization-orgchart-table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        .hierarchy-page .google-visualization-orgchart-node {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .hierarchy-page .google-visualization-orgchart-node-medium {
          font-size: inherit !important;
        }

        .hierarchy-page .google-visualization-orgchart-lineleft {
          border-left: 1px solid #bfd4df !important;
        }

        .hierarchy-page .google-visualization-orgchart-lineright {
          border-right: 1px solid #bfd4df !important;
        }

        .hierarchy-page .google-visualization-orgchart-linebottom {
          border-bottom: 1px solid #bfd4df !important;
        }

        .hierarchy-page .google-visualization-orgchart-linetop {
          border-top: 1px solid #bfd4df !important;
        }

        .hierarchy-node-card {
          position: relative;
          box-sizing: border-box;
          width: 220px;
          min-height: 78px;
          border: 1px solid #b5d9ea;
          border-radius: 8px;
          background: linear-gradient(180deg, #edf7ff, #cde7ee);
          color: #003366;
          padding: 12px 32px 12px 32px;
          text-align: center;
          font-family:
            Satoshi,
            Segoe UI,
            Arial,
            sans-serif;
        }

        .dark .hierarchy-node-card {
          border-color: #31556b;
          background: linear-gradient(180deg, #123047, #173d48);
          color: #e5f4ff;
        }

        .hierarchy-node-role,
        .hierarchy-node-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .hierarchy-node-role {
          color: #cc0000;
          font-size: 12px;
          font-weight: 700;
        }

        .dark .hierarchy-node-role {
          color: #ffb4a8;
        }

        .hierarchy-node-name {
          margin-top: 7px;
          font-size: 15px;
          font-weight: 800;
        }

        .hierarchy-node-actions {
          position: absolute;
          right: 6px;
          top: 6px;
          display: flex;
          gap: 4px;
        }

        .hierarchy-node-button {
          display: inline-flex;
          min-width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.68);
          color: #123047;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }

        .hierarchy-node-button:hover {
          background: #ffffff;
        }

        .hierarchy-node-collapse {
          position: absolute;
          left: 6px;
          top: 6px;
        }

        .hierarchy-modal {
          width: 420px;
          max-width: 94vw;
          border-radius: 8px;
          background: #ffffff;
          padding: 20px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.24);
        }

        .dark .hierarchy-modal {
          background: #111827;
        }

        @media (max-width: 640px) {
          .hierarchy-tree-wrap {
            height: 620px;
            min-height: 420px;
          }

          .hierarchy-toolbar > * {
            flex: 1 1 auto;
          }

          .hierarchy-command {
            padding-left: 10px;
            padding-right: 10px;
          }
        }
      `}</style>
    </div>
  );
}
