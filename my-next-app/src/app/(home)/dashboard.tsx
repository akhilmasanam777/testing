"use client";

import { useEffect, useState } from "react";
import { OverviewCard } from "@/app/(home)/_components/overview-cards/card";
import { PaymentsOverview } from "@/components/Charts/payments-overview";
import { WeeksProfit } from "@/components/Charts/weeks-profit";
import Link from "next/link";
import { Product, Profit, Users, Views } from "./_components/overview-cards/icons";
import { toTitleCase } from "@/utils/text";
import { BASE_URL } from "@/config/api";


export default function ExecutiveDashboard({ data }: any) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [taskId, setTaskId] = useState("");
    const [taskName, setTaskName] = useState("");

    useEffect(() => {
        fetch(`${BASE_URL}/api/dropdowns/GetEdTaskChart`)
            .then((res) => res.json())
            .then((data) => {
                setTasks(data);
                if (data.length > 0) {
                    setTaskId(data[0].Value);
                    setTaskName(data[0].Text);
                }
            });
    }, []);

    const handleDownloadExcel = async () => {
        try {
            const response = await fetch(
                `${BASE_URL}/Web/dashboard/executive/report/excel`
            );

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "ExecutiveDashboard.xlsx";
            document.body.appendChild(a);
            a.click();

            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
        }
    };

    const handleCardClick = (item: any) => {
        const taskId = parseInt(item.TaskId);
        const taskname = item.TaskName;

        if (taskId === 0) {
            if (taskname === "DeskTop Planning") {
                window.open("/PlanningToolCreation", "_blank");
            }
            if (taskname === "BOQ") {
                window.open("/LinkView", "_blank");
            }
            return;
        }

        if (!isNaN(taskId) && taskId > 0) {
            window.open(
                `/TaskList?taskId=${encodeURIComponent(taskId)}&Link=0&Sublink=0`,
                "_blank"
            );
        }
    };

    // const toTitleCase = (text) => {
    //     if (!text) return "";
    //     return text
    //         .toLowerCase()
    //         .split(" ")
    //         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    //         .join(" ");
    // };

    return (
        <div className="dashboard-container px-4 py-4">

            {/* HEADER */}
            <div className="all-pages-header">
                <h1 className="dashboard-title-light">
                    Executive Dashboard  
                </h1>

                <div className="dashboard-links">
                    <Link href="/lengths">Lengths</Link>
                    <Link href="/daywise">DayWise</Link>
                    <button onClick={handleDownloadExcel}>
                        DownloadExcel
                    </button>
                </div>
            </div>

            {/* CARDS */}
            <div className="dashboard-grid mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                {data.map((item: any, index: number) => {
                    const IconComponent = () => <img src={item.Icon} width={40} />;
                    const showUsers = item.NoOfUsers > 0;

                    let value;

                    /* ================= DEFAULT ================= */
                    value = (

                        <div className={`stats-grid ${showUsers ? "stats-grid-4" : "stats-grid-3"}`}>
                            <div className="stats-item">
                                <Views /> 
                                <p className="stats-value">{item.Completed || 0}</p>
                                <p className="stats-label">Complete</p>
                            </div>

                            <div className="stats-item">
                                <Profit />
                                <p className="stats-value">{item.InProgress || 0}</p>
                                <p className="stats-label">InProgress</p>
                            </div>

                            <div className="stats-item">
                                <Product />
                                <p className="stats-value">{item.Pending || 0}</p>
                                <p className="stats-label">Pending</p>
                            </div>

                            {showUsers && (
                                <div className="stats-item">
                                    <Users />
                                    <p className="stats-value">{item.NoOfUsers}</p>
                                    <p className="stats-label">Users</p>
                                </div>
                            )}
                        </div>
                    );

                    /* ================= BOQ ================= */
                    if (item.TaskName === "BOQ") {
                        value = (
                            <div className={`stats-grid ${showUsers ? "stats-grid-4" : "stats-grid-3"}`}>
                                <div className="stats-item">
                                    <Views />
                                    <p className="stats-value">{item.Completed}</p>
                                    <p className="stats-label">Approved</p>
                                </div>

                                <div className="stats-item">
                                    <Profit />
                                    <p className="stats-value">{item.InProgress}</p>
                                    <p className="stats-label">Submitted</p>
                                </div>

                                <div className="stats-item">
                                    <Product />
                                    <p className="stats-value">{item.Pending}</p>
                                    <p className="stats-label">Pending</p>
                                </div>

                                {showUsers && (
                                    <div className="stats-item">
                                        <Users />
                                        <p className="stats-value">{item.NoOfUsers}</p>
                                        <p className="stats-label">Users</p>
                                    </div>
                                )}
                            </div>
                        );
                    }

                    /* ================= MILESTONE ================= */
                    if (item.TaskName?.toLowerCase().includes("milestone")) {
                        value = (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="stats-item">
                                    <Views />
                                    <p className="stats-value">{item.MileStone}</p>
                                    <p className="stats-label">TO</p>
                                </div>

                                <div className="stats-item">
                                    <Profit />
                                    <p className="stats-value">{item.DaysLeft}</p>
                                    <p className="stats-label">Days</p>
                                </div>

                                <div className="stats-item">
                                    <Product />
                                    <p className="stats-value">
                                        {item.MileStoneDate
                                            ? new Date(item.MileStoneDate).toLocaleDateString("en-GB")
                                            : "-"}
                                    </p>
                                    <p className="stats-label">Date</p>
                                </div>
                            </div>
                        );
                    }

                    /* ================= ATTENDANCE ================= */
                    if (item.TaskName?.toLowerCase().includes("attendance")) {
                        value = (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="stats-item">
                                    <Views />
                                    <p className="stats-value">{item.TotalBlocks}</p>
                                    <p className="stats-label">Total</p>
                                </div>

                                <div className="stats-item">
                                    <Profit />
                                    <p className="stats-value">{item.Completed}</p>
                                    <p className="stats-label">Present</p>
                                </div>

                                <div className="stats-item">
                                    <Users />
                                    <p className="stats-value">{item.NoOfUsers}</p>
                                    <p className="stats-label">Active</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={item.TaskId || index} onClick={() => handleCardClick(item)} className="cursor-pointer flex flex-col">
                            <OverviewCard
                                label={item.TaskName}
                                data={{ value }}
                                Icon={IconComponent}                            
                            />
                        </div>
                    );
                })}
            </div>

            {/* DROPDOWN */}
            <div className="flex justify-end mt-6">
                <select
                    value={taskId}
                    onChange={(e) => {
                        const selected = tasks.find((t: any) => t.Value === e.target.value);
                        setTaskId(e.target.value);
                        setTaskName(toTitleCase(selected?.Text || ""));
                    }}
                    className="border border-gray-300 dark:border-gray-600 
     bg-white dark:bg-gray-800 
     text-dark dark:text-white 
     px-3 py-2 rounded-md text-sm"
                >
                    {tasks.map((t: any) => (
                        <option key={t.Value} value={t.Value}>
                            {toTitleCase(t.Text)}
                        </option>
                    ))}
                </select>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-12 gap-6 mt-6">
                <PaymentsOverview
                    taskId={taskId}
                    taskName={taskName}
                    className="col-span-12 xl:col-span-6"
                />
                <WeeksProfit
                    taskId={taskId}
                    taskName={taskName}
                    className="col-span-12 xl:col-span-6"
                />
            </div>

        </div>
    );
}
