import type { SourceType } from "@/lib/types";

type ContentPart = { type: string; text?: string; image_url?: { url: string } };

const SYSTEM_PROMPT_BASE = [
  "你是《听到了咩》的 AI 语音任务助手。",
  "你的目标是把领导、同事、会议或客户沟通中的口头交代，整理成可执行、可确认、可追踪的任务计划。",
  "你必须只输出合法 JSON，不要输出 Markdown、解释、代码块或多余文本。",
  "不要编造原文没有的信息。模糊信息必须进入 missing_info 或 confirm_questions。",
  "截止时间不明确时，deadline_date 必须为 null，deadline_text 保留原文表达或空字符串。",
  "每条任务必须有 source_evidence，且必须来自原文片段。",
  "只要原文包含要求、安排、交付物、截止时间、需要确认的事项或后续动作，就应该生成 tasks，不要因为主语省略或负责人不明确而返回空数组。",
  "口头交代常常是命令式或省略句，你需要把其中可执行的动作拆成任务。",
  "如果没有识别出明确任务，tasks 输出空数组，并给出 global_confirm_questions 与 warnings。"
];

const JSON_SCHEMA_EXAMPLE = JSON.stringify(
  {
    title: "简短标题",
    summary: "核心摘要",
    organized_text: {
      cleaned_text: "整理后的完整文本",
      key_points: ["关键要求"],
      time_mentions: ["原文中出现的时间表达"],
      special_requirements: ["特殊要求"]
    },
    tasks: [
      {
        id: "task_001",
        title: "任务标题",
        description: "任务描述",
        priority: "high",
        priority_reason: "优先级原因",
        deadline_text: "原文截止时间表达；不明确则为空字符串",
        deadline_date: null,
        deliverable: "交付物；不明确则为空字符串",
        assignee: "负责人；不明确则为空字符串",
        dependencies: ["依赖项"],
        steps: ["执行步骤"],
        missing_info: ["缺失信息"],
        confirm_questions: ["建议确认问题"],
        risk: "风险提示；没有则为空字符串",
        source_evidence: "原文依据片段",
        confidence: "high",
        need_confirm: true,
        status: "todo"
      }
    ],
    global_confirm_questions: ["全局建议确认问题"],
    warnings: ["警告"]
  },
  null,
  2
);

export function buildAnalyzeMessages(rawText: string, source: SourceType, images?: string[]) {
  const systemParts = [...SYSTEM_PROMPT_BASE];
  if (images && images.length > 0) {
    if (images.length === 1) {
      systemParts.push("用户上传了一张图片（如聊天截图、会议截图等）。请先识别图片中的所有文字内容，然后基于识别出的文字进行任务分析。如果图片中有多个对话方，注意区分不同人的发言。");
    } else {
      systemParts.push(
        `用户上传了 ${images.length} 张图片（如聊天截图、会议截图等）。请逐张识别每张图片中的文字内容，然后综合所有图片的信息进行任务分析。`,
        "重要：多张图片之间可能有关联（如同一对话的不同部分、不同人的发言、跨群消息等），请特别注意：",
        "1. 识别不同图片之间的内容关联和上下文衔接",
        "2. 同一任务可能分散在多张图片中，需要合并理解",
        "3. 如果图片之间有时间先后或逻辑依赖，请按顺序组织任务",
        "4. 在 summary 中说明图片之间的关联关系"
      );
    }
  }

  const userContent: ContentPart[] = [];

  // Add images if present
  if (images && images.length > 0) {
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: img }
      });
    }
  }

  // Build text part
  const textParts = [
    `来源：${source}`,
    images && images.length > 1 ? `共 ${images.length} 张图片` : "",
    "请严格按以下 JSON 结构输出：",
    JSON_SCHEMA_EXAMPLE,
    "原始转写文本：",
    rawText
  ].filter(Boolean);
  const textContent = textParts.join("\n\n");
  userContent.push({ type: "text", text: textContent });

  return [
    { role: "system", content: systemParts.join("\n") },
    { role: "user", content: images && images.length > 0 ? userContent : textContent }
  ];
}

export function buildRepairMessages(rawText: string, invalidOutput: string, validationError: string) {
  return [
    {
      role: "system",
      content: "你是 JSON 修复器。只输出符合要求的合法 JSON，不要输出 Markdown 或解释。"
    },
    {
      role: "user",
      content: [
        "下面的模型输出不是合法的《听到了咩》分析 JSON，或没有通过 schema 校验。",
        `校验错误：${validationError}`,
        "请基于原始转写文本和错误输出，修复为合法 JSON。不得新增原文没有的确定信息。",
        "原始转写文本：",
        rawText,
        "错误输出：",
        invalidOutput
      ].join("\n\n")
    }
  ];
}
