export default function GanttDashboard() {
    return (
        <div className="h-[calc(100vh-96px)] min-h-[640px] w-full bg-white">
            <iframe
                title="Gantt View"
                src="/api/gantt/frame"
                className="h-full w-full border-0 bg-white"
            />
        </div>
    );
}
 