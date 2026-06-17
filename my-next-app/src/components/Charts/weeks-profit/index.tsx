import { WeeksProfitChart } from "./chart";

type PropsType = {
  taskId: string;
  taskName: string;
  className?: string;
};

export function WeeksProfit({ taskId, taskName, className }: PropsType) {
  return (
    <div className={`card ${className}`}>
      <h2 className="text-card-title mb-4">{taskName}</h2>
      <WeeksProfitChart taskId={taskId} />
    </div>
  );
}