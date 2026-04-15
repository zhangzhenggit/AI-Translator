import { getLanguageLabel } from "../shared/defaults.js";

function getStyleInstruction(style) {
  switch (style) {
    case "faithful":
      return "Translate with maximum fidelity. Preserve meaning, tone, key terms, and sentence structure where reasonable.";
    case "concise":
      return "Translate clearly and compactly. Remove filler but do not drop core meaning.";
    case "natural":
    default:
      return "Translate naturally and fluently for the target language while preserving meaning and intent.";
  }
}

function getSourceInstruction(sourceLanguage) {
  if (sourceLanguage === "auto") {
    return "Automatically detect the source language.";
  }

  return `The source language is ${getLanguageLabel(sourceLanguage)}.`;
}

export function buildSelectionMessages(settings, text) {
  const translation = settings.translation;
  const targetLanguage = getLanguageLabel(translation.targetLanguage);

  return [
    {
      role: "system",
      content: [
        "You are an expert browser translation assistant.",
        getSourceInstruction(translation.sourceLanguage),
        `Translate the user input into ${targetLanguage}.`,
        getStyleInstruction(translation.style),
        "Return translation only.",
        "Do not add explanations, bullet points, quotation marks, or notes."
      ].join(" ")
    },
    {
      role: "user",
      content: text
    }
  ];
}

export function buildPageMessages(settings, pagePayload) {
  const translation = settings.translation;
  const targetLanguage = getLanguageLabel(translation.targetLanguage);

  return [
    {
      role: "system",
      content: [
        "You are an expert browser page translation assistant.",
        getSourceInstruction(translation.sourceLanguage),
        `Translate the page content into ${targetLanguage}.`,
        getStyleInstruction(translation.style),
        "Preserve headings, paragraph breaks, and list readability where possible.",
        "Return translated page content only.",
        "Do not explain the translation and do not mention the instructions."
      ].join(" ")
    },
    {
      role: "user",
      content: [
        `Page title: ${pagePayload.title || "Untitled page"}`,
        `Page URL: ${pagePayload.url || "Unknown URL"}`,
        "",
        pagePayload.text
      ].join("\n")
    }
  ];
}

export function buildPageBlockMessages(settings, pagePayload, blocks) {
  const translation = settings.translation;
  const targetLanguage = getLanguageLabel(translation.targetLanguage);
  const blockText = blocks
    .map((block) => [`[[BLOCK_${block.id}]]`, block.text].join("\n"))
    .join("\n\n");

  return [
    {
      role: "system",
      content: [
        "You are an expert browser page translation assistant.",
        getSourceInstruction(translation.sourceLanguage),
        `Translate every block into ${targetLanguage}.`,
        getStyleInstruction(translation.style),
        "Keep every block marker exactly unchanged.",
        "For each marker like [[BLOCK_12]], output the same marker followed by only that block's translation.",
        "Do not merge blocks.",
        "Do not omit blocks.",
        "Do not add explanations, JSON, markdown fences, or any text outside the block markers."
      ].join(" ")
    },
    {
      role: "user",
      content: [
        `Page title: ${pagePayload.title || "Untitled page"}`,
        `Page URL: ${pagePayload.url || "Unknown URL"}`,
        `Block count: ${blocks.length}`,
        "",
        blockText
      ].join("\n")
    }
  ];
}

export function buildConnectionTestMessages(settings) {
  const targetLanguage = getLanguageLabel(settings.translation.targetLanguage);

  return [
    {
      role: "system",
      content: `Translate user input into ${targetLanguage}. Return translation only.`
    },
    {
      role: "user",
      content: "Connection check"
    }
  ];
}
