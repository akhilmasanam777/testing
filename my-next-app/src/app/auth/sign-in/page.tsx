"use client";

import Signin from "@/components/Auth/Signin";

export default function SignIn() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">

      {/* BACKGROUND */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/BNPLogin2.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-black/60" />

      {/* LEFT TEXT */}
      <div className="absolute left-20 text-white z-10">
        <h1 className="text-4xl font-bold leading-tight">
          Amended BharatNet <br />
          Program (ABP)
        </h1>

        <p className="text-xl mt-4 font-medium">
          Project Management Tool
        </p>
      </div>

      {/* LOGIN FORM (CENTER) */}
      <div className="relative z-10 flex items-center justify-center w-full">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <Signin />
        </div>
      </div>

    </div>
  );
}

