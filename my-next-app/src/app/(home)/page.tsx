import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExecutiveDashboard from "./dashboard";


async function getDashboardData(token: string) {
  const baseUrl = "https://bnpapp.traxion.in";

  const taskRes = await fetch(`${baseUrl}/web/dashboard/executive/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

// console.log("Tasks API Status:", taskRes.status);

// const taskText = await taskRes.text();

// console.log("Tasks API Body:", taskText);

// const tasks = JSON.parse(taskText);

  const tasks = await taskRes.json();

  // const details = await Promise.all(
  //   tasks.map(async (task: any) => {
  //     const res = await fetch(
  //       `${baseUrl}/web/dashboard/executive/taskdetails/${encodeURIComponent(task.FullPath)}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //         cache: "no-store",
  //       }
  //     );

  //     const detail = await res.json();

  //     return {
  //       ...detail,
  //       TaskName: task.TaskName,
  //       Icon: `${baseUrl}${task.Icon}`,
  //       TaskId: task.TaskId,
  //     };
  //   })
  // );


  const details = await Promise.all(
  tasks.map(async (task: any) => {
    const url =
      `${baseUrl}/web/dashboard/executive/taskdetails/${encodeURIComponent(
        task.FullPath
      )}`;

    console.log("Fetching:", task.TaskName);

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    console.log(
      "Task:",
      task.TaskName,
      "Status:",
      res.status
    );

    const text = await res.text();

    console.log(
      "Task:",
      task.TaskName,
      "Body:",
      text
    );

    const detail = JSON.parse(text);

    return {
      ...detail,
      TaskName: task.TaskName,
      Icon: `${baseUrl}${task.Icon}`,
      TaskId: task.TaskId,
    };
  })
);

  return details;
}

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/auth/sign-in");
  }

  const data = await getDashboardData(token);

  return <ExecutiveDashboard data={data} />;
}
