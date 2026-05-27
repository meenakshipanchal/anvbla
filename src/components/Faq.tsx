"use client";

import { useState } from "react";
import { FAQS } from "@/lib/data";
import { Chevron } from "./Icons";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[820px]">
      {FAQS.map((f, i) => (
        <div key={i} className={`faq-item mb-3 overflow-hidden rounded-2xl border border-line bg-white ${open === i ? "open" : ""}`}>
          <button
            className="flex w-full items-center justify-between gap-4 px-5 py-4.5 py-4 text-left text-base font-semibold"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {f.q}
            <Chevron className="text-blue" />
          </button>
          <div className="faq-a text-muted">
            <p className="px-5 pb-4">{f.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
