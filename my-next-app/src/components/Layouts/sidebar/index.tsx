"use client";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, ChevronUp } from "./icons";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import * as Icons from "./icons";
import { toTitleCase } from "@/lib/text";

const ROUTE_PATH_OVERRIDES: Record<string, string> = {
  "/block": "/Block",
  "/boq": "/LinkView",
  "/checkboxvalues": "/CheckBoxValues",
  "/dashboardtaskconfig": "/DashboardTaskConfig",
  "/districts": "/Districts",
  "/dms": "/DMS",
  "/dropdownvalues": "/DropDownValues",
  "/dynamicvalues": "/DropDownValues",
  "/ganttview": "/ganttView",
  "/gis": "/GIS",
  "/gpnames": "/GPNames",
  "/hierarchy": "/Hierarchy",
  "/hierarchyconfig": "/HierarchyConfig",
  "/hyraricy": "/Hyraricy",
  "/invoice module": "/InvoiceModule",
  "/invoicemodule": "/InvoiceModule",
  "/linktaskview": "/LinkTaskView",
  "/linkview": "/LinkView",
  "/package": "/Package",
  "/progressdashboard": "/ProgressDashboard",
  "/radiobuttonvalues": "/RadioButtonValues",
  "/row request": "/RowRequest",
  "/rowrequest": "/RowRequest",
  "/sublinktaskview": "/SublinkTaskView",
 "/sublinkview": "/SubLinkView",
  "/surveydashboard": "/SurveyDashboard",
  "/taskdashboard": "/TaskDahboard",
  "/taskdahboard": "/TaskDahboard",
  "/tasklist": "/TaskList",
  "/timeline": "/Timeline",
  "/user": "/User",
  "/users": "/User",
  "/zonetaskview": "/ZoneTaskView",
  "/zones": "/Zones",
};

function normalizeMenuUrl(url?: string) {
  const rawUrl = url?.trim() || "/";

  if (/^(https?:|mailto:|tel:|#)/i.test(rawUrl)) {
    return rawUrl;
  }

  const localUrl = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  const separatorIndex = localUrl.search(/[?#]/);
  const path = separatorIndex === -1 ? localUrl : localUrl.slice(0, separatorIndex);
  const suffix = separatorIndex === -1 ? "" : localUrl.slice(separatorIndex);

  return `${ROUTE_PATH_OVERRIDES[path.toLowerCase()] || path}${suffix}`;
}


export function Sidebar() {
  const pathname = usePathname();
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const [navData, setNavData] = useState<any[]>([]);


const toggleExpanded = (title: string, hasActiveChild: boolean) => {
  if (hasActiveChild) return; // locked open, no toggling
  setExpandedItems((prev) => (prev.includes(title) ? [] : [title]));
};

  const getUrlPath = (url: string) => normalizeMenuUrl(url).split(/[?#]/)[0].toLowerCase();

  const MenuiconMap: Record<string, any> = {
    "Dash Board": Icons.HomeIcon,
    "Task Details": Icons.Table,
    "GIS": Icons.PieChart,
    "Task Management": Icons.FourCircle,
    "Plan Tool": Icons.Calendar,
    "Videos": Icons.User,
    "DMS": Icons.Authentication,
    "Invoice Module": Icons.Alphabet,
    "Row Request": Icons.Table,
  };

  const subMenuIconMap: Record<string, any> = {
    "PM Reports": Icons.Table,
    "Zones": Icons.PieChart,
    "Package": Icons.FourCircle,
    "Districts": Icons.Calendar,
    "Block": Icons.HomeIcon,
  };


  useEffect(() => {
    async function loadMenu() {
      try { 

        const res = await fetch("/api/menu", {
          credentials: "include",
        });

        if (!res.ok) {
          console.error("API failed", res.status);
          return;
        }

        const data = await res.json();
        console.log("Menu data:", data);

        if (!data.menuList || !data.categoryList) {
          console.error("Invalid data", data);
          return;
        }
 const  hiddenMenuItemIds=[14,15,84,85]
        // const formatted = data.categoryList.map((cat: any) => ({
        //   id: cat.Id,
        //   items: [
        //     {
        //       title: cat.Name,
        //       icon: MenuiconMap[cat.Name] || Icons.HomeIcon,
        //       items: data.menuList
        //         .filter((m: any) => m.MenuCategoryId === cat.Id)
        //         .map((m: any) => ({
        //           title: m.Name || "Untitled",
        //           url:
        //             m.P?.trim().toLowerCase() === "executivedashboard"
        //               ? "/"
        //               : normalizeMenuUrl(`/${m.P?.trim()}`),

        //           // url: `/${m.P?.trim()}`,
        //           // url: normalizeMenuUrl(m.urlpath),
              
        //         })),
        //     },
        //   ],
        // }));


          const formatted = data.categoryList.map((cat: any) => {
  const children = data.menuList
    .filter((m: any) => m.MenuCategoryId === cat.Id)
    .filter((m: any) => !hiddenMenuItemIds.includes(m.Id))
    .sort((a: any, b: any) => (a.O || 0) - (b.O || 0))
    .map((m: any) => ({
      title: m.Name || "Untitled",
      url:
        m.P?.trim().toLowerCase() === "executivedashboard"
          ? "/"
          : normalizeMenuUrl(`/${m.P?.trim()}`),
    }));

  // only one child -> make category itself a link
  if (children.length === 1) {
    return {
      id: cat.Id,
      items: [
        {
          title: cat.Name,
          icon: MenuiconMap[cat.Name] || Icons.HomeIcon,
          url: children[0].url,
          items: [],
        },
      ],
    };
  }

  // multiple children -> dropdown
  return {
    id: cat.Id,
    items: [
      {
        title: cat.Name,
        icon: MenuiconMap[cat.Name] || Icons.HomeIcon,
        items: children,
      },
    ],
  };
});
        setNavData(formatted);
      } catch (err) {
        console.error("Sidebar error:", err);
      }
    }

    loadMenu();
  }, []);

  // Auto expand active
  useEffect(() => {
    navData.forEach((section) => {
      section.items.forEach((item: any) => {
        item.items?.forEach((sub: any) => {
          if (getUrlPath(sub.url) === pathname?.toLowerCase()) {
            toggleExpanded(item.title, true);
          }
        });
      });
    });
  }, [pathname, navData]);

  // PREVENT HYDRATION ISSUE
  if (!navData.length) return null;

  return (
    <>
      {/* Overlay */}
      {isMobile && isOpen && (
        <div
          className="app-sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "app-sidebar",
          isMobile ? "app-sidebar-mobile" : "app-sidebar-desktop",
          isOpen ? "app-sidebar-open" : "app-sidebar-close"
        )}
      >
        <div className="app-sidebar-inner">

          {/* Logo */}
          <div className="app-sidebar-logo">
            <Link
              href={"/"}
              onClick={() => isMobile && toggleSidebar()}
              className="px-0 py-2.5 min-[850px]:py-0"
            >
              <Logo />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute left-3/4 right-4.5 top-1/2 -translate-y-1/2"
              >
                <ArrowLeftIcon className="ml-auto size-7" />
              </button>
            )}
                <span className="app-sidebar-logo-text">Build</span>
          </div>
      

          {/* Menu */}

          <div className="app-sidebar-scroll">
            {navData.map((section) => (
              <div key={section.id} className="mb-6">
                <h2 className="app-sidebar-section-title">
              {toTitleCase(section.label)} 
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="app-sidebar-menu">
                    {section.items.map((item: any) => (
                      <li key={item.title}>
                        {item.items.length ? (
                          <>
                            <MenuItem
                              as="button"
                              isActive={item.items.some(
                                (sub: any) => getUrlPath(sub.url) === pathname?.toLowerCase()
                              )}
                              onClick={() =>
  toggleExpanded(
    item.title,
    item.items.some((sub: any) => getUrlPath(sub.url) === pathname?.toLowerCase())
  )
}
                            >
                              <item.icon className="size-6 shrink-0" />
                              <span>{item.title}</span>

                              <ChevronUp
                                className={cn(
  "ml-auto rotate-180 transition-transform duration-200",
  (expandedItems.includes(item.title) ||
    item.items.some((sub: any) => getUrlPath(sub.url) === pathname?.toLowerCase())
  ) && "rotate-0"
)}
                              />
                              
                            </MenuItem>

                            {/* CHILD */}
                            {(
                            expandedItems.includes(item.title) ||
                             item.items.some((sub: any) => getUrlPath(sub.url) === pathname?.toLowerCase())
                          ) && (
                              <ul className="app-sidebar-submenu">
                                {item.items.map((sub: any) => {
                                  const SubIcon = subMenuIconMap[sub.title] || Icons.HomeIcon;

                                  return (
                                    <li key={sub.title}>
                                      <MenuItem
                                        as="link"
                                        href={sub.url}
                                        isActive={pathname?.toLowerCase() === getUrlPath(sub.url)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-5 h-5 flex items-center justify-center">
                                            <SubIcon className="w-4 h-4" />
                                          </div>

                                         <span>{toTitleCase(sub.title)}</span>
                                        </div>
                                      </MenuItem>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                          </>
                        ) : (
                          <MenuItem
                            className="flex items-center gap-3 py-3"
                            as="link"
                            href={item.url}
                            isActive={pathname === item.url}
                          >
                            <item.icon className="size-6 shrink-0" />
                            <span>{item.title}</span>
                          </MenuItem>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>
          <div> 
          </div>

        </div>

      </aside>

      
    </>
  );
}
