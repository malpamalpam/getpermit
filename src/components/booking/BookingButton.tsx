"use client";

import { useState, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { BookingDialog } from "./BookingDialog";

type Props = Omit<ButtonProps, "onClick"> & {
  children: ReactNode;
};

export function BookingButton({ children, ...buttonProps }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <BookingDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
