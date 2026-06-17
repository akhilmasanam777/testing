"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Task = {
    id: number;
    name: string;
    isSelected: boolean;
    order: number;
};

export default function DashboardTaskConfigPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTaskConfig();
    }, []);

    const loadTaskConfig = async () => {
        try {
            setLoading(true);

            const res = await fetch("/api/dashboardconfig/taskconfig");
            const data = await res.json();

            const list = Array.isArray(data)
                ? data
                : data.data || data.result || [];

            const formatted = list.map((t: any) => ({
                id: t.id,
                name: t.Name,
                isSelected: t.IsSelected,
                order: t.Order,
            }));

            setTasks(formatted);
        } catch (error) {
            console.error("Error loading tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCheck = (index: number) => {
        const updated = [...tasks];
        updated[index].isSelected = !updated[index].isSelected;
        setTasks(updated);
    };

    const saveTaskConfig = async () => {
        try {
            const payload = tasks.map((t) => ({
                id: t.id,
                IsSelected: t.isSelected,
                Order: t.order,
            }));

            await fetch("/api/dashboardconfig/addupdatetaskconfig", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            loadTaskConfig();
        } catch (error) {
            console.error("Save error:", error);
        }
    };

    const resetTaskConfig = () => {
        loadTaskConfig();
    };

    return (
        <div className="page-container">

            <div className="all-pages-header">
                <h1 className="dashboard-title-light">
                    Dashboard Task Config
                </h1>
            </div>

            <div className="card-container">

                {loading ? (
                    <p className="text-center py-4">Loading...</p>
                ) : (
                    <Table className="table-main">
                        <TableHeader>
                            <TableRow className="table-header-row">
                                <TableHead className="table-head">Select</TableHead>
                                <TableHead className="table-head">Name</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {tasks.map((task, index) => (
                                <TableRow key={task.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={task.isSelected}
                                            onChange={() => toggleCheck(index)}
                                        />
                                    </TableCell>

                                    <TableCell>{task.name}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <div className="flex justify-between mt-6">

                    <button className="btn-disabled">
                        Go To Task
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={saveTaskConfig}
                            className="btn-primary"
                        >
                            Submit Details
                        </button>

                        <button
                            onClick={resetTaskConfig}
                            className="btn-secondary"
                        >
                            Reset
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
}