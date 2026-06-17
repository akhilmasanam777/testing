"use client";

import { useEffect } from "react";

export default function SessionHandler() {

  const refreshToken = async () => {
    try {
      const response = await fetch("/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      console.log("Refresh status:", response.status);
    } catch (err) {
      console.error("Token refresh failed", err);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000); // every 10 minutes

    return () => clearInterval(interval);
  }, []);

  return null;
}













// "use client";

// import {useEffect} from "react";

// export default function SessionHandler(){


//   //     useEffect(()=>{
// //         let refreshTimer: NodeJS.Timeout;

// //         const refreshToken= async()=>{
// //             try {
// //                 await fetch("/auth/refresh",{
// //                     method:"POST", 
// //                     credentials:"include",
// //                 });
// //             }catch(err){
// //                 console.error("Token refresh failed", err);
// //             }};

// //             const handleActivity=()=>{
// //                 clearTimeout(refreshTimer);
// //                   refreshToken();
          
// //               refreshTimer= setTimeout(()=>{
// //                 window.location.href="/auth/sign-in";
// //               }, 30*60*1000 );
// //             }
// //  window.addEventListener("mousemove", handleActivity);
// //     window.addEventListener("keydown", handleActivity);

// //     return () => {
// //       window.removeEventListener("mousemove", handleActivity);
// //       window.removeEventListener("keydown", handleActivity);
// //       clearTimeout(refreshTimer);
// //     };
// //   }, []);

//   return null;
// }