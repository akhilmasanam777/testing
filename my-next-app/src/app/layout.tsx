import "@/css/satoshi.css";
import "@/css/style.css";
import "flatpickr/dist/flatpickr.min.css";

import { cookies } from "next/headers";
import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "./providers";
import { AppLayout } from "@/AppLayout";
import SessionHandler from "./SessionHandler";

export default async function RootLayout({ children }: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Fix image paths */}
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />
           <SessionHandler />
          {!token ? children : <AppLayout>{children}</AppLayout>}
          
        </Providers>
      </body>
    </html>
  );
}

