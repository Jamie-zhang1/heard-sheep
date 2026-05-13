import type { AnalyzeResult, SourceType } from "./types";

export const MOCK_TRANSCRIPT =
  "这个 Q2 的数据报告，你先把上个月的用户增长数据拉出来，然后对标竞品的增长曲线。重点看一下留存率，不只是新增。下周三前先给我一个初稿，用于 VP 汇报。竞品名单和数据口径你先确认一下，不明确的地方标出来。";

const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

export function shouldReturnNoTask(rawText: string) {
  const text = normalize(rawText);
  return (
    text.length < 12 ||
    /没有任务|无待办|随便聊|聊天记录|今天天气|天气不错|无需处理/.test(text)
  );
}

export function buildMockAnalysis(rawText: string, source: SourceType): AnalyzeResult {
  const text = normalize(rawText);

  if (shouldReturnNoTask(text)) {
    return {
      title: "口头内容整理",
      summary: "这段内容没有识别出明确的待办事项，建议补充目标、负责人、截止时间或交付物后再生成任务。",
      organized_text: {
        cleaned_text: text || "当前没有可分析的文本。",
        key_points: ["未发现明确执行动作", "缺少可追踪的交付结果"],
        time_mentions: [],
        special_requirements: []
      },
      tasks: [],
      global_confirm_questions: ["这段内容里是否有需要我执行的具体事项？"],
      warnings: ["未识别出明确任务，建议用户手动添加或返回修改文本。"]
    };
  }

  if (/活动方案|用户画像|预算|竞品案例/.test(text)) {
    return buildActivityPlanAnalysis(text, source);
  }

  if (/调研|访谈|用户研究|框架/.test(text)) {
    return buildResearchPlanAnalysis(text, source);
  }

  return buildDataReportAnalysis(text, source);
}

function buildDataReportAnalysis(text: string, source: SourceType): AnalyzeResult {
  return {
    title: "Q2 数据报告需求",
    summary:
      "领导要求在下周三前完成 Q2 数据报告初稿，重点包含用户增长趋势、竞品增长对比和留存分析，并用于 VP 汇报。",
    organized_text: {
      cleaned_text:
        "需要完成一份 Q2 数据报告初稿。先拉取上个月用户增长数据，制作增长趋势图；再对标竞品增长曲线；报告需要重点分析留存率，而不只是新增用户。初稿需在下周三前完成，用于 VP 汇报。竞品名单、数据来源和统计口径目前不明确，需要先确认并标出。",
      key_points: [
        "拉取上个月用户增长数据并形成增长趋势图",
        "对标竞品增长曲线，补充竞品对比",
        "重点分析留存率，不只看新增用户",
        "初稿用于 VP 汇报"
      ],
      time_mentions: ["下周三前"],
      special_requirements: ["用于 VP 汇报", "不明确的信息需要标出来"]
    },
    tasks: [
      {
        id: "task_001",
        title: "拉取用户增长数据，制作增长趋势图",
        description: "拉取上个月用户增长数据，清洗整理后制作增长趋势图，作为 Q2 数据报告的基础材料。",
        priority: "high",
        priority_reason: "该任务是后续竞品分析和报告撰写的基础。",
        deadline_text: "下周三前",
        deadline_date: null,
        deliverable: "用户增长趋势图",
        assignee: "我",
        dependencies: ["确认数据来源系统", "确认统计口径"],
        steps: [
          "确认数据来源系统",
          "确认增长数据统计口径",
          "拉取上个月用户增长数据",
          "清洗并整理数据",
          "制作增长趋势图"
        ],
        missing_info: ["数据来源系统未明确", "统计口径未明确"],
        confirm_questions: [
          "用户增长数据应该从哪个系统导出？",
          "增长数据按日、周还是月统计？"
        ],
        risk: "如果统计口径不明确，可能导致报告数据和领导预期不一致。",
        source_evidence: "你先把上个月的用户增长数据拉出来，然后对标竞品的增长曲线。",
        confidence: "high",
        need_confirm: true,
        status: "todo",
        labels: ["recording", "leader", "data", "sheep_warn"]
      },
      {
        id: "task_002",
        title: "整理竞品增长曲线对比",
        description: "根据确认后的竞品名单，整理竞品增长曲线，并对比自家 Q2 增长表现。",
        priority: "medium",
        priority_reason: "竞品名单未明确，需先确认后推进。",
        deadline_text: "下周三前",
        deadline_date: null,
        deliverable: "竞品增长对比页",
        assignee: "我",
        dependencies: ["确认竞品名单"],
        steps: ["确认竞品名单", "收集竞品增长曲线", "整理对比维度", "输出对比结论"],
        missing_info: ["竞品名单未明确", "竞品增长数据来源未明确"],
        confirm_questions: ["这次竞品对比需要看哪几家公司？"],
        risk: "如果竞品范围不确认，可能导致分析方向偏离汇报目标。",
        source_evidence: "对标竞品的增长曲线。",
        confidence: "medium",
        need_confirm: true,
        status: "todo",
        labels: ["recording", "data", "sheep_think"]
      },
      {
        id: "task_003",
        title: "补充留存分析并形成报告初稿",
        description: "在增长与竞品对比基础上，补充留存率分析，整理成 Q2 数据报告初稿。",
        priority: "high",
        priority_reason: "这是最终交付物，且用于 VP 汇报。",
        deadline_text: "下周三前",
        deadline_date: null,
        deliverable: "Q2 数据报告初稿",
        assignee: "我",
        dependencies: ["完成增长趋势图", "完成竞品增长对比"],
        steps: ["确定留存分析维度", "整理留存率数据", "撰写报告结论", "标注不确定信息", "形成初稿"],
        missing_info: ["留存率统计维度未明确", "报告模板未明确"],
        confirm_questions: ["留存率需要按日、周还是月维度分析？", "Q2 数据报告是否沿用之前模板？"],
        risk: "如果留存维度或模板不明确，初稿可能需要较大返工。",
        source_evidence: "重点看一下留存率，不只是新增。下周三前先给我一个初稿，用于 VP 汇报。",
        confidence: "high",
        need_confirm: true,
        status: "todo",
        labels: ["recording", "leader", "data", "urgent"]
      }
    ],
    global_confirm_questions: [
      "这次竞品对比需要看哪几家公司？",
      "Q2 数据报告是否有固定模板？"
    ],
    warnings: [
      source === "recording" ? "当前 ASR 为 mock 转写，建议接入真实 ASR 后复核文本。" : "部分截止时间来自语义推断，建议用户确认。"
    ]
  };
}

function buildActivityPlanAnalysis(text: string, source: SourceType): AnalyzeResult {
  return {
    title: "活动方案初稿整理",
    summary:
      "需要在明天下午前整理活动方案初稿，重点补充用户画像、预算和竞品案例，并标注预算不确定信息。",
    organized_text: {
      cleaned_text:
        "需要重新整理活动方案，并在明天下午前先提交一个初稿。重点补充用户画像、预算和两个竞品案例。预算如果没有具体数据，可以先按大概范围写，但必须明确标注。",
      key_points: ["整理活动方案初稿", "补充用户画像", "补充预算范围", "增加两个竞品案例"],
      time_mentions: ["明天下午前"],
      special_requirements: ["预算没有具体数据时按范围写，并标注不确定性"]
    },
    tasks: [
      {
        id: "task_001",
        title: "整理活动方案初稿",
        description: "重组活动方案结构，并补充用户画像、预算和竞品案例。",
        priority: "high",
        priority_reason: "有明确截止时间，且是本次口头交代的最终交付物。",
        deadline_text: "明天下午前",
        deadline_date: null,
        deliverable: "活动方案初稿",
        assignee: "我",
        dependencies: ["确认预算范围", "确认用户画像数据来源"],
        steps: ["梳理现有方案目录", "补充用户画像", "补充预算范围", "增加两个竞品案例", "整理成初稿并发送确认"],
        missing_info: ["预算是否已有范围未明确", "用户画像数据来源未明确", "竞品案例对象未明确"],
        confirm_questions: ["预算是否有可参考范围？", "用户画像用哪份数据？", "竞品案例优先参考哪两家？"],
        risk: "预算和用户画像依据不明确时，方案容易被认为缺少支撑。",
        source_evidence: "重点补一下用户画像和预算，竞品案例也可以加两个。",
        confidence: "high",
        need_confirm: true,
        status: "todo",
        labels: ["paste", "leader", "project", "urgent", "sheep_warn"]
      }
    ],
    global_confirm_questions: ["预算是否有可参考范围？", "竞品案例优先参考哪两家？"],
    warnings: [source === "paste" ? "文本来自粘贴稿，建议确认是否遗漏语气中的优先级信息。" : "截止时间来自自然语言，建议用户确认具体日期。"]
  };
}

function buildResearchPlanAnalysis(text: string, source: SourceType): AnalyzeResult {
  return {
    title: "用户调研计划推进",
    summary: "本周需要搭建用户调研框架，下周一同步调研计划，后续再安排访谈。",
    organized_text: {
      cleaned_text:
        "本周先搭建用户调研框架。下周一需要同步调研计划。框架完成并同步后，再安排后续访谈。访谈对象、样本量和调研目标仍需要确认。",
      key_points: ["本周搭建调研框架", "下周一同步调研计划", "后续安排访谈"],
      time_mentions: ["本周", "下周一"],
      special_requirements: ["后续任务依赖调研框架完成"]
    },
    tasks: [
      {
        id: "task_001",
        title: "搭建用户调研框架",
        description: "整理调研目标、对象、问题方向和输出结构，形成可同步的框架。",
        priority: "high",
        priority_reason: "后续调研计划和访谈安排都依赖该框架。",
        deadline_text: "本周",
        deadline_date: null,
        deliverable: "用户调研框架",
        assignee: "我",
        dependencies: ["确认调研目标"],
        steps: ["确认调研目标", "梳理用户分层", "设计问题方向", "形成调研框架"],
        missing_info: ["调研目标未明确", "访谈对象未明确"],
        confirm_questions: ["本次调研最核心要验证什么？", "优先访谈哪类用户？"],
        risk: "调研目标不明确会导致访谈问题发散。",
        source_evidence: "这周先把用户调研框架搭出来。",
        confidence: "high",
        need_confirm: true,
        status: "todo",
        labels: ["meeting", "project", "sheep_think"]
      },
      {
        id: "task_002",
        title: "同步用户调研计划",
        description: "基于调研框架整理计划，并在下周一同步。",
        priority: "medium",
        priority_reason: "该任务依赖调研框架完成。",
        deadline_text: "下周一",
        deadline_date: null,
        deliverable: "调研计划",
        assignee: "我",
        dependencies: ["完成调研框架"],
        steps: ["整理调研计划", "确认访谈节奏", "同步给相关同事"],
        missing_info: ["同步对象未明确", "访谈排期未明确"],
        confirm_questions: ["下周一需要同步给哪些人？", "计划里是否需要包含访谈时间表？"],
        risk: "同步对象不明确可能导致后续协作遗漏。",
        source_evidence: "下周一同步调研计划，后面再安排访谈。",
        confidence: "medium",
        need_confirm: true,
        status: "todo",
        labels: ["meeting", "project"]
      }
    ],
    global_confirm_questions: ["调研目标是什么？", "访谈对象和样本量是否已有要求？"],
    warnings: [source === "upload" ? "上传音频使用 mock ASR，建议后续接入真实转写服务。" : "部分后续安排尚不明确。"]
  };
}
