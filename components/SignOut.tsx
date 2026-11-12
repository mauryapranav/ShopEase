"use client";
export default function SignOut() {
  return (
    <button
      className="ml-3 text-white underline"
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        location.assign("/login");
      }}
    >
      Sign out
    </button>
  );
}
