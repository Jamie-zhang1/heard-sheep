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
      <div className="sheep-wallpaper" aria-hidden="true" />
      <div className="sheep-orbit sheep-orbit-a">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-orbit sheep-orbit-b">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-orbit sheep-orbit-c">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-orbit sheep-orbit-d">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-a -right-3 top-[8%] w-20">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-b -left-3 bottom-[26%] w-16">
        <SheepIcon variant="floating" />
      </div>
      <div className="sheep-bg sheep-bg-c right-10 top-[57%] w-14">
        <SheepIcon variant="sleepy" />
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
