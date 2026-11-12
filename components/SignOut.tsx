"use client";
export default function SignOut() {
  return (
    <button
      className="ml-3 text-slate-600 underline"
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        location.assign("/login");
      }}
    >
      Sign out
    </button>
  );
}
