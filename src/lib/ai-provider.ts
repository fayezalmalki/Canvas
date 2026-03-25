import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";

export function getModel() {
  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return groq("llama-3.3-70b-versatile");
  }

  if (process.env.MISTRAL_API_KEY) {
    const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY });
    return mistral("mistral-large-latest");
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai("gpt-4.1");
  }

  throw new Error(
    "No AI provider configured. Set GROQ_API_KEY, MISTRAL_API_KEY, or OPENAI_API_KEY in your environment."
  );
}

/**
 * Returns a model that supports structured output (json_schema).
 * Groq's llama models don't support this, so we skip Groq and
 * prefer Mistral or OpenAI for structured output tasks.
 */
export function getStructuredModel() {
  if (process.env.MISTRAL_API_KEY) {
    const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY });
    return mistral("mistral-large-latest");
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai("gpt-4.1");
  }

  if (process.env.GROQ_API_KEY) {
    // Fallback: try Groq with a model that may support structured output
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return groq("llama-3.3-70b-versatile");
  }

  throw new Error(
    "No AI provider configured for structured output. Set MISTRAL_API_KEY or OPENAI_API_KEY."
  );
}

export function getProviderName(): "groq" | "mistral" | "openai" | null {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.MISTRAL_API_KEY) return "mistral";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}
