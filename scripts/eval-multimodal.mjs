import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_MANIFEST = "eval/multimodal/manifest.example.json";
const manifestPath = process.argv[2] || process.env.MULTIMODAL_EVAL_MANIFEST || DEFAULT_MANIFEST;

main().catch((error) => {
  console.error(`[eval:multimodal] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

async function main() {
  const manifest = await loadManifest(manifestPath);
  const baseUrl = normalizeBaseUrl(manifest.baseUrl || "http://127.0.0.1:3000/sheep");

  await assertServerReachable(baseUrl);

  const results = [];
  for (const sample of manifest.samples || []) {
    results.push(await evaluateSample(baseUrl, sample));
  }

  const timestamp = formatTimestamp(new Date());
  const outputDir = path.resolve("reports/multimodal-eval");
  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `multimodal-eval-${timestamp}.json`);
  const mdPath = path.join(outputDir, `multimodal-eval-${timestamp}.md`);
  const report = {
    generatedAt: new Date().toISOString(),
    manifestPath: path.resolve(manifestPath),
    baseUrl,
    results
  };

  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(mdPath, renderMarkdown(report), "utf8");

  printSummary(results, jsonPath, mdPath);
}

async function loadManifest(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`找不到评测清单：${filePath}`);
  }

  const raw = await readFile(filePath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.samples)) {
      throw new Error("manifest.samples 必须是数组");
    }
    return parsed;
  } catch (error) {
    throw new Error(`评测清单 JSON 解析失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function assertServerReachable(baseUrl) {
  try {
    const response = await fetch(baseUrl, { method: "GET" });
    if (!response.ok && response.status >= 500) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch {
    throw new Error(`无法访问 ${baseUrl}，请先启动 npm run dev`);
  }
}

async function evaluateSample(baseUrl, sample) {
  const startedAt = Date.now();
  const base = {
    id: sample.id || "unnamed-sample",
    type: sample.type,
    description: sample.description || "",
    expectedKeywords: Array.isArray(sample.expectedKeywords) ? sample.expectedKeywords : [],
    notes: sample.notes || ""
  };

  if (!sample.filePath || !existsSync(sample.filePath)) {
    return withKeywordStats({
      ...base,
      provider: null,
      fallbackUsed: null,
      extractedText: sample.type === "image" ? "" : undefined,
      transcript: sample.type === "audio" ? "" : undefined,
      error: `样本文件不存在：${sample.filePath || "(未填写 filePath)"}`,
      durationMs: Date.now() - startedAt
    });
  }

  try {
    if (sample.type === "image") {
      return await evaluateImage(baseUrl, sample, base, startedAt);
    }
    if (sample.type === "audio") {
      return await evaluateAudio(baseUrl, sample, base, startedAt);
    }
    return withKeywordStats({
      ...base,
      provider: null,
      fallbackUsed: null,
      error: `不支持的样本类型：${sample.type}`,
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    return withKeywordStats({
      ...base,
      provider: null,
      fallbackUsed: null,
      extractedText: sample.type === "image" ? "" : undefined,
      transcript: sample.type === "audio" ? "" : undefined,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt
    });
  }
}

async function evaluateImage(baseUrl, sample, base, startedAt) {
  const file = await readFile(sample.filePath);
  const mimeType = sample.mimeType || inferMimeType(sample.filePath);
  const body = {
    imageBase64: `data:${mimeType};base64,${file.toString("base64")}`,
    mimeType,
    filename: path.basename(sample.filePath)
  };

  const response = await fetch(`${baseUrl}/api/vision/extract-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.message || `图片评测请求失败：HTTP ${response.status}`);
  }

  return withKeywordStats({
    ...base,
    provider: payload?.meta?.provider ?? null,
    model: payload?.meta?.model,
    fallbackUsed: payload?.meta?.fallbackUsed ?? null,
    extractedText: payload?.extractedText ?? "",
    error: payload?.meta?.error ?? null,
    durationMs: Date.now() - startedAt
  });
}

async function evaluateAudio(baseUrl, sample, base, startedAt) {
  const file = await readFile(sample.filePath);
  const mimeType = sample.mimeType || inferMimeType(sample.filePath);
  const formData = new FormData();
  formData.append("source", sample.source === "upload" ? "upload" : "recording");
  if (sample.duration) formData.append("duration", String(sample.duration));
  formData.append("audio", new Blob([file], { type: mimeType }), path.basename(sample.filePath));

  const response = await fetch(`${baseUrl}/api/transcribe`, {
    method: "POST",
    body: formData
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.message || `音频评测请求失败：HTTP ${response.status}`);
  }

  return withKeywordStats({
    ...base,
    provider: payload?.meta?.provider ?? payload?.provider ?? null,
    model: payload?.meta?.model ?? payload?.model,
    fallbackUsed: payload?.meta?.fallbackUsed ?? payload?.fallbackUsed ?? null,
    transcript: payload?.text ?? "",
    error: payload?.meta?.error ?? payload?.error ?? null,
    durationMs: Date.now() - startedAt
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 300) };
  }
}

function withKeywordStats(result) {
  const text = result.type === "image" ? result.extractedText || "" : result.transcript || "";
  const expected = result.expectedKeywords || [];
  const matchedKeywords = expected.filter((keyword) => includesKeyword(text, keyword));
  const missingKeywords = expected.filter((keyword) => !includesKeyword(text, keyword));
  const keywordHitRate = expected.length ? round2(matchedKeywords.length / expected.length) : null;

  return {
    ...result,
    matchedKeywords,
    missingKeywords,
    keywordHitRate
  };
}

function includesKeyword(text, keyword) {
  const source = String(text || "").toLowerCase();
  const target = String(keyword || "").toLowerCase();
  return !!target && source.includes(target);
}

function renderMarkdown(report) {
  const lines = [
    "# 多模态真实样本评测报告",
    "",
    `生成时间：${report.generatedAt}`,
    "",
    `Base URL：\`${report.baseUrl}\``,
    "",
    "| 样本编号 | 类型 | provider | fallback | 命中率 | 错误 |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const result of report.results) {
    lines.push(
      [
        result.id,
        result.type,
        result.provider ?? "",
        result.fallbackUsed === null ? "" : String(result.fallbackUsed),
        result.keywordHitRate === null ? "" : String(result.keywordHitRate),
        escapeTable(result.error || "")
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |")
    );
  }

  lines.push("", "## 详细结果", "");
  for (const result of report.results) {
    lines.push(`### ${result.id}`, "");
    lines.push(`- 类型：${result.type}`);
    lines.push(`- 描述：${result.description || ""}`);
    lines.push(`- Provider：${result.provider ?? ""}`);
    lines.push(`- Model：${result.model ?? ""}`);
    lines.push(`- Fallback：${result.fallbackUsed === null ? "" : result.fallbackUsed}`);
    lines.push(`- 期望关键词：${(result.expectedKeywords || []).join("、")}`);
    lines.push(`- 命中关键词：${(result.matchedKeywords || []).join("、")}`);
    lines.push(`- 缺失关键词：${(result.missingKeywords || []).join("、")}`);
    lines.push(`- 错误：${result.error || ""}`);
    lines.push("");
    lines.push("```text");
    lines.push(result.type === "image" ? result.extractedText || "" : result.transcript || "");
    lines.push("```", "");
  }

  return `${lines.join("\n")}\n`;
}

function printSummary(results, jsonPath, mdPath) {
  const total = results.length;
  const failed = results.filter((result) => result.error).length;
  const fallback = results.filter((result) => result.fallbackUsed === true).length;

  console.log(`[eval:multimodal] 完成：${total} 个样本，错误 ${failed} 个，fallback ${fallback} 个`);
  for (const result of results) {
    const status = result.error ? `ERROR: ${result.error}` : `provider=${result.provider}, fallback=${result.fallbackUsed}, hitRate=${result.keywordHitRate}`;
    console.log(`- ${result.id} (${result.type}): ${status}`);
  }
  console.log(`[eval:multimodal] JSON: ${jsonPath}`);
  console.log(`[eval:multimodal] Markdown: ${mdPath}`);
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/$/, "");
}

function inferMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".webm") return "audio/webm";
  return "application/octet-stream";
}

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join("");
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function escapeTable(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}
