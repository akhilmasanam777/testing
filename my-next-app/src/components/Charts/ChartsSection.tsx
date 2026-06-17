"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/hooks/use-mobile";

const Chart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

import { BASE_URL } from "@/config/api";

export default function ChartsSection() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [taskId, setTaskId] = useState("");
    const [taskName, setTaskName] = useState("");

    const [barData, setBarData] = useState({
        completed: [],
        pending: [],
    });

    const isMobile = useIsMobile();

    const [lineSeries, setLineSeries] = useState<any[]>([]);


    // ================= DROPDOWN =================
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

    useEffect(() => {
        if (!taskId) return;

        loadBarChart(taskId);
        loadLineChart(taskId);
    }, [taskId]);

    // ================= BAR CHART =================
    const loadBarChart = async (taskId: string) => {
        const res = await fetch(
            `${BASE_URL}/Web/dashboard/executive/barchart?taskId=${taskId}`
        );
        const response = await res.json();

        const safe = Array.isArray(response) ? response : [];

        setBarData({
            completed: safe.map((i: any) => ({
                x: i.ZoneName,
                y: i.Completed || 0,
            })),
            pending: safe.map((i: any) => ({
                x: i.ZoneName,
                y: i.Pending || 0,
            })),
        });
    };

    // ================= LINE CHART =================
    const loadLineChart = async (taskId: string) => {
        const res = await fetch(
            `${BASE_URL}/Web/dashboard/executive/linechart?taskId=${taskId}`
        );
        const response = await res.json();

        const safe = Array.isArray(response) ? response : [];

        const zones = [...new Set(safe.map((d: any) => d.ZoneName))];
        const dates = [...new Set(safe.map((d: any) => d.dt))].sort(
            (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );

        const series = zones.map((zone: string) => {
            let last = 0;

            const data = dates.map((date: string) => {
                const item = safe.find(
                    (x: any) => x.ZoneName === zone && x.dt === date
                );

                if (item) last = item.CumulativeTotal;

                return {
                    x: new Date(date).getTime(),
                    y: last,
                };
            });

            return { name: zone, data };
        });

        setLineSeries(series);
    };


    const barOptions: ApexOptions = {
        colors: ["#5750F1", "#0ABEF9"],

        chart: {
            type: "bar",
            stacked: true,
            toolbar: { show: false },
            zoom: {
                enabled: false,
            },
        },

        responsive: [
            {
                breakpoint: 1536,
                options: {
                    plotOptions: {
                        bar: {
                            borderRadius: 3,
                            columnWidth: "25%",
                        },
                    },
                },
            },
        ],


        plotOptions: {
            bar: {
                borderRadius: 6,
                columnWidth: "25%",
                borderRadiusApplication: "end",
                borderRadiusWhenStacked: "last",
            },
        },

        grid: {
            strokeDashArray: 5,
            xaxis: {
                lines: {
                    show: false,
                },
            },
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },

        dataLabels: { enabled: false },

        xaxis: {
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        legend: {
            position: "top",
            horizontalAlign: "left",
            fontFamily: "inherit",
            fontWeight: 500,
            fontSize: "14px",
            markers: {
                size: 9,
                shape: "circle",
            },
        },
        fill: { opacity: 1 },
    };

    const areaOptions: ApexOptions = {
        colors: ["#5750F1", "#0ABEF9"],

        chart: {
            type: "area",
            height: 310,
            toolbar: { show: false },
            fontFamily: "inherit",
        },

        stroke: {
            curve: "smooth",
            width: isMobile ? 2 : 3,
        },

        fill: {
            gradient: {
                opacityFrom: 0.55,
                opacityTo: 0,
            },
        },
        responsive: [
            {
                breakpoint: 1024,
                options: {
                    chart: {
                        height: 300,
                    },
                },
            },
            {
                breakpoint: 1366,
                options: {
                    chart: {
                        height: 320,
                    },
                },
            },
        ],
        grid: {
            strokeDashArray: 5,
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },

        dataLabels: { enabled: false },

        xaxis: {
            type: "datetime",
            axisBorder: { show: false },
            axisTicks: { show: false },
        },

        tooltip: {
            shared: true,
            intersect: false,
        },

        legend: { show: false },


    };

    return (
        <div className="grid grid-cols-12 gap-6">

            {/* ================= BAR ================= */}
            <div className="col-span-12 xl:col-span-6 bg-white p-6 rounded-2xl shadow-sm relative">

                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold">
                        {taskName}
                    </h2>

                    {/* DROPDOWN */}
                    <select
                        value={taskId}
                        onChange={(e) => {
                            const selected = tasks.find(
                                (t: any) => t.Value === e.target.value
                            );
                            setTaskId(e.target.value);
                            setTaskName(selected?.Text || "");
                        }}
                        className="border border-gray-300 px-3 py-1.5 rounded-md text-sm"
                    >
                        {tasks.map((t: any) => (
                            <option key={t.Value} value={t.Value}>
                                {t.Text}
                            </option>
                        ))}
                    </select>
                </div>

                {/* CHART */}
                <Chart
                    options={barOptions}
                    series={[
                        { name: "Pending", data: barData.pending },
                        { name: "Completed", data: barData.completed },
                    ]}
                    type="bar"
                    height={320}
                />
            </div>


            {/* ================= AREA ================= */}
            <div className="col-span-12 xl:col-span-6 bg-white p-6 rounded-2xl shadow-sm">

                {/* HEADER */}
                <h2 className="text-lg font-semibold mb-6">
                    {taskName}
                </h2>

                {/* CHART */}
                <div className="-ml-4 -mr-5">
                    <Chart
                        options={areaOptions}
                        series={lineSeries}
                        type="area"
                        height={310}
                    />
                </div>
            </div>

        </div>
    );
}