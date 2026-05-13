# Task: 实现录音重点标记功能

## 需求（来自 PRD P1）
用户在录音过程中可以点击按钮标记重点时间戳，方便后续回看时定位关键信息。

## 要求
1. 在录音浮层中添加"标记"按钮
2. 点击标记时记录当前录音时间戳
3. 标记列表展示在录音浮层中
4. 转写完成后，标记时间戳保留在记录中
5. 在结果页可以查看标记点

## 技术约束
- 使用现有的 MediaRecorder 录音流程
- 标记数据存储在内存中，录音结束后随记录保存
- 不需要后端 API 改动，只需前端组件修改
- 保持现有代码风格（Tailwind CSS, React hooks）

## 文件涉及
- `components/HomeClient.tsx` - 录音浮层修改
- `lib/types.ts` - 添加 Mark 类型
- `components/ResultView.tsx` - 展示标记点
- `components/TaskDetailClient.tsx` - 展示标记点

请实现这个功能。
