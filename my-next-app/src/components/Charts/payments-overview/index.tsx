
import { MonthProgressChart, PaymentsOverviewChart } from "./chart";

type PropsType = {
  taskId: string;
  taskName: string;
  className?: string;
};

export function PaymentsOverview({ taskId, taskName, className }: PropsType) {
  return (
    <div className={`card ${className}`}>
      <h2 className="text-card-title mb-4">{taskName}</h2>
      <PaymentsOverviewChart taskId={taskId} />
    </div>
  );
}

export function MonthwiseOverview({ taskId, taskName, className }: PropsType) {
  return (
    <div className={`card ${className}`}>
      <h2 className="text-card-title mb-4">{taskName}</h2>
      <MonthProgressChart taskId={taskId} />
    </div>
  );
}



