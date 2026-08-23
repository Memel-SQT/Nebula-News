import type { Language } from "@prisma/client";

/** Splits on sentence-ending punctuation while keeping it, good enough for FR/EN news prose. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ0-9"'«])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Zero-dependency fallback: the article's first 2-3 sentences, capped in length. */
function extractiveSummary(content: string): string {
  const sentences = splitSentences(content).slice(0, 3);
  const summary = sentences.join(" ");
  return summary.length > 320 ? `${summary.slice(0, 317)}...` : summary;
}

async function summarizeWithClaude(
  title: string,
  content: string,
  language: Language
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !content) return null;

  const languageName = language === "FR" ? "French" : "English";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Summarize this news article in exactly 2-3 concise, neutral sentences, in ${languageName}. Output only the summary, no preamble.\n\nTitle: ${title}\n\nContent: ${content.slice(0, 4000)}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

/** LLM summary when ANTHROPIC_API_KEY is configured, otherwise an extractive fallback. */
export async function summarizeArticle(
  title: string,
  content: string,
  language: Language
): Promise<string> {
  const llmSummary = await summarizeWithClaude(title, content, language);
  if (llmSummary) return llmSummary;

  return extractiveSummary(content) || title;
}
