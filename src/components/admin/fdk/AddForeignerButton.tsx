"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { CreateForeignerForm } from "./CreateForeignerForm";

export function AddForeignerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
      >
        <UserPlus className="h-4 w-4" /> Dodaj cudzoziemca
      </button>
      {open && <CreateForeignerForm onClose={() => setOpen(false)} />}
    </>
  );
}
