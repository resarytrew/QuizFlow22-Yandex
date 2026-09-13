import React, { useEffect, useRef } from "react";
export function AdminDialog({
  children,
  label,
  onClose,
  busy = false,
}: {
  children: React.ReactNode;
  label: string;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border-0 bg-transparent p-0 text-white backdrop:bg-black/70"
    >
      {children}
    </dialog>
  );
}
