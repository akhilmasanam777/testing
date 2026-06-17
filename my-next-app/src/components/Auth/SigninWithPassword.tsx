// "use client";
// import { EmailIcon, PasswordIcon } from "@/assets/icons";
// import Link from "next/link";
// import React, { useState } from "react";
// import InputGroup from "../FormElements/InputGroup";
// import { Checkbox } from "../FormElements/checkbox";
// import Image from "next/image";

// export default function SigninWithPassword() {
//   const [data, setData] = useState({
//     email: process.env.NEXT_PUBLIC_DEMO_USER_MAIL || "",
//     password: process.env.NEXT_PUBLIC_DEMO_USER_PASS || "",
//     remember: false,
//   });

//   const [loading, setLoading] = useState(false);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setData({
//       ...data,
//       [e.target.name]: e.target.value,
//     });
//   };


//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     setLoading(true);

//     try {
//       const res = await fetch("/api/login", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           Email: data.email,
//           Password: data.password,
//         }),
//       });

//       const result = await res.json();

//       if (!res.ok || !result.success) {
//         alert("Invalid login");
//         return;
//       }

//       // SAVE LOGIN TIME HERE
//       localStorage.setItem("loginTime", result.loginTime);

//       // Redirect
//       window.location.href = "/";

//     } catch (err) {
//       alert("Login error");
//     }

//     setLoading(false);
//   };

//   return (
//     <>
//       {/* Logo */}
//       <div className="mb-6 flex justify-center">
//         <Image
//           src="/images/traxionlogo.png"
//           alt="TraxionLogo"
//           width={150}
//           height={50}
//           priority
//         />
//       </div>

//       {/* Form */}
//       <form onSubmit={handleSubmit}>
//         <InputGroup
//           type="email"
//           label="Email"
//           className="mb-4 [&_input]:py-[15px]"
//           placeholder="Enter your email"
//           name="email"
//           handleChange={handleChange}
//           value={data.email}
//           icon={<EmailIcon />}
//         />

//         <InputGroup
//           type="password"
//           label="Password"
//           className="mb-5 [&_input]:py-[15px]"
//           placeholder="Enter your password"
//           name="password"
//           handleChange={handleChange}
//           value={data.password}
//           icon={<PasswordIcon />}
//         />

//         <div className="mb-6 flex items-center justify-between gap-2 py-2 font-medium">
//           <Checkbox
//             label="Remember me"
//             name="remember"
//             withIcon="check"
//             minimal
//             radius="md"
//             onChange={(e) =>
//               setData({
//                 ...data,
//                 remember: e.target.checked,
//               })
//             }
//           />

//           <Link
//             href="/auth/forgot-password"
//             className="hover:text-primary dark:text-white dark:hover:text-primary"
//           >
//             Forgot Password?
//           </Link>
//         </div>

//         <div className="mb-4.5">
//           <button
//             type="submit"
//             className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary p-4 font-medium text-white transition hover:bg-opacity-90"
//           >
//             Sign In
//             {loading && (
//               <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
//             )}
//           </button>
//         </div>
//       </form>
//     </>
//   );

// }


"use client";

import { EmailIcon, PasswordIcon } from "@/assets/icons";
import Link from "next/link";
import React, { useState } from "react";
import InputGroup from "../FormElements/InputGroup";
import { Checkbox } from "../FormElements/checkbox";
import Image from "next/image";

export default function SigninWithPassword() {
  const [data, setData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Email: data.email,
          Password: data.password,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        alert("Invalid login");
        return;
      }

      localStorage.setItem("loginTime", result.loginTime);
      window.location.href = "/";
    } catch {
      alert("Login error");
    }

    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <Image
            src="/images/traxionlogo.png"
            alt="Traxion Logo"
            width={200}
            height={80}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="auth-input">
            <InputGroup
              type="text"
              label="User Name"
              placeholder="Enter your user name"
              name="email"
              handleChange={handleChange}
              value={data.email}
              icon={<EmailIcon />}
            />
          </div>
          
          <div className="auth-input">
            <InputGroup
              type="password"
              label="Password"
              placeholder="Enter your password"
              name="password"
              handleChange={handleChange}
              value={data.password}
              icon={<PasswordIcon />}
            />
          </div>

          <div className="auth-options">
            <Checkbox
              label="Remember me"
              name="remember"
              withIcon="check"
              minimal
              radius="md"
              onChange={(e) =>
                setData({ ...data, remember: e.target.checked })
              }
            />

            <Link href="/auth/forgot-password" className="auth-forgot">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="auth-btn">
            Sign In
            {loading && <span className="auth-loader" />}
          </button>
        </form>
      </div>
    </div>
  );
}