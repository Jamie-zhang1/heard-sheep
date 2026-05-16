"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Check,
  CheckSquare,
  ChevronRight,
  Download,
  HelpCircle,
  LogOut,
  Mic,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Star,
  Trash2,
  TrendingUp,
  type LucideIcon
} from "lucide-react";
import { PWA_INSTALL_DISMISSED_KEY, PWA_INSTALL_REQUEST_EVENT, PwaInstallPrompt } from "./PwaInstallPrompt";
import { SheepVisual } from "./SheepVisual";
import { CloseButton } from "./ui";
import { apiPath } from "@/lib/api-path";
import type { RecordItem } from "@/lib/types";

type Sheet =
  | "none"
  | "model"
  | "export"
  | "calendar"
  | "privacy"
  | "clear-confirm"
  | "notify"
  | "quality"
  | "install"
  | "pro"
  | "help"
  | "rating"
  | "logout";
type ModelOption = "Mock 模型" | "GPT 风格" | "更强分析模式";
type QualityOption = "标准" | "高品质" | "省流";

const modelOptions: Array<{ label: ModelOption; desc: string }> = [
  { label: "Mock 模型", desc: "当前使用本地 mock 输出，适合 MVP 演示。" },
  { label: "GPT 风格", desc: "占位选项，后续接入真实模型。" },
  { label: "更强分析模式", desc: "占位选项，偏完整拆解和风险检查。" }
];

export function MeClient({ initialRecords }: { initialRecords: RecordItem[] }) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [sheet, setSheet] = useState<Sheet>("none");
  const [model, setModel] = useState<ModelOption>("Mock 模型");
  const [draftModel, setDraftModel] = useState<ModelOption>("Mock 模型");
  const [quality, setQuality] = useState<QualityOption>("高品质");
  const [draftQuality, setDraftQuality] = useState<QualityOption>("高品质");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [smartReminderEnabled, setSmartReminderEnabled] = useState(true);
  const [toast, setToast] = useState("");
  const [showStorageNote, setShowStorageNote] = useState(false);

  const tasks = useMemo(() => records.flatMap((record) => record.tasks), [records]);
  const done = tasks.filter((task) => task.status === "done").length;
  const totalMinutes = Math.round(records.reduce((sum, record) => sum + (record.audioDuration ?? 0), 0) / 60);
  const usagePercent = Math.min(100, Math.round((totalMinutes / 100) * 100));
  const completedRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const activeDays = records.length
    ? Math.max(1, Math.ceil((Date.now() - new Date(records[records.length - 1].createdAt).getTime()) / 86400000))
    : 1;

  useEffect(() => {
    const saved = window.localStorage.getItem("heard-sheep-model") as ModelOption | null;
    if (saved && modelOptions.some((item) => item.label === saved)) {
      setModel(saved);
      setDraftModel(saved);
    }
    const savedQuality = window.localStorage.getItem("heard-sheep-quality") as QualityOption | null;
    if (savedQuality && ["标准", "高品质", "省流"].includes(savedQuality)) {
      setQuality(savedQuality);
      setDraftQuality(savedQuality);
    }
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function openModelSheet() {
    setDraftModel(model);
    setSheet("model");
  }

  function saveModel() {
    setModel(draftModel);
    window.localStorage.setItem("heard-sheep-model", draftModel);
    setSheet("none");
    showToast("模型设置已更新");
  }

  function openQualitySheet() {
    setDraftQuality(quality);
    setSheet("quality");
  }

  function saveQuality() {
    setQuality(draftQuality);
    window.localStorage.setItem("heard-sheep-quality", draftQuality);
    setSheet("none");
    showToast("录音质量已更新");
  }

  function exportData(type: "markdown" | "json") {
    if (type === "json") {
      downloadFile("heard-sheep-records.json", JSON.stringify(records, null, 2), "application/json");
      showToast("已导出为 JSON");
    } else {
      downloadFile("heard-sheep-records.md", toMarkdown(records), "text/markdown");
      showToast("已导出为 Markdown");
    }
    setSheet("none");
  }

  async function clearAllData() {
    const response = await fetch(apiPath("/api/records"), { method: "DELETE" });
    if (!response.ok) {
      showToast("清空失败，请稍后重试");
      return;
    }
    setRecords([]);
    setSheet("none");
    showToast("本地数据已清空");
    router.refresh();
  }

  function requestInstallGuide() {
    window.localStorage.removeItem(PWA_INSTALL_DISMISSED_KEY);
    window.dispatchEvent(new Event(PWA_INSTALL_REQUEST_EVENT));
    setSheet("none");
    showToast("已打开安装引导");
  }

  return (
    <>
      <main className="safe-scroll px-5 pb-5">
        <section className="relative mb-5 mt-2 flex flex-col items-center overflow-hidden rounded-3xl border border-brand-light bg-gradient-to-br from-brand-light/50 to-white px-6 pb-5 pt-7 shadow-card">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10" />
          <div className="relative mb-3 drop-shadow-[0_8px_18px_rgba(124,111,247,0.15)]">
            <SheepVisual variant="mascot" size="lg" decorative />
          </div>
          <div className="text-lg font-bold text-ink">职场小羊</div>
          <div className="mt-1 text-[13px] text-muted">已使用 听到了咩 {activeDays} 天</div>
          <div className="mt-3 inline-flex h-7 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-3.5 text-xs font-bold text-white shadow-btn">
            <Star size={12} fill="currentColor" />
            Pro 会员 · MVP 占位
          </div>
        </section>

        <section className="mb-5 grid grid-cols-3 overflow-hidden rounded-2xl bg-white shadow-card">
          <Stat value={records.length} label="录音次数" icon={Mic} onClick={() => router.push("/history?filter=recordings")} />
          <Stat value={tasks.length} label="全部任务" icon={CheckSquare} onClick={() => router.push("/tasks?filter=all")} />
          <Stat value={done} label="已完成" icon={TrendingUp} onClick={() => router.push("/tasks?filter=done")} />
        </section>

        <PwaInstallPrompt />

        <section className="mb-5 rounded-2xl bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-ink">本月录音用量</div>
            <div className="text-[11px] font-semibold text-muted">{totalMinutes} / 100 分钟</div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${usagePercent}%` }} />
          </div>
          <div className="mt-2 text-[11px] leading-5 text-muted">
            参照原型保留用量进度，当前任务完成率 {completedRate}%。
          </div>
        </section>

        <SettingGroup title="偏好设置">
          <Setting icon={Bell} title="通知提醒" value={notificationEnabled ? "已开启" : "已关闭"} onClick={() => setSheet("notify")} />
          <Setting icon={Mic} title="录音质量" value={quality} onClick={openQualitySheet} />
          <Setting icon={SlidersHorizontal} title="AI 模型设置" value={model} onClick={openModelSheet} />
        </SettingGroup>

        <SettingGroup title="数据与联动">
          <Setting icon={Download} title="导出数据" value="Markdown / JSON" onClick={() => setSheet("export")} />
          <Setting icon={CalendarDays} title="接入日历" value="待接入" onClick={() => setSheet("calendar")} />
        </SettingGroup>

        <SettingGroup title="账号与帮助">
          <Setting icon={Smartphone} title="安装到手机" value="PWA" onClick={() => setSheet("install")} />
          <Setting icon={Shield} title="账号与隐私" value="本地 MVP" onClick={() => setSheet("privacy")} />
          <Setting icon={Star} title="会员升级" value="解锁更多能力" onClick={() => setSheet("pro")} />
          <Setting icon={HelpCircle} title="使用帮助" value="" onClick={() => setSheet("help")} />
          <Setting icon={Star} title="给我们评分" value="" onClick={() => setSheet("rating")} />
          <Setting icon={LogOut} title="退出登录" value="MVP 模拟" onClick={() => setSheet("logout")} />
        </SettingGroup>
      </main>

      {toast && (
        <div className="absolute bottom-[calc(92px+var(--safe-bottom))] left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-xs font-bold text-white shadow-sheep">
          <SheepVisual variant="success" size="xs" decorative motion="none" />
          {toast}
        </div>
      )}

      {sheet !== "none" && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/30">
          <div className="mobile-sheet flex max-h-[78vh] w-full flex-col rounded-t-[32px] bg-white shadow-sheep">
            <div className="mx-auto mt-3 h-1 w-9 rounded bg-line" />

            {sheet === "model" && (
              <SheetBody title="AI 模型设置" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  {modelOptions.map((item) => {
                    const active = draftModel === item.label;
                    return (
                      <button
                        key={item.label}
                        onClick={() => setDraftModel(item.label)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                          active ? "border-brand bg-brand-light" : "border-line bg-white"
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-brand bg-brand text-white" : "border-line"}`}>
                          {active && <Check size={13} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">{item.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted">{item.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <SheetActions primary="保存" onPrimary={saveModel} secondary="取消" onSecondary={() => setSheet("none")} />
              </SheetBody>
            )}

            {sheet === "export" && (
              <SheetBody title="导出数据" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <ActionRow icon={Download} title="导出为 Markdown" desc="适合复制到文档或周报" onClick={() => exportData("markdown")} />
                  <ActionRow icon={Download} title="导出为 JSON" desc="保留完整结构化数据" onClick={() => exportData("json")} />
                </div>
                <button onClick={() => setSheet("none")} className="mt-4 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-bold transition active:bg-surface-2">
                  取消
                </button>
              </SheetBody>
            )}

            {sheet === "calendar" && (
              <SheetBody title="接入日历" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-3 text-[13px] leading-6 text-muted">
                  当前为 MVP 阶段，日历联动能力暂未正式接入。
                </div>
                <div className="mt-3 space-y-2">
                  <FeatureSoon title="Apple 日历" />
                  <FeatureSoon title="Google Calendar" />
                  <FeatureSoon title="Outlook" />
                </div>
                <SheetActions
                  primary="预约此功能"
                  onPrimary={() => {
                    setSheet("none");
                    showToast("已记录你的预约意向");
                  }}
                  secondary="知道了"
                  onSecondary={() => setSheet("none")}
                />
              </SheetBody>
            )}

            {sheet === "notify" && (
              <SheetBody title="通知提醒" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <ToggleRow
                    title="任务截止提醒"
                    desc="在待办临近截止时提醒你确认进度"
                    checked={notificationEnabled}
                    onClick={() => setNotificationEnabled((value) => !value)}
                  />
                  <ToggleRow
                    title="智能确认提醒"
                    desc="有缺失信息或需确认事项时提示复核"
                    checked={smartReminderEnabled}
                    onClick={() => setSmartReminderEnabled((value) => !value)}
                  />
                </div>
                <button
                  onClick={() => {
                    setSheet("none");
                    showToast("提醒设置已更新");
                  }}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]"
                >
                  完成
                </button>
              </SheetBody>
            )}

            {sheet === "quality" && (
              <SheetBody title="录音质量" onClose={() => setSheet("none")}>
                <div className="grid grid-cols-3 gap-2">
                  {(["省流", "标准", "高品质"] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => setDraftQuality(item)}
                      className={`inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] ${
                        draftQuality === item ? "bg-brand text-white shadow-btn" : "bg-surface-2 text-ink-2"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  当前仍使用浏览器 MediaRecorder，质量选项先作为原型交互保留，后续接真实录音参数。
                </p>
                <SheetActions primary="保存" onPrimary={saveQuality} secondary="取消" onSecondary={() => setSheet("none")} />
              </SheetBody>
            )}

            {sheet === "install" && (
              <SheetBody title="安装到手机" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-4 text-center">
                  <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-card">
                    <SheepVisual variant="cheer" size="md" decorative motion="bounce" />
                  </div>
                  <div className="text-sm font-black text-ink">把《听到了咩》放到主屏幕</div>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Android Chrome 支持时可直接触发安装；iPhone Safari 请点击分享按钮，再选择“添加到主屏幕”。
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  <FeatureSoon title="iPhone Safari：分享 → 添加到主屏幕" />
                  <FeatureSoon title="Android Chrome：菜单 → 安装应用" />
                </div>
                <SheetActions primary="打开安装引导" onPrimary={requestInstallGuide} secondary="知道了" onSecondary={() => setSheet("none")} />
              </SheetBody>
            )}

            {sheet === "privacy" && (
              <SheetBody title="账号与隐私" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-3 text-[13px] leading-6">
                    <div className="font-bold text-ink">当前为本地 MVP 模式</div>
                    <p className="mt-1 text-muted">历史记录、任务和分析结果主要保存在项目本地 JSON 文件中。</p>
                  </div>
                  <button
                    onClick={() => setShowStorageNote((value) => !value)}
                    className="flex w-full items-center justify-between rounded-2xl border border-line bg-white p-3 text-left text-sm font-bold transition active:bg-surface-2"
                  >
                    查看本地存储说明
                    <ChevronRight size={16} className={showStorageNote ? "rotate-90 transition" : "transition"} />
                  </button>
                  {showStorageNote && (
                    <div className="rounded-2xl border border-line bg-white p-3 text-xs leading-6 text-muted">
                      数据文件位于项目的 data/records.json。清空后会删除当前 MVP 的全部历史记录和任务。
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={() => setSheet("clear-confirm")} className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
                    <Trash2 size={15} />
                    清空全部数据
                  </button>
                  <button onClick={() => setSheet("none")} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
                    返回
                  </button>
                </div>
              </SheetBody>
            )}

            {sheet === "clear-confirm" && (
              <SheetBody title="确认清空数据" onClose={() => setSheet("privacy")}>
                <div className="rounded-2xl border border-line bg-white p-3 text-[13px] leading-6 shadow-card">
                  清空后，本地历史记录和任务会被删除。这个操作适合重置 MVP 演示数据。
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={clearAllData} className="inline-flex h-11 items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white transition active:scale-[0.99]">
                    确认清空
                  </button>
                  <button onClick={() => setSheet("privacy")} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
                    返回
                  </button>
                </div>
              </SheetBody>
            )}

            {sheet === "pro" && (
              <SheetBody title="会员升级" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-brand-light bg-brand-light/50 p-4 text-[13px] leading-6">
                  <div className="font-bold text-ink">Pro 会员能力仍是 MVP 占位</div>
                  <p className="mt-1 text-muted">后续可以开放更长录音、批量导出、日历联动和更强模型分析。</p>
                </div>
                <button
                  onClick={() => {
                    setSheet("none");
                    showToast("已记录升级意向");
                  }}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]"
                >
                  预约 Pro
                </button>
              </SheetBody>
            )}

            {sheet === "help" && (
              <SheetBody title="使用帮助" onClose={() => setSheet("none")}>
                <div className="space-y-2">
                  <HelpItem title="1. 先录音" desc="把领导、会议或同事的口头交代录下来。" />
                  <HelpItem title="2. 确认转写" desc="检查文字是否准确，必要时手动修正。" />
                  <HelpItem title="3. 生成任务" desc="AI 会拆出待办、执行步骤、缺失信息和确认问题。" />
                  <HelpItem title="4. 回到任务页" desc="按状态筛选待处理、需确认和已完成事项。" />
                </div>
              </SheetBody>
            )}

            {sheet === "rating" && (
              <SheetBody title="给我们评分" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-line bg-white p-4 text-center shadow-card">
                  <div className="mb-2 text-2xl">★★★★★</div>
                  <p className="text-sm font-bold text-ink">你觉得这只小羊有帮上忙吗？</p>
                  <p className="mt-1 text-xs leading-5 text-muted">评分入口先做本地反馈，正式版会接入真实反馈系统。</p>
                </div>
                <button
                  onClick={() => {
                    setSheet("none");
                    showToast("谢谢你的反馈");
                  }}
                  className="mt-4 w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]"
                >
                  提交评分
                </button>
              </SheetBody>
            )}

            {sheet === "logout" && (
              <SheetBody title="退出登录" onClose={() => setSheet("none")}>
                <div className="rounded-2xl border border-line bg-white p-4 text-[13px] leading-6 shadow-card">
                  当前是本地 MVP 模式，暂无真实账号会话。点击确认只会给出演示反馈，不会删除本地数据。
                </div>
                <SheetActions
                  primary="确认退出"
                  onPrimary={() => {
                    setSheet("none");
                    showToast("已退出演示账号");
                  }}
                  secondary="取消"
                  onSecondary={() => setSheet("none")}
                />
              </SheetBody>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ value, label, icon: Icon, onClick }: { value: number; label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
        className="group relative border-r border-line py-4 text-center transition hover:bg-brand-light/40 active:bg-brand-light/60 last:border-r-0"
    >
        <span className="absolute right-2 top-2 text-[10px] font-black text-line transition group-hover:text-brand">↗</span>
        <span className="mb-1 flex items-center justify-center gap-1.5">
          <Icon size={15} className="text-brand" />
          <span className="text-2xl font-bold text-ink">{value}</span>
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.5px] text-muted">{label}</span>
    </button>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 overflow-hidden rounded-2xl bg-white shadow-card">
      <GroupTitle title={title} />
      {children}
    </section>
  );
}

function GroupTitle({ title }: { title: string }) {
  return (
    <div className="bg-surface-2 px-5 py-2 text-[11px] font-bold uppercase tracking-[1.5px] text-muted">
      {title}
    </div>
  );
}

function Setting({
  icon: Icon,
  title,
  value,
  onClick
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between border-b border-line bg-white px-5 py-3.5 text-left transition active:bg-surface-2 last:border-b-0">
      <span className="flex min-w-0 items-center gap-3 text-sm font-semibold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
          <Icon size={15} />
        </span>
        <span className="truncate">{title}</span>
      </span>
      <span className="ml-3 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
        {value}
        <ChevronRight size={14} />
      </span>
    </button>
  );
}

function SheetBody({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between px-6 py-3">
        <div className="text-base font-black">{title}</div>
        <CloseButton onClick={onClose} className="h-10 w-10 bg-transparent hover:bg-surface-2 active:bg-surface-2" />
      </div>
      <div className="safe-scroll px-6 safe-bottom-pad">{children}</div>
    </>
  );
}

function SheetActions({
  primary,
  onPrimary,
  secondary,
  onSecondary
}: {
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button onClick={onSecondary} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold transition active:bg-surface-2">
        {secondary}
      </button>
      <button onClick={onPrimary} className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-btn transition active:scale-[0.99]">
        {primary}
      </button>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  desc,
  onClick
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition active:bg-surface-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
        <Icon size={16} />
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs text-muted">{desc}</span>
      </span>
    </button>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onClick
}: {
  title: string;
  desc: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left shadow-card transition active:bg-surface-2">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{desc}</span>
      </span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-brand" : "bg-surface-2"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function HelpItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
      <div className="text-sm font-bold text-ink">{title}</div>
      <p className="mt-1 text-xs leading-5 text-muted">{desc}</p>
    </div>
  );
}

function FeatureSoon({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-card">
      <span className="text-sm font-bold">{title}</span>
      <span className="inline-flex h-7 items-center justify-center rounded-full bg-brand-light px-3 text-[11px] font-bold text-brand">
        即将支持
      </span>
    </div>
  );
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(records: RecordItem[]) {
  if (!records.length) return "# 听到了咩导出\n\n暂无记录。\n";
  return records
    .map((record) => {
      const tasks = record.tasks
        .map((task, index) => `${index + 1}. ${task.title}（${task.status}）\n   - 截止：${task.deadlineText || "未明确"}\n   - 依据：${task.sourceEvidence}`)
        .join("\n");
      return `# ${record.title}\n\n${record.summary}\n\n## 任务\n\n${tasks}\n`;
    })
    .join("\n---\n");
}
