"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

import { BASE_URL } from "@/config/api";

export function WeeksProfitChart({ taskId }: any) {
  const [series, setSeries] = useState<any[]>([]);

  useEffect(() => {
    if (!taskId) return;

    fetch(`${BASE_URL}/Web/dashboard/executive/barchart?taskId=${taskId}`)
      .then((res) => res.json())
      .then((response) => {
        const safe = Array.isArray(response) ? response : [];

        setSeries([
          {
            name: "Pending",
            data: safe.map((i: any) => ({
              x: i.ZoneName,
              y: i.Pending || 0,
            })),
          },
          {
            name: "Completed",
            data: safe.map((i: any) => ({
              x: i.ZoneName,
              y: i.Completed || 0,
            })),
          },
        ]);
      });
  }, [taskId]);

  const options: ApexOptions = {
    colors: ["#5750F1", "#0ABEF9"],
    chart: {
      type: "bar",
      stacked: true,
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
      zoom: {
        enabled: false,
      },
    },

    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "25%",
      },
    },

    grid: {
      borderColor: "#374151",
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
    fill: {
      opacity: 1,
    },


    dataLabels: { enabled: false },
  };

  return (
    <Chart options={options} series={series} type="bar" height={320} />
  );
}