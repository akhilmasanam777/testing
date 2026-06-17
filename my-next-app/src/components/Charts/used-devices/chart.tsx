"use client";

import { compactFormat } from "@/lib/format-number";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = {
  data: { name: string; amount: number }[];
};

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// const isDark = document.documentElement.classList.contains("dark");

export function DonutChart({ data }: PropsType) {
  const chartOptions: ApexOptions = {
    // chart: {
    //   type: "donut",
    //   fontFamily: "inherit",
    // },
    colors: ["var(--chart-color-1)", "var(--chart-color-2)", "var(--chart-color-3)", "var(--chart-color-4)"],

    labels: data.map((item) => item.name),

    legend: {
      show: true,
      position: "bottom",
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
      formatter: (name, opts) => {
        const percent = opts.w.globals.seriesPercent;
        return `${name}: ${percent[opts.seriesIndex]}%`;
      },
    },

    chart: {
      type: "donut",
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


    plotOptions: {
      pie: {
        donut: {
          size: "80%",
          background: "transparent",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Visitors",
              fontSize: "16px",
              fontWeight: "400",
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: "bold",
              formatter: (val) => compactFormat(+val),
            },
          },
        },
      },
    },

    dataLabels: { enabled: false },
  };

  return (
    <Chart
      options={chartOptions}
      series={data.map((item) => item.amount)}
      type="donut"
      height={320}
    />
  );
}