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

export type Framework = 'playwright' | 'selenium' | 'cypress';

export type Language =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'csharp'
  | 'ruby'
  | 'kotlin';

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
  { framework: 'selenium',   language: 'java',        label: 'Selenium v4 · Java',             fileExtensions: { pageObject: 'Page.java', testSpec: 'Test.java'  } },
  { framework: 'selenium',   language: 'python',      label: 'Selenium v4 · Python',           fileExtensions: { pageObject: '_page.py',  testSpec: 'test_.py'   } },
  { framework: 'playwright', language: 'csharp',      label: 'Playwright · C#',                fileExtensions: { pageObject: 'Page.cs',   testSpec: 'Test.cs'    } },
  { framework: 'selenium',   language: 'csharp',      label: 'Selenium v4 · C# (NUnit)',       fileExtensions: { pageObject: 'Page.cs',   testSpec: 'Test.cs'    } },
  { framework: 'selenium',   language: 'ruby',        label: 'Selenium v4 · Ruby (RSpec)',     fileExtensions: { pageObject: '_page.rb',  testSpec: '_spec.rb'   } },
  { framework: 'selenium',   language: 'kotlin',      label: 'Selenium v4 · Kotlin (JUnit 5)', fileExtensions: { pageObject: 'Page.kt',   testSpec: 'Test.kt'    } },
  { framework: 'cypress',    language: 'javascript',  label: 'Cypress · JavaScript',           fileExtensions: { pageObject: '.page.js',  testSpec: '.cy.js'     } },
  { framework: 'cypress',    language: 'typescript',  label: 'Cypress · TypeScript',           fileExtensions: { pageObject: '.page.ts',  testSpec: '.cy.ts'     } },
];
