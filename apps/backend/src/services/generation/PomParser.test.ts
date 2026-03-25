import { describe, it, expect } from 'vitest';
import { parsePomFile } from './PomParser.js';

const STANDARD_POM = `
import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('email');
  }

  /** Navigates to the login page */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /** Fills and submits the login form */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('submit').click();
  }

  /** Returns the visible error message */
  async getErrorMessage(): Promise<string> {
    return this.page.getByTestId('error').textContent() ?? '';
  }
}
`;

describe('PomParser', () => {
  it('extrait le nom de classe correct', () => {
    const result = parsePomFile(STANDARD_POM);
    expect(result).not.toBeNull();
    expect(result!.className).toBe('LoginPage');
  });

  it('extrait les méthodes publiques (sans constructor)', () => {
    const result = parsePomFile(STANDARD_POM);
    expect(result).not.toBeNull();
    const methodNames = result!.methods.map((m) => m.name);
    expect(methodNames).toContain('goto');
    expect(methodNames).toContain('login');
    expect(methodNames).toContain('getErrorMessage');
    expect(methodNames).not.toContain('constructor');
  });

  it('extrait le JSDoc des méthodes', () => {
    const result = parsePomFile(STANDARD_POM);
    const gotoMethod = result!.methods.find((m) => m.name === 'goto');
    expect(gotoMethod?.jsdoc).toContain('Navigates');
  });

  it('extrait les paramètres et le type de retour', () => {
    const result = parsePomFile(STANDARD_POM);
    const loginMethod = result!.methods.find((m) => m.name === 'login');
    expect(loginMethod?.params).toContain('email');
    expect(loginMethod?.params).toContain('password');
  });

  it('retourne null si pas de export class', () => {
    const content = `
const helper = () => {};
function doSomething() {}
`;
    const result = parsePomFile(content);
    expect(result).toBeNull();
  });

  it('extrait plusieurs POM dans le même fichier (prend la 1ère classe)', () => {
    const content = `
export class DashboardPage {
  async navigate(): Promise<void> {}
}
`;
    const result = parsePomFile(content);
    expect(result?.className).toBe('DashboardPage');
  });

  it('gère un POM sans méthodes publiques', () => {
    const content = `
export class EmptyPage {
  constructor(page: Page) {}
}
`;
    const result = parsePomFile(content);
    expect(result?.className).toBe('EmptyPage');
    expect(result?.methods).toHaveLength(0);
  });
});
