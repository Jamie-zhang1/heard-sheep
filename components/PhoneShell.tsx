import clsx from "clsx";
import { BottomNav } from "./BottomNav";

type PhoneShellProps = {
  active?: "home" | "tasks" | "history" | "me";
  children: React.ReactNode;
  hideNav?: boolean;
  dark?: boolean;
};

export function PhoneShell({ active = "home", children, hideNav = false, dark = false }: PhoneShellProps) {
  return (
    <main className={clsx("phone-frame", dark && "phone-frame-dark")}>
      <div className="app-ambient" aria-hidden="true" />
      <StatusBar />
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</section>
      {!hideNav && <BottomNav active={active} />}
    </main>
  );
}

export function StatusBar() {
  return (
    <div className="relative z-10 flex h-[52px] shrink-0 items-center justify-between px-7 pt-3 text-[14px] font-bold">
      <span>9:41</span>
      <div className="flex items-center gap-1.5" aria-hidden="true">
        <span className="flex h-3 items-end gap-[2px]">
          <i className="h-1 w-[3px] rounded-sm bg-current" />
          <i className="h-2 w-[3px] rounded-sm bg-current" />
          <i className="h-3 w-[3px] rounded-sm bg-current" />
        </span>
        <svg viewBox="0 0 20 14" className="h-3.5 w-5" fill="none">
          <path d="M2 5.2A12.5 12.5 0 0 1 18 5.2M5.2 8.4a7.8 7.8 0 0 1 9.6 0M8.4 11.4a2.8 2.8 0 0 1 3.2 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="relative h-3 w-6 rounded-[3px] border border-current p-[1px]">
          <i className="block h-full w-[88%] rounded-[1px] bg-current" />
          <i className="absolute -right-[3px] top-[3px] h-1 w-[2px] rounded-r bg-current" />
        </span>
      </div>
    </div>
  );
}
