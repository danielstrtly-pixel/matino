"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="text-gray-600 hover:text-red-600 transition-colors"
    >
      Logga ut
    </button>
  );
}
