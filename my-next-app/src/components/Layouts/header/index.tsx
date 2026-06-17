// "use client";

// import "@/css/stylenew.css";
// import { SearchIcon } from "@/assets/icons";
// import Image from "next/image";
// import Link from "next/link";
// import { useSidebarContext } from "../sidebar/sidebar-context";
// import { MenuIcon } from "./icons";
// import { Notification } from "./notification";
// import { ThemeToggleSwitch } from "./theme-toggle";
// import { UserInfo } from "./user-info";
// import { useEffect, useState } from "react";


// function formatDateTime(raw: string): string {
//   if (!raw) return "";

//   const date = new Date(raw);
//   if (isNaN(date.getTime())) return raw;

//   // Month first
//   const month = date.toLocaleString("en-IN", { month: "short" });
//   const day = String(date.getDate()).padStart(2, "0");
//   const year = date.getFullYear();

//   let hours: any = date.getHours();
//   const minutes: any = String(date.getMinutes()).padStart(2, "0");

//   const ampm = hours >= 12 ? "PM" : "AM";
//   hours = hours % 12 || 12;

//   return `${month} ${day} ${year} ${hours}:${minutes}${ampm}`;
// }


// export function Header() {
//   const { toggleSidebar, isMobile } = useSidebarContext();


//   const [user, setUser] = useState<any>(null);
//   const [lastLogin, setLastLogin] = useState("");
//   const [currentLogin, setCurrentLogin] = useState("");

//   useEffect(() => {
//     loadUser();
//     loadLastLogin();

//     // LOAD CURRENT LOGIN
//     const stored = localStorage.getItem("loginTime");
//     if (stored) {
//       setCurrentLogin(formatDateTime(stored));
//     }
//   }, []);

//   async function loadUser() {
//     try {
//       const res = await fetch("/api/auth/me");
//       if (!res.ok) return;

//       const data = await res.json();
//       setUser(data);
//     } catch (err) {
//       console.error(err);
//     }
//   }

//   async function loadLastLogin() {
//     try {
//       const res = await fetch("/api/user/last-login");
//       if (!res.ok) return;

//       const data = await res.json();
//       if (!data || data.length === 0) return;

//       const raw =
//         data[0].LoginDtTm ||
//         data[0].LoginTime ||
//         data[0].Date ||
//         "";

//       if (raw) {
//         setLastLogin(formatDateTime(raw));
//       }
//     } catch (err) {
//       console.error(err);
//     }
//   }



//   return (
//     <header className="header">
//       <button onClick={toggleSidebar} className="menuBtn">
//         <MenuIcon />
//         <span className="sr-only">Toggle Sidebar</span>
//       </button>

//       {isMobile && (
//         <Link href={"/"} className="logoLink">
//           <Image
//             src={"/images/logo/logo-icon.svg"}
//             width={32}
//             height={32}
//             alt=""
//           />
//         </Link>
//       )}

//       <div className="titleContainer">
//         <h2 className="title">TRAXION BUILD</h2>
//         <p className="subtitle">
//           {currentLogin && (
//             <span>
//               Last Login: {currentLogin}
//             </span>
//           )}

//         </p>
//       </div>

//       <div className="rightSection">
//         <div className="searchWrapper">
//           <input
//             type="search"
//             placeholder="Search"
//             className="searchInput"
//           />
//           <SearchIcon className="searchIcon" />
//         </div>

//         <ThemeToggleSwitch />
//         <Notification />

//         <div className="userContainer">
//           <UserInfo />
//         </div>
//       </div>
//     </header>
//   );
// }


"use client";

import { SearchIcon } from "@/assets/icons";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../sidebar/sidebar-context";
import { MenuIcon } from "./icons";
import { Notification } from "./notification";
import { ThemeToggleSwitch } from "./theme-toggle";
import { UserInfo } from "./user-info";
import { useEffect, useState } from "react";


function formatDateTime(raw: string): string {
  if (!raw) return "";

  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;

  // Month first
  const month = date.toLocaleString("en-IN", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours: any = date.getHours();
  const minutes: any = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day} ${year} ${hours}:${minutes}${ampm}`;
}

export function Header() {
  const { toggleSidebar, isMobile } = useSidebarContext();

  const [user, setUser] = useState<any>(null);
  const [lastLogin, setLastLogin] = useState("");
  const [currentLogin, setCurrentLogin] = useState("");

  useEffect(() => {
    loadUser();
    loadLastLogin();

    // LOAD CURRENT LOGIN
    const stored = localStorage.getItem("loginTime");
    if (stored) {
      setCurrentLogin(formatDateTime(stored));
    }
  }, []);

  async function loadUser() {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) return;

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadLastLogin() {
    try {
      const res = await fetch("/api/user/last-login");
      if (!res.ok) return;

      const data = await res.json();
      if (!data || data.length === 0) return;

      const firstItem = data?.[0];

      const raw =
        firstItem?.LoginDtTm ||
        firstItem?.LoginTime ||
        firstItem?.Date ||
        "";

      if (raw) {
        setLastLogin(formatDateTime(raw));
      }
    } catch (err) {
      console.error(err);
    }
  }


  return (
    <header className="app-header">

      <button onClick={toggleSidebar} className="menu-btn menu-btn text-dark dark:text-white">
        <MenuIcon />
        <span className="sr-only">Toggle Sidebar</span>
      </button>

      {isMobile && (
        <Link href={"/"} className="ml-2 max-[430px]:hidden min-[375px]:ml-4">
          <Image
            src={"/images/logo/logo-icon.svg"}
            width={32}
            height={32}
            alt=""
          />
        </Link>
      )}

      {/* <div className="max-xl:hidden">
        <h1 className="header-title">Dashboard</h1>
        <p className="header-subtitle">
          Next.js Admin Dashboard Solution
        </p>
      </div> */}

      <div className="header-log">
        <h1 className="header-title">Himachal Pradesh</h1>
        {/* <p className="header-subtitle text-sm">
          {currentLogin && (
            <span>
              Last Login : {currentLogin}
            </span>
          )}

        </p> */}
      </div>

      <div className="header-right">
        {/* <div className="search-wrapper">
          <input
            type="search"
            placeholder="Search"
            className="search-input"
          />
          <SearchIcon className="search-icon" />
        </div> */}

        <ThemeToggleSwitch />
        <Notification />

        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </header>
  );
}
