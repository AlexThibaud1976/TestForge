import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { Button } from '@/components/ui/button.js';
import { Label } from '@/components/ui/label.js';
import { Card, CardContent } from '@/components/ui/card.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';
import { Textarea } from '@/components/ui/textarea.js';

interface PomTemplate {
  id: string;
  framework: string;
  language: string;
  content: string;
  updatedAt: string;
}

const FRAMEWORKS = ['playwright', 'selenium', 'cypress'];
const LANGUAGES = ['typescript', 'javascript', 'python', 'java', 'csharp', 'ruby', 'kotlin'];

const PLACEHOLDERS: Partial<Record<string, Partial<Record<string, string>>>> = {
  playwright: {
    typescript: `import { type Page, type Locator } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}
}

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}`,
    javascript: `const { expect } = require('@playwright/test');

class BasePage {
  constructor(page) {
    this.page = page;
  }
}

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}

module.exports = { LoginPage };`,
  },
  selenium: {
    java: `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;

public class LoginPage {
  private final WebDriver driver;

  @FindBy(id = "email")
  private WebElement emailInput;

  @FindBy(id = "password")
  private WebElement passwordInput;

  @FindBy(css = "button[type='submit']")
  private WebElement submitButton;

  public LoginPage(WebDriver driver) {
    this.driver = driver;
    PageFactory.initElements(driver, this);
  }

  public void login(String email, String password) {
    emailInput.sendKeys(email);
    passwordInput.sendKeys(password);
    submitButton.click();
  }
}`,
    python: `from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

class BasePage:
    def __init__(self, driver: WebDriver):
        self.driver = driver

class LoginPage(BasePage):
    EMAIL_INPUT = (By.ID, "email")
    PASSWORD_INPUT = (By.ID, "password")
    SUBMIT_BUTTON = (By.CSS_SELECTOR, "button[type='submit']")

    def login(self, email: str, password: str) -> None:
        self.driver.find_element(*self.EMAIL_INPUT).send_keys(email)
        self.driver.find_element(*self.PASSWORD_INPUT).send_keys(password)
        self.driver.find_element(*self.SUBMIT_BUTTON).click()`,
    csharp: `using OpenQA.Selenium;
using OpenQA.Selenium.Support.PageObjects;

public class LoginPage {
  private readonly IWebDriver _driver;

  [FindsBy(How = How.Id, Using = "email")]
  private IWebElement EmailInput;

  [FindsBy(How = How.Id, Using = "password")]
  private IWebElement PasswordInput;

  [FindsBy(How = How.CssSelector, Using = "button[type='submit']")]
  private IWebElement SubmitButton;

  public LoginPage(IWebDriver driver) {
    _driver = driver;
    PageFactory.InitElements(driver, this);
  }

  public void Login(string email, string password) {
    EmailInput.SendKeys(email);
    PasswordInput.SendKeys(password);
    SubmitButton.Click();
  }
}`,
    ruby: `require 'selenium-webdriver'

class LoginPage
  def initialize(driver)
    @driver = driver
  end

  def email_input
    @driver.find_element(id: 'email')
  end

  def password_input
    @driver.find_element(id: 'password')
  end

  def submit_button
    @driver.find_element(css: "button[type='submit']")
  end

  def login(email, password)
    email_input.send_keys(email)
    password_input.send_keys(password)
    submit_button.click
  end
end`,
    kotlin: `import org.openqa.selenium.WebDriver
import org.openqa.selenium.support.FindBy
import org.openqa.selenium.support.PageFactory
import org.openqa.selenium.WebElement

class LoginPage(private val driver: WebDriver) {

  @FindBy(id = "email")
  lateinit var emailInput: WebElement

  @FindBy(id = "password")
  lateinit var passwordInput: WebElement

  @FindBy(css = "button[type='submit']")
  lateinit var submitButton: WebElement

  init {
    PageFactory.initElements(driver, this)
  }

  fun login(email: String, password: String) {
    emailInput.sendKeys(email)
    passwordInput.sendKeys(password)
    submitButton.click()
  }
}`,
  },
  cypress: {
    typescript: `export class LoginPage {
  visit() {
    cy.visit('/login');
  }

  getEmailInput() {
    return cy.get('[data-cy="email-input"]');
  }

  getPasswordInput() {
    return cy.get('[data-cy="password-input"]');
  }

  getSubmitButton() {
    return cy.get('[data-cy="submit-btn"]');
  }

  login(email: string, password: string) {
    this.getEmailInput().type(email);
    this.getPasswordInput().type(password);
    this.getSubmitButton().click();
  }
}`,
    javascript: `class LoginPage {
  visit() {
    cy.visit('/login');
  }

  getEmailInput() {
    return cy.get('[data-cy="email-input"]');
  }

  getPasswordInput() {
    return cy.get('[data-cy="password-input"]');
  }

  getSubmitButton() {
    return cy.get('[data-cy="submit-btn"]');
  }

  login(email, password) {
    this.getEmailInput().type(email);
    this.getPasswordInput().type(password);
    this.getSubmitButton().click();
  }
}

module.exports = { LoginPage };`,
  },
};

function getPlaceholder(framework: string, language: string): string {
  return PLACEHOLDERS[framework]?.[language]
    ?? `// Exemple de Page Object pour ${framework} / ${language}\n// Collez ici votre classe de base ou un exemple représentatif.`;
}

export function PomTemplatesPage() {
  const [templates, setTemplates] = useState<PomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ framework: 'playwright', language: 'typescript', content: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<PomTemplate[]>('/api/pom-templates')
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post<PomTemplate>('/api/pom-templates', form);
      setTemplates((prev) => {
        const filtered = prev.filter((t) => !(t.framework === form.framework && t.language === form.language));
        return [...filtered, created];
      });
      setShowForm(false);
      setForm({ framework: 'playwright', language: 'typescript', content: '' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return;
    await api.delete(`/api/pom-templates/${id}`).catch(() => null);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates POM</h1>
          <p className="text-sm text-gray-500 mt-1">
            Définissez un template de Page Object pour chaque framework/langage. Il sera injecté dans le prompt de génération.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          + Nouveau template
        </Button>
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSave(e)} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Nouveau template POM</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Framework</Label>
              <Select
                value={form.framework}
                onValueChange={(v) => setForm((f) => ({ ...f, framework: v }))}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((fw) => (
                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Langage</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700 mb-1">Template (coller un exemple de Page Object)</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={12}
              className="w-full font-mono text-sm"
              placeholder={getPlaceholder(form.framework, form.language)}
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Chargement...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun template configuré.</p>
          <p className="text-xs mt-1">Ajoutez un template pour personnaliser le code généré.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm font-mono">{t.framework} / {t.language}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-sm">{t.content.slice(0, 80)}…</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDelete(t.id)}
                  className="text-xs text-red-500 border-red-200 hover:text-red-700"
                >
                  Supprimer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
