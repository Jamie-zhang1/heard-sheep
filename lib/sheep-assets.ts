export type SheepAssetUsage =
  | "brand"
  | "background"
  | "loading"
  | "success"
  | "error"
  | "empty"
  | "encourage"
  | "social"
  | "greeting";

export type SheepVisualVariant =
  | "mascot"
  | "floating"
  | "recording"
  | "thinking"
  | "question"
  | "empty"
  | "success"
  | "received"
  | "ok"
  | "cheer"
  | "thanks"
  | "error"
  | "sad"
  | "cry"
  | "love"
  | "shy"
  | "goodMorning"
  | "goodNight"
  | "hardwork"
  | "bye"
  | "angry";

export type SheepAsset = {
  src: string;
  uiSrc?: string;
  alt: string;
  usage: SheepAssetUsage;
  note: string;
};

const sticker = (file: string) => `/brand/sheep/stickers/${file}`;
const ui = (file: string) => `/brand/sheep/ui/${file}`;

export const sheepAssets: Record<SheepVisualVariant, SheepAsset> = {
  mascot: {
    src: "/brand/sheep/mascot/sheep-mascot-main.png",
    uiSrc: "/brand/sheep/ui/sheep-mascot-main.png",
    alt: "听到了咩品牌小羊",
    usage: "brand",
    note: "主品牌形象，用于头像、首页和 PWA 图标来源。",
  },
  floating: {
    src: "/brand/sheep/mascot/sheep-mascot-main.png",
    uiSrc: "/brand/sheep/ui/sheep-mascot-main.png",
    alt: "漂浮的小羊",
    usage: "background",
    note: "低透明背景装饰，避免使用带文字贴纸。",
  },
  recording: {
    src: sticker("sheep-thinking.png"),
    uiSrc: ui("sheep-thinking.png"),
    alt: "等待转写的小羊",
    usage: "loading",
    note: "录音、转写和识别处理中。",
  },
  thinking: {
    src: sticker("sheep-thinking.png"),
    uiSrc: ui("sheep-thinking.png"),
    alt: "思考中的小羊",
    usage: "loading",
    note: "AI 分析、图片理解和等待状态。",
  },
  question: {
    src: sticker("sheep-question.png"),
    uiSrc: ui("sheep-question.png"),
    alt: "疑问小羊",
    usage: "empty",
    note: "空状态、未找到内容、需要用户补充信息。",
  },
  empty: {
    src: sticker("sheep-question.png"),
    uiSrc: ui("sheep-question.png"),
    alt: "还在等待内容的小羊",
    usage: "empty",
    note: "任务、历史和搜索结果为空时使用。",
  },
  success: {
    src: sticker("sheep-received.png"),
    uiSrc: ui("sheep-received.png"),
    alt: "收到的小羊",
    usage: "success",
    note: "保存成功、识别成功、操作完成。",
  },
  received: {
    src: sticker("sheep-received.png"),
    uiSrc: ui("sheep-received.png"),
    alt: "收到的小羊",
    usage: "success",
    note: "确认收到类反馈。",
  },
  ok: {
    src: sticker("sheep-ok.png"),
    uiSrc: ui("sheep-ok.png"),
    alt: "好的小羊",
    usage: "success",
    note: "轻量正向确认。",
  },
  cheer: {
    src: sticker("sheep-cheer.png"),
    uiSrc: ui("sheep-cheer.png"),
    alt: "冲鸭小羊",
    usage: "encourage",
    note: "任务完成、继续推进等鼓励场景。",
  },
  thanks: {
    src: sticker("sheep-thanks.png"),
    uiSrc: ui("sheep-thanks.png"),
    alt: "谢谢小羊",
    usage: "social",
    note: "导出、反馈、评分等感谢场景。",
  },
  error: {
    src: sticker("sheep-sad.png"),
    uiSrc: ui("sheep-sad.png"),
    alt: "委屈的小羊",
    usage: "error",
    note: "转写失败、图片识别失败、AI 失败等错误态。",
  },
  sad: {
    src: sticker("sheep-sad.png"),
    uiSrc: ui("sheep-sad.png"),
    alt: "委屈的小羊",
    usage: "error",
    note: "较轻错误或权限受阻。",
  },
  cry: {
    src: sticker("sheep-cry.png"),
    uiSrc: ui("sheep-cry.png"),
    alt: "哭哭小羊",
    usage: "error",
    note: "较强失败态，少量使用。",
  },
  love: {
    src: sticker("sheep-love.png"),
    uiSrc: ui("sheep-love.png"),
    alt: "比心小羊",
    usage: "social",
    note: "评分、反馈和轻社交入口。",
  },
  shy: {
    src: sticker("sheep-shy.png"),
    uiSrc: ui("sheep-shy.png"),
    alt: "嘿嘿小羊",
    usage: "social",
    note: "轻社交、帮助入口和欢迎提示。",
  },
  goodMorning: {
    src: sticker("sheep-good-morning.png"),
    uiSrc: ui("sheep-good-morning.png"),
    alt: "早呀小羊",
    usage: "greeting",
    note: "首次欢迎或早间问候。",
  },
  goodNight: {
    src: sticker("sheep-good-night.png"),
    uiSrc: ui("sheep-good-night.png"),
    alt: "晚安小羊",
    usage: "greeting",
    note: "夜间问候，避免非夜间固定展示。",
  },
  hardwork: {
    src: sticker("sheep-hardwork.png"),
    uiSrc: ui("sheep-hardwork.png"),
    alt: "辛苦啦小羊",
    usage: "social",
    note: "完成阶段和反馈感谢。",
  },
  bye: {
    src: sticker("sheep-bye.png"),
    uiSrc: ui("sheep-bye.png"),
    alt: "拜拜小羊",
    usage: "greeting",
    note: "退出、关闭或结束引导。",
  },
  angry: {
    src: sticker("sheep-angry.png"),
    uiSrc: ui("sheep-angry.png"),
    alt: "不满小羊",
    usage: "error",
    note: "预留，不建议在核心错误态频繁使用。",
  },
};

