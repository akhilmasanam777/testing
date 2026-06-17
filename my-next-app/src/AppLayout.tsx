"use client";

import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { usePathname } from "next/navigation";


export function AppLayout({children}:{children:React.ReactNode}){
     const { isOpen } = useSidebarContext();
     const pathname = usePathname();
     const isAuthPage = pathname?.startsWith("/auth");

     if (isAuthPage) {
        return <>{children}</>;
     }

     return(
        <div className="flex">
            {isOpen &&<Sidebar/>}
            <div
            className={`flex flex-col min-h-screen 
                transition-[width] duration-300 ${
    isOpen ? "flex-1 min-w-0" : "w-full"
  }`}>
             <Header/>
             <main className="min-w-0 overflow-x-auto">{children}</main>   
            </div>

        </div>
     )

}
