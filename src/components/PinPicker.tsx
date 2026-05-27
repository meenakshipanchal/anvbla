"use client";

import dynamic from "next/dynamic";

const PinPickerInner = dynamic(() => import("./PinPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-white text-muted" style={{ zIndex: 9999 }}>
      Loading map…
    </div>
  ),
});

export type PickedSpot = { lat: number; lng: number; address: string };

export default function PinPicker({
  initial,
  onPick,
  onCancel,
}: {
  initial: { lat: number; lng: number };
  onPick: (spot: PickedSpot) => void;
  onCancel: () => void;
}) {
  return (
    <PinPickerInner
      initial={initial}
      onPick={(p, address) => onPick({ ...p, address })}
      onCancel={onCancel}
    />
  );
}
