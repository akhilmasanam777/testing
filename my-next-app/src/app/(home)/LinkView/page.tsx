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
import { X } from "lucide-react";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { FaSort, FaSortDown, FaSortUp, FaFileAlt, FaDownload } from "react-icons/fa";
import { BoqCards } from "../_components/overview-cards/card";

type Region = {
    [key: string]: any;
};

export default function BoqPage() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [columns, setColumns] = useState<string[]>([]);


    const [openZipModal, setOpenZipModal] = useState(false);
    const [openKmlModal, setOpenKmlModal] = useState(false);
    const [selectedRow, setSelectedRow] = useState<any>(null);

    const [description, setDescription] = useState("");

    const [search, setSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({
        key: "",
        direction: "asc",
    });;

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

    const [openLogModal, setOpenLogModal] = useState(false);
    const [logData, setLogData] = useState<any[]>([]);
    const [logColumns, setLogColumns] = useState<string[]>([]);
    const [selectedBlock, setSelectedBlock] = useState("");
    const [logSearch, setLogSearch] = useState("");


    const [openVersionModal, setOpenVersionModal] = useState(false);
    const [versionData, setVersionData] = useState<any>(null);
    const [selectedVersion, setSelectedVersion] = useState("");
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [openCommentPopup, setOpenCommentPopup] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });

    const [summary, setSummary] = useState<any[]>([]);
    const [totalSummary, setTotalSummary] = useState<any[]>([]);


    async function loadSummary() {
        const res1 = await fetch("/api/boq/summary");
        const data1 = await res1.json();

        console.log("Data :", data1)
        setSummary(data1);

        const res2 = await fetch("/api/boq/summarytotal");
        const data2 = await res2.json();
        console.log("Summary total :", data2)
        setTotalSummary(data2);
    }

    const [zipFile, setZipFile] = useState<File | null>(null);
    const [kmlFile, setKmlFile] = useState<File | null>(null);

    const [formDataState, setFormDataState] = useState<Record<string, any>>({
        zipFile: null,
        version: "",
        noOfGps: "",
        noofParentRings: "",
        noofChildRings: "",
        adss: "",
        desktopLength: "",
        existingPoles: "",
        newPoles: "",
        altTech: "",
        gpNotAvailable: "",
        description: ""
    });

    const handleChange = (e: any) => {
        const { name, value, type, files } = e.target;

        if (type === "file") {
            setFormDataState((prev) => ({
                ...prev,
                [name]: files[0],
            }));
        } else {
            setFormDataState((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    useEffect(() => {
        loadSummary();
        loadData();
    }, []);


    async function loadData() {
        const res = await fetch("/api/boq/regions");
        const data = await res.json();

        setRegions(data);

        setColumns([
            "ZoneName",
            "RegionName",
            "DistrictName",
            "PackageName",
            "NoOfGps",
            "ADSS24F",
            "StatusName",
            "LastchangedDate"
        ]);
    }

    function formatHeader(key: string) {
        const map: any = {
            ZoneName: "Zone",
            RegionName: "Block",
            DistrictName: "District",
            PackageName: "Package",
            NoOfGps: "No Of GPs",
            ADSS24F: "ADSS 24F",
            StatusName: "Status",
            LastchangedDate: "Status Change Date",
        };
        return map[key] || key;
    }

    function formatValue(value: any, key: string) {
        if (key === "LastchangedDate") {
            return new Date(value).toLocaleString();
        }
        return value ?? "-";
    }

    function openSubmitModal(row: any) {
        setSelectedRow(row);
        setOpenZipModal(true);
    }

    function openKml(row: any) {
        setSelectedRow(row);
        setOpenKmlModal(true);
    }

    function closeSubmitModal() {
        setOpenZipModal(false);
        // resetForm();
    }

    function closeKmlitModal() {
        setOpenKmlModal(false);
        // resetForm();
    }

    //  Search & pagination ──
    const filteredData = useMemo(() => {
        return regions.filter((row) =>
            columns.some((col) =>
                String(row[col] || "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            )
        );
    }, [search, columns]);


    //  SORT 
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

    //  PAGINATION 
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

    //  Exports ─
    const exportCSV = () => {
        const csv = regions.map((row) => Object.values(row).join(",")).join("\n");
        saveAs(new Blob([csv]), "gp-data.csv");
    };

    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(regions);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "gp-data.xlsx");
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(regions[0] || {})],
            body: regions.map((row) => Object.values(row)),
        });
        doc.save("gp-data.pdf");
    };

    const copyData = () => {
        navigator.clipboard.writeText(JSON.stringify(regions, null, 2));
        alert("Copied!");
    };

    /* Log Details Modal */

    async function openLog(row: any) {
        setSelectedBlock(row.RegionName);
        setOpenLogModal(true);

        const res = await fetch(`/api/boq/regionlog?requestId=${row.RegionId}`);
        const data = await res.json();

        setLogData(data);

        // ONLY REQUIRED COLUMNS
        setLogColumns([
            "StatusName",
            "CurrentRole",
            "VersionNumber",
            "Username",
            "Comment",
            "Date",
            "NextRole",
            "Filepath"
        ]);
    }

    function formatLogHeader(key: string) {
        const map: any = {
            StatusName: "Status",
            CurrentRole: "Action By",
            VersionNumber: "Version",
            Username: "User",
            Comment: "Remarks",
            Date: "Date",
            NextRole: "Pending With",
            Filepath: "Attachment",
        };

        return map[key] || key;
    }

    function formatLogValue(value: any, key: string) {
        if (key === "Date") {
            return new Date(value).toLocaleString();
        }

        if (key === "Filepath" && value) {
            return (
                <a href={value} target="_blank" className="text-blue-600">
                    Download
                </a>
            );
        }

        if (key === "Comment") {
            return value?.length > 15 ? value.substring(0, 15) + "..." : value;
        }

        return value ?? "-";
    }


    async function openVersion(
        blockId: number,
        version: string,
        event: any
    ) {
        const rect = event.target.getBoundingClientRect();

        setPopupPosition({
            x: rect.left,
            y: rect.bottom + window.scrollY,
        });

        setSelectedVersion(version);
        setOpenVersionModal(true);

        try {
            const res = await fetch(
                `/api/boq/versiondetails?blockId=${blockId}&version=${version}`
            );

            const data = await res.json();

            setVersionData(data);
        } catch (e) {
            console.error(e);
            setVersionData(null);
        }
    }

    function openComment(value: string, event: any) {
        const rect = event.target.getBoundingClientRect();

        setCommentPosition({
            x: rect.left,
            y: rect.bottom + window.scrollY,
        });

        setCommentText(value);
        setOpenCommentPopup(true);
    }

    function handleDownload(path: string) {
        const link = document.createElement("a");
        link.href = path;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    const filteredlogData = useMemo(() => {
        return logData.filter((row) =>
            logColumns.some((col) =>
                String(row[col] || "")
                    .toLowerCase()
                    .includes(logSearch.toLowerCase())
            )
        );
    }, [logSearch, logColumns, logData]);


    //  SORT 
    const sortedlogData = useMemo(() => {
        let arr = [...filteredlogData];

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
    }, [filteredlogData, sortConfig]);


    //  Exports ─
    const exportCSVLog = () => {
        const csv = logData.map((row) => Object.values(row).join(",")).join("\n");
        saveAs(new Blob([csv]), "gp-data.csv");
    };

    const exportExcelLog = () => {
        const ws = XLSX.utils.json_to_sheet(logData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet");
        XLSX.writeFile(wb, "gp-data.xlsx");
    };

    const exportPDFLog = () => {
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(logData[0] || {})],
            body: logData.map((row) => Object.values(row)),
        });
        doc.save("gp-data.pdf");
    };

    const exportCopyLog = () => {
        navigator.clipboard.writeText(JSON.stringify(regions, null, 2));
        alert("Copied!");
    };




    return (
        <div className="page-container">

            <h3 className="mb-2 font-bold">Upto Last Week Summary</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {totalSummary.map((item: any, index: number) => (
                    <BoqCards
                        key={index}
                        label={item.NextRole}
                        value={item.Count}
                    />
                ))}
            </div>

            <h3 className="mb-2 font-bold">Cumulative Summary</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">

                {summary.map((item: any, index: number) => (
                    <BoqCards
                        key={index}
                        value={item.Count}
                        label={item.NextRole}

                    />
                ))}
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                {/* Export buttons */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: "Copy", action: copyData },
                        { label: "CSV", action: exportCSV },
                        { label: "Excel", action: exportExcel },
                        { label: "PDF", action: exportPDF },
                        { label: "Print", action: () => window.print() },
                    ].map((btn) => (
                        <button
                            key={btn.label}
                            onClick={btn.action}
                            className="btn-primary-export"
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Right: Search + Add */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-dark dark:text-white">Search:</label>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm
                                focus:border-primary focus:outline-none
                                dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/*  TABLE  */}
            <div className="card-container">
                <Table className="table-main">
                    <TableHeader>
                        <TableRow className="table-header-row">
                            <TableHead className="table-head">S.No</TableHead>

                            {columns.map(col => (
                                <TableHead
                                    className="table-head cursor-pointer"
                                    key={col}
                                    onClick={() => {
                                        setSortConfig((prev) => ({
                                            key: col,
                                            direction:
                                                prev.key === col && prev.direction === "asc"
                                                    ? "desc"
                                                    : "asc",
                                        }));
                                    }}
                                >
                                    <div className="flex items-center gap-1">
                                        {formatHeader(col)}

                                        {sortConfig.key !== col && (
                                            <FaSort className="text-gray-400" size={12} />
                                        )}

                                        {sortConfig.key === col &&
                                            sortConfig.direction === "asc" && (
                                                <FaSortUp className="text-primary" size={12} />
                                            )}

                                        {sortConfig.key === col &&
                                            sortConfig.direction === "desc" && (
                                                <FaSortDown className="text-primary" size={12} />
                                            )}
                                    </div>


                                </TableHead>
                            ))}

                            <TableHead>Action</TableHead>
                            <TableHead>Log</TableHead>
                            <TableHead>#</TableHead>
                            <TableHead>BOQ KML</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>

                        {paginatedData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    {(currentPage - 1) * rowsPerPage + index + 1}
                                </TableCell>

                                {columns.map(col => (
                                    <TableCell key={col}>
                                        {formatValue(row[col], col)}
                                    </TableCell>
                                ))}

                                {/*  ACTION */}
                                <TableCell>
                                    <button
                                        className="bg-green-500 text-white px-3 py-1 rounded"
                                        onClick={() => openSubmitModal(row)}
                                    >
                                        Submit
                                    </button>
                                </TableCell>

                                {/*  LOG */}
                                <TableCell>
                                    <button
                                        className="border rounded-full w-6 h-6"
                                        onClick={() => openLog(row)}
                                    >
                                        i
                                    </button>
                                </TableCell>

                                {/*  MEDIA */}
                                <TableCell>
                                    <div className="text-blue-600 text-sm">
                                        Pre Execution Videos <br />
                                        Go To Media
                                    </div>
                                </TableCell>

                                {/*  BOQ KML */}
                                <TableCell>
                                    <button
                                        className="bg-green-600 text-white px-3 py-1 rounded"
                                        onClick={() => openKml(row)}
                                    >
                                        BOQ KML
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* PAGINATION (Same as your old design) */}
                {sortedData.length > 0 && (
                    <div className="flex items-center justify-between mt-4 px-2">

                        <p className="text-sm text-gray-600">
                            Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                            {Math.min(currentPage * rowsPerPage, sortedData.length)} of{" "}
                            {sortedData.length} entries
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
                                    className={`px-3 py-1 border rounded-md text-sm
              ${currentPage === page
                                            ? "bg-primary text-white"
                                            : "hover:bg-primary hover:text-white"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() =>
                                    setCurrentPage((p) =>
                                        p < totalPages ? p + 1 : p
                                    )
                                }
                                className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                            >
                                Next
                            </button>

                        </div>
                    </div>
                )}

            </div>

            {/*  ZIP MODAL  */}
            {openZipModal && (
                <div className="modal-overlay">

                    <div className="modal-box">

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold mb-4">
                                Upload Shape Zip File
                            </h2>

                            <button onClick={closeSubmitModal}>
                                <X />
                            </button>
                        </div>

                        {/* FORM GRID */}
                        <div className="grid grid-cols-2 gap-4">

                            {/* FILE */}
                            <div>
                                <label className="font-semibold">Select ZIP File</label>

                                <input
                                    className="border p-2 w-full"
                                    type="file"
                                    name="zipFile"
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="font-semibold">Version Number</label>
                                {/* <input type="text" className="border p-2 w-full" placeholder="Enter version (e.g.V1) " /> */}

                                <input
                                    type="text"
                                    name="version"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter version (e.g.V1)"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">No Of GPs (Nos)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter No Of GPs" /> */}
                                <input
                                    type="number"
                                    name="noOfGps"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter No Of GPs"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">No of Parent Rings (Nos)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter No of Parent Rings" /> */}
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter No of Parent Rings"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">No of Child Rings (Nos)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter No of Child Rings" /> */}
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter No of Child Rings"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">ADSS 24F (KM)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter ADSS 24F" /> */}
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter ADSS 24F"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">Desktop Planning Length (KM)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter Desktop Planning Length" /> */}
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter Desktop Planning Length"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">No of Existing Poles (Nos)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter No of Existing Poles" /> */}
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter No of Existing Poles"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">No of New Poles (Nos)</label>
                                {/* <input type="number" className="border p-2 w-full" placeholder="Enter No of New Poles" /> */}
                            </div>

                            <div>
                                <label className="font-semibold">Alt Technology (Nos)</label>
                                <input type="number" className="border p-2 w-full" placeholder="Enter Alt Technology" />
                                <input
                                    type="number"
                                    name="noofParentRings"
                                    onChange={handleChange}
                                    className="border p-2 w-full"
                                    placeholder="Enter No of Existing Poles"
                                />
                            </div>

                            <div>
                                <label className="font-semibold">GP building NOT available (Nos)</label>
                                <input type="number" className="border p-2 w-full" placeholder="Enter GP building NOT available" />
                            </div>

                            <div>
                                <label className="font-semibold">GP as per RFP (Nos)</label>
                                <input type="number" className="border p-2 w-full" placeholder="Enter GP as per RFP" />
                            </div>

                            <div>
                                <label className="font-semibold">GP proposed to be connected in Block (Nos)</label>
                                <input type="number" className="border p-2 w-full" placeholder="Enter GP proposed to be connected in Block" />
                            </div>

                            <div className="col-span-2">
                                <label className="font-semibold">Description</label>
                                <textarea
                                    maxLength={950}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="border p-2 w-full"
                                    placeholder="Enter Description"
                                />
                                <div className="text-right text-sm text-gray-500">
                                    {950 - description.length} characters left
                                </div>
                            </div>
                        </div>

                        {/* BUTTONS */}
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setOpenZipModal(false)}
                                className="px-4 py-2 border rounded"
                            >
                                Cancel
                            </button>

                            <button className="btn-primary">
                                OK
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/*  KML MODAL  */}
            {openKmlModal && (
                <div className="modal-overlay">

                    <div className="modal-box">

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold mb-4">
                                Upload KML File
                            </h2>

                            <button onClick={closeKmlitModal}>
                                <X />
                            </button>
                        </div>

                        <label className="font-semibold">Select KML File</label>
                        <input type="file" className="border p-2 w-full mt-2" />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setOpenKmlModal(false)}
                                className="border px-3 py-1 rounded"
                            >
                                Cancel
                            </button>

                            <button className="btn-primary">
                                OK
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {openLogModal && (
                <div className="modal-overlay">

                    <div className="modal-box w-[95%] max-w-6xl">

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">
                                {selectedBlock} - Log
                            </h2>

                            <button onClick={() => setOpenLogModal(false)}>
                                <X />
                            </button>
                        </div>

                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                            {/* Export buttons */}
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Copy", action: exportCopyLog },
                                    { label: "CSV", action: exportCSVLog },
                                    { label: "Excel", action: exportExcelLog },
                                    { label: "PDF", action: exportPDFLog },
                                    { label: "Print", action: () => window.print() },
                                ].map((btn) => (
                                    <button
                                        key={btn.label}
                                        onClick={btn.action}
                                        className="btn-primary-export"
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            {/* Right: Search + Add */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-dark dark:text-white">Search:</label>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={logSearch}
                                        onChange={(e) => { setLogSearch(e.target.value); setCurrentPage(1); }}
                                        className="rounded-md border border-stroke bg-white px-3 py-1.5 text-sm
                                focus:border-primary focus:outline-none
                                dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="overflow-auto max-h-[400px]">
                            <Table className="table-main">
                                <TableHeader>
                                    <TableRow className="table-header-row">
                                        <TableHead className="table-head">S.No</TableHead>

                                        {logColumns.map(col => (
                                            <TableHead
                                                className="table-head cursor-pointer"
                                                key={col}
                                                onClick={() => {
                                                    setSortConfig((prev) => ({
                                                        key: col,
                                                        direction:
                                                            prev.key === col && prev.direction === "asc"
                                                                ? "desc"
                                                                : "asc",
                                                    }));
                                                }}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {formatLogHeader(col)}

                                                    {sortConfig.key !== col && (
                                                        <FaSort className="text-gray-400" size={12} />
                                                    )}

                                                    {sortConfig.key === col &&
                                                        sortConfig.direction === "asc" && (
                                                            <FaSortUp className="text-primary" size={12} />
                                                        )}

                                                    {sortConfig.key === col &&
                                                        sortConfig.direction === "desc" && (
                                                            <FaSortDown className="text-primary" size={12} />
                                                        )}
                                                </div>

                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredlogData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {(currentPage - 1) * rowsPerPage + index + 1}
                                            </TableCell>

                                            {logColumns.map(col => (
                                                <TableCell key={col}>

                                                    {/* VERSION */}
                                                    {col === "VersionNumber" && (
                                                        <span
                                                            className="text-blue-600 cursor-pointer"
                                                            onClick={(e) => openVersion(row.BlockId, row[col], e)}
                                                        >
                                                            {row[col]}
                                                        </span>
                                                    )}

                                                    {/* REMARKS */}
                                                    {col === "Comment" && (
                                                        <span
                                                            className="text-blue-600 cursor-pointer"
                                                            onClick={(e) => openComment(row[col], e)}
                                                        >
                                                            {row[col]?.length > 15
                                                                ? row[col].substring(0, 15) + "..."
                                                                : row[col]}
                                                        </span>
                                                    )}

                                                    {/* ATTACHMENT */}
                                                    {col === "Filepath" && row[col] && (
                                                        <button
                                                            onClick={() => handleDownload(row[col])}
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                            title="Download File"
                                                        >
                                                            <FaFileAlt className="text-gray-500 text-sm" />
                                                            <FaDownload className="text-blue-600 text-sm" />
                                                        </button>
                                                    )}

                                                    {/* DEFAULT */}
                                                    {!["VersionNumber", "Comment", "Filepath"].includes(col) &&
                                                        formatLogValue(row[col], col)
                                                    }

                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* PAGINATION (Same as your old design) */}
                            {sortedlogData.length > 0 && (
                                <div className="flex items-center justify-between mt-4 px-2">

                                    <p className="text-sm text-gray-600">
                                        Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                                        {Math.min(currentPage * rowsPerPage, sortedlogData.length)} of{" "}
                                        {sortedlogData.length} entries
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
                                                className={`px-3 py-1 border rounded-md text-sm
              ${currentPage === page
                                                        ? "bg-primary text-white"
                                                        : "hover:bg-primary hover:text-white"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        ))}

                                        <button
                                            onClick={() =>
                                                setCurrentPage((p) =>
                                                    p < totalPages ? p + 1 : p
                                                )
                                            }
                                            className="px-3 py-1 border rounded-md text-sm hover:bg-primary hover:text-white"
                                        >
                                            Next
                                        </button>

                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={() => setOpenLogModal(false)}
                                    className="btn-secondary"
                                >
                                    Close
                                </button>
                            </div>

                        </div>

                        {openVersionModal && (
                            <div
                                className="absolute z-50 bg-white w-[320px] rounded-lg shadow-lg border"
                                style={{
                                    top: popupPosition.y,
                                    left: popupPosition.x,
                                }}
                            >
                                {/* HEADER */}
                                <div className="bg-primary text-white px-3 py-2 flex justify-between items-center rounded-t-lg">
                                    <span>Version Details - {selectedVersion}</span>
                                    <button onClick={() => setOpenVersionModal(false)}>×</button>
                                </div>

                                {/* BODY */}
                                <div className="p-3 max-h-[250px] overflow-y-auto pr-2 text-sm">

                                    {versionData?.hasData ? (
                                        <div className="space-y-2">

                                            <p><b>No GPS:</b> {versionData.data.NoofGps}</p>
                                            <p><b>No of Parent Rings:</b> {versionData.data.NoofParentRings}</p>
                                            <p><b>No of Child Rings:</b> {versionData.data.NoofChildRings}</p>
                                            <p><b>ADSS 24F:</b> {versionData.data.ADSS24F}</p>
                                            <p><b>Desktop Planning Length:</b> {versionData.data.DesktopPlanningLength}</p>
                                            <p><b>No of Existing Poles:</b> {versionData.data.NoofExistingPoles}</p>
                                            <p><b>No of New Poles:</b> {versionData.data.NoofNewPoles}</p>
                                            <p><b>Alt Technology:</b> {versionData.data.AltTechnology}</p>
                                            <p><b>GP building NOT available:</b> {versionData.data.GPbuildingNOTavailable}</p>
                                            <p><b>GP as per RFP:</b> {versionData.data.GPasperRFP}</p>
                                            <p><b>GP proposed to be connected:</b> {versionData.data.GPproposedtobeconnectedinBlock}</p>
                                            <p><b>Date:</b> {new Date(versionData.data.Date).toLocaleString()}</p>

                                        </div>
                                    ) : (
                                        <div className="text-yellow-700 bg-yellow-50 border p-2 rounded text-center">
                                            No data found
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}

                        {openCommentPopup && (
                            <div
                                className="fixed z-[9999] bg-white w-[300px] rounded-lg shadow-lg border"
                                style={{
                                    top: commentPosition.y,
                                    left: commentPosition.x,
                                }}
                            >
                                <div className="bg-primary text-white px-3 py-2 flex justify-between items-center rounded-t-lg">
                                    <span>Full Comment</span>
                                    <button onClick={() => setOpenCommentPopup(false)}>×</button>
                                </div>

                                <div className="p-3 text-sm max-h-[200px] overflow-y-auto">
                                    {commentText}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}



        </div>
    );
}
