"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/components/ui/use-toast";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="fixed right-4 top-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="rounded-lg border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{toast.title}</p>
              {toast.description && <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => dismiss(toast.id)} title="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
