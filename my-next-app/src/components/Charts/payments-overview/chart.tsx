"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

import { BASE_URL } from "@/config/api";

export function PaymentsOverviewChart({ taskId }: any) {
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    if (!taskId) return;

    fetch(`${BASE_URL}/Web/dashboard/executive/linechart?taskId=${taskId}`)
      .then((res) => res.json())
      .then((response) => {
        const safe = Array.isArray(response) ? response : [];

        const zones = [...new Set(safe.map((d: any) => d.ZoneName))];
        const dates = [...new Set(safe.map((d: any) => d.dt))].sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );

        const formatted = zones.map((zone: string) => {
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

        setSeries(formatted);
      });
  }, [taskId]);

  const options: ApexOptions = {
    colors: ["#5750F1", "#0ABEF9", "#FF4560", "#00E396", "#80CAEE", "#FEB019"],

    chart: {
      type: "area",
      background: "transparent",

      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      fontFamily: "inherit",
    },

    stroke: {
      curve: "smooth",
      width: 3,
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.6,
        opacityTo: 0.05,
      },
    },


    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#9CA3AF" } },
    },

    yaxis: {
      labels: { style: { colors: "#9CA3AF" } },
    },

    dataLabels: { enabled: false },
  };

  return (
    <Chart options={options} series={series} type="area" height={300} />
  );
}


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
    // chart: {
    //   type: "area",
    //   toolbar: { show: true },
    //   zoom: { enabled: false },
    // },

    chart: {
      type: "area",
      background: "transparent",

      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false,
        },
      },
      fontFamily: "inherit",
    },


    colors: ["var(--chart-color-1)", "var(--chart-color-2)", "var(--chart-color-3)", "var(--chart-color-4)"],

    stroke: {
      curve: "smooth",
      width: 2,
    },

    // title: {
    //   text: 'Month Wise Progress'
    // },

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
