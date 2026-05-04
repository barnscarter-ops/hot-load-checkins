import OpenAI from "openai";

import { loadLocalEnv } from "./load-env.mjs";

loadLocalEnv();

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL) {
  console.error("Missing OPENAI_API_KEY or OPENAI_MODEL.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

try {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL,
    input: "Reply with exactly OK.",
    max_output_tokens: 16,
  });

  const outputText = response.output_text?.trim();

  if (!outputText) {
    console.error("OpenAI integration check returned no text.");
    process.exit(1);
  }

  console.log("OpenAI integration check passed.");
  console.log(`Model: ${process.env.OPENAI_MODEL}`);
  console.log(`Response: ${outputText}`);
} catch (error) {
  console.error("OpenAI integration check failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
