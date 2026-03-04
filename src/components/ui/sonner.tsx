"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      theme="light"
      toastOptions={{
        style: {
          borderRadius: "0.75rem",
          border: "1px solid var(--line)",
          background: "white",
        },
      }}
    />
  );
}
