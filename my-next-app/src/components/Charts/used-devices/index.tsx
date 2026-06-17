"use client";

import { useEffect, useState } from "react";
import { DonutChart } from "./chart";

import { BASE_URL } from "@/config/api";

export function UsedDevicesChart({ taskId, taskName, className }: any) {
  const [data, setData] = useState<
    { name: string; amount: number }[]
  >([]);

  useEffect(() => {
    if (!taskId) return;

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    fetch(`${BASE_URL}/Web/dashboard/pie/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        const formatted = res
          .map((x: any) => ({
            name: x.PackageName,
            amount: Number(x.TotalProgress || 0),
          }))
          .filter((x: any) => x.amount > 0);

        setData(
          formatted.length
            ? formatted
            : [{ name: "No Data", amount: 1 }]
        );
      });
  }, [taskId]);

  return (
    <div className={`card ${className}`}>
      <h2 className="text-card-title mb-4">{taskName}</h2>
      <DonutChart data={data} />
    </div>
  );
}