"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
});

import { BASE_URL } from "@/config/api";

export function MonthProgressChart({ taskId }: any) {
    const [series, setSeries] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        if (!taskId) return;

        const token = document.cookie
            .split("; ")
            .find(row => row.startsWith("token="))
            ?.split("=")[1];

        fetch(`${BASE_URL}/Web/dashboard/vehiclesummary/${taskId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(res => {
                setCategories(res.Dt || []);

                // Convert API → Apex format
                const formattedSeries = (res.series || []).map((s: any) => ({
                    name: s.name,
                    data: s.data
                }));

                setSeries(formattedSeries);
            });
    }, [taskId]);

    const options: ApexOptions = {
        chart: {
            type: "area",
            toolbar: { show: true },
            zoom: { enabled: false },
        },

        colors: ["#5750F1"],

        stroke: {
            curve: "smooth",
            width: 2,
        },

        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 100],
            },
        },

        dataLabels: { enabled: false },

        xaxis: {
            categories: categories,
            labels: {
                rotate: 45,
            },
        },

        grid: {
            borderColor: "#374151",
        },

        legend: {
            position: "top",
        },
    };

    return (
        <Chart options={options} series={series} type="area" height={350} />
    );
}