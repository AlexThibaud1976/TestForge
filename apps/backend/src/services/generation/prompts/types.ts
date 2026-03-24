export interface PromptModule {
  version: string;
  systemPrompt: string;
  buildUserPrompt(
    title: string,
    description: string,
    acceptanceCriteria: string | null,
    useImprovedVersion: boolean,
    improvedVersion: string | null,
  ): string;
}

export type Framework = 'playwright' | 'selenium';

export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp';

export interface FrameworkConfig {
  framework: Framework;
  language: Language;
  label: string;         // affiché dans l'UI
  fileExtensions: { pageObject: string; testSpec: string };
}

export const SUPPORTED_COMBINATIONS: FrameworkConfig[] = [
  { framework: 'playwright', language: 'typescript',  label: 'Playwright · TypeScript', fileExtensions: { pageObject: '.page.ts',  testSpec: '.spec.ts'   } },
  { framework: 'playwright', language: 'javascript',  label: 'Playwright · JavaScript', fileExtensions: { pageObject: '.page.js',  testSpec: '.spec.js'   } },
  { framework: 'playwright', language: 'python',      label: 'Playwright · Python',     fileExtensions: { pageObject: '_page.py',  testSpec: 'test_.py'   } },
  { framework: 'playwright', language: 'java',        label: 'Playwright · Java',       fileExtensions: { pageObject: 'Page.java', testSpec: 'Test.java'  } },
  { framework: 'selenium',   language: 'java',        label: 'Selenium v4 · Java',      fileExtensions: { pageObject: 'Page.java', testSpec: 'Test.java'  } },
  { framework: 'selenium',   language: 'python',      label: 'Selenium v4 · Python',    fileExtensions: { pageObject: '_page.py',  testSpec: 'test_.py'   } },
];
