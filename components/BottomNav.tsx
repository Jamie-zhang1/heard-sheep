import Link from "next/link";
import { Clock3, Home, ListTodo, UserRound } from "lucide-react";
import clsx from "clsx";

type NavKey = "home" | "tasks" | "history" | "me";

const items: Array<{ key: NavKey; label: string; href: string; icon: typeof Home }> = [
  { key: "home", label: "首页", href: "/", icon: Home },
  { key: "tasks", label: "任务", href: "/tasks", icon: ListTodo },
  { key: "history", label: "历史", href: "/history", icon: Clock3 },
  { key: "me", label: "我的", href: "/me", icon: UserRound }
];

export function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav className="safe-bottom-nav relative z-10 flex shrink-0 border-t border-line bg-white px-0 pt-2 shadow-[0_-8px_24px_rgba(26,25,22,0.04)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium tracking-[0.02em] transition active:scale-[0.98]",
              isActive ? "text-brand" : "text-muted"
            )}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.6} />
            <span className={clsx(isActive && "font-semibold")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
