/* Minimal toast notification (client-only). */
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string) {
  if (typeof document === "undefined") return;
  let el = document.querySelector<HTMLDivElement>(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el!.classList.add("show"));
  clearTimeout(timer);
  timer = setTimeout(() => el!.classList.remove("show"), 2600);
}
