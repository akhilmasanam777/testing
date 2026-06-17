"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import {  useEffect,  useState } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { useRouter } from "next/navigation";


export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/sign-in");
    router.refresh();
  };
 
  const getInitials = (name: string) => {
  if (!name) return "?";
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length > 1) {
    // If there's a space, take first letters of first and last name (e.g., "akhil kumar" -> "AK")
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  // If it's only one word, take just the single first letter (e.g., "Akhil" -> "A")
  return parts[0][0].toUpperCase();
};

  // const USER = {
  //   name: "John Smith",
  //   email: "johnson@nextadmin.com",
  //   img: "/images/user/user-03.png",
  // };
const [lastLogin, setLastLogin] = useState("");

 const [USER, setUSER]= useState({
name:"",
email:"",
img: "/images/user/user-03.png",
}
 )


 useEffect(()=>{
  const getuser=async()=>{
    try{
      const res= await fetch("/api/auth/me");
      const data =await res.json();
      
      setUSER({
        name:data.Name,
        email:data.RoleName,
        img: "/images/user/user-03.png"
      });
    }catch(err){
      console.log("user fetch failed", err)
    }
  }
  getuser();
 },[])


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

 useEffect(()=>{
 const store= localStorage.getItem("loginTime");
 if (store){
 setLastLogin(formatDateTime(store)); 
 }},[])
  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          {/* <Image
            src={USER.img}
            className="size-12"
            alt={`Avatar of  ${USER.name}`}
            role="presentation"
            width={200}
            height={200}
          /> */}
          
          <div className="flex size-12 items-center justify-center rounded-full bg-primary font-semibold text-white text-sm tracking-wider shadow-sm select-none">
  {getInitials(USER.name)}
</div>
        
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{USER.name}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image
            src={USER.img}
            className="size-12"
            alt={`Avatar for  ${USER.name}`}
            role="presentation"
            width={200}
            height={200}
          />

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {USER.name}
            </div>

            <div className="leading-none text-gray-6">{USER.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
        <p className="header-subtitle text-sm p-3">
          {lastLogin && (
            <span>
              Last Login : {lastLogin}
            </span>
          )}

        </p>
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>
 
          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={() => setIsOpen(false)}
          >
            <LogOutIcon />

            <span className="text-base font-medium" onClick={handleLogout}>Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}



// "use client";

// import { useRouter } from "next/navigation";
// import { useState, useRef } from "react";

// export function UserInfo({ user }: any) {
//   const router = useRouter();
//   const [open, setOpen] = useState(false);
//   const timeoutRef = useRef<any>(null);

//   if (!user) return null;

//   const handleLogout = async () => {
//     await fetch("/api/auth/logout", { method: "POST" });
//     router.push("/auth/sign-in");
//     router.refresh();
//   };

//   return (
//     <div
//       className="relative"
//       onMouseEnter={() => {
//         clearTimeout(timeoutRef.current);
//         setOpen(true);
//       }}
//       onMouseLeave={() => {
//         timeoutRef.current = setTimeout(() => setOpen(false), 200);
//       }}
//     >
//       {/* USER */}
//       <div className="flex items-center gap-2 cursor-pointer">
//         <img
//           src="/images/user.png"
//           className="w-9 h-9 rounded-full border"
//         />
//         <span className="hidden md:block">
//           {user.Name} ({user.Role || "Admin"})
//         </span>
//       </div>

//       {/* DROPDOWN */}
//       {open && (
//         <div className="absolute right-0 mt-2 w-44 bg-white text-black rounded shadow-lg z-50">

//           <button
//             className="w-full text-left px-4 py-2 hover:bg-gray-100"
//             onClick={() => router.push("/ResetPassword")}
//           >
//             Change Password
//           </button>

//           <button
//             className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
//             onClick={handleLogout}
//           >
//             Logout
//           </button>

//         </div>
//       )}
//     </div>
//   );
// }