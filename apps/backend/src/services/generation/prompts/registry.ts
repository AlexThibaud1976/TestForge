import type { PromptModule } from './types.js';
import * as playwrightTypescript from './playwright-typescript.js';
import * as playwrightJavascript from './playwright-javascript.js';
import * as playwrightPython from './playwright-python.js';
import * as playwrightJava from './playwright-java.js';
import * as seleniumJava from './selenium-java.js';
import * as seleniumPython from './selenium-python.js';
// V2 — nouveaux frameworks
import * as seleniumCsharp from './selenium-csharp.js';
import * as seleniumRuby from './selenium-ruby.js';
import * as seleniumKotlin from './selenium-kotlin.js';
import * as playwrightCsharp from './playwright-csharp.js';
import * as cypressJs from './cypress-js.js';
import * as cypressTs from './cypress-ts.js';

const REGISTRY: Record<string, PromptModule> = {
  'playwright-typescript': playwrightTypescript,
  'playwright-javascript': playwrightJavascript,
  'playwright-python':     playwrightPython,
  'playwright-java':       playwrightJava,
  'selenium-java':         seleniumJava,
  'selenium-python':       seleniumPython,
  // V2
  'selenium-csharp':       seleniumCsharp,
  'selenium-ruby':         seleniumRuby,
  'selenium-kotlin':       seleniumKotlin,
  'playwright-csharp':     playwrightCsharp,
  'cypress-javascript':    cypressJs,
  'cypress-typescript':    cypressTs,
};

export function getPrompt(framework: string, language: string): PromptModule {
  const key = `${framework}-${language}`;
  const prompt = REGISTRY[key];
  if (!prompt) {
    throw new Error(`Unsupported combination: ${framework} + ${language}. Supported: ${Object.keys(REGISTRY).join(', ')}`);
  }
  return prompt;
}
