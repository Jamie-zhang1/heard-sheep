import clsx from "clsx";
import { BottomNav } from "./BottomNav";
import { SheepIcon } from "./SheepIcon";

type PhoneShellProps = {
  active?: "home" | "tasks" | "history" | "me";
  children: React.ReactNode;
  hideNav?: boolean;
  dark?: boolean;
};

export function PhoneShell({ active = "home", children, hideNav = false, dark = false }: PhoneShellProps) {
  return (
    <main className={clsx("phone-frame", dark && "phone-frame-dark")}>
      <div className="sheep-bg sheep-bg-a -right-6 top-[10%] w-28">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-b -left-4 bottom-[24%] w-24">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-c right-8 top-[58%] w-20">
        <SheepIcon variant="sleepy" />
      </div>
      <div className="sheep-bg sheep-bg-d left-10 top-[30%] w-16">
        <SheepIcon variant="tiny" />
      </div>
      <div className="sheep-bg sheep-bg-e right-5 top-[37%] w-14">
        <SheepIcon variant="tiny" />
      </div>
      <div className="sheep-bg sheep-bg-f left-8 top-[63%] w-20">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-g right-10 bottom-[10%] w-24">
        <SheepIcon variant="sleepy" />
      </div>
      <div className="sheep-bg sheep-bg-h left-5 bottom-[6%] w-14">
        <SheepIcon variant="tiny" />
      </div>
      <StatusBar />
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</section>
      {!hideNav && <BottomNav active={active} />}
    </main>
  );
}

export function StatusBar() {
  return (
    <div className="relative z-10 flex h-[54px] shrink-0 items-center justify-between px-7 pt-4 text-[15px] font-bold">
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <span className="text-xs">5G</span>
        <span className="text-xs">100%</span>
      </div>
    </div>
  );
}
