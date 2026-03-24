import type { PromptModule } from './types.js';
import * as playwrightTypescript from './playwright-typescript.js';
import * as playwrightJavascript from './playwright-javascript.js';
import * as playwrightPython from './playwright-python.js';
import * as playwrightJava from './playwright-java.js';
import * as seleniumJava from './selenium-java.js';
import * as seleniumPython from './selenium-python.js';

const REGISTRY: Record<string, PromptModule> = {
  'playwright-typescript': playwrightTypescript,
  'playwright-javascript': playwrightJavascript,
  'playwright-python':     playwrightPython,
  'playwright-java':       playwrightJava,
  'selenium-java':         seleniumJava,
  'selenium-python':       seleniumPython,
};

export function getPrompt(framework: string, language: string): PromptModule {
  const key = `${framework}-${language}`;
  const prompt = REGISTRY[key];
  if (!prompt) {
    throw new Error(`Unsupported combination: ${framework} + ${language}. Supported: ${Object.keys(REGISTRY).join(', ')}`);
  }
  return prompt;
}
