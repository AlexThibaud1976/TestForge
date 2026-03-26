type Framework = 'playwright' | 'selenium' | 'cypress';
type Language = 'typescript' | 'javascript' | 'python' | 'java' | 'csharp' | 'ruby' | 'kotlin';

interface FrameworkSelectorProps {
  framework: Framework;
  language: Language;
  onChange: (framework: Framework, language: Language) => void;
}

const FRAMEWORKS: { id: Framework; label: string; logo: string }[] = [
  { id: 'playwright', label: 'Playwright',  logo: '🎭' },
  { id: 'selenium',   label: 'Selenium v4', logo: '⚙️' },
  { id: 'cypress',    label: 'Cypress',     logo: '🌲' },
];

const LANGUAGES_BY_FRAMEWORK: Record<Framework, { id: Language; label: string }[]> = {
  playwright: [
    { id: 'typescript', label: 'TypeScript' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'python',     label: 'Python' },
    { id: 'java',       label: 'Java' },
    { id: 'csharp',     label: 'C#' },
  ],
  selenium: [
    { id: 'java',       label: 'Java' },
    { id: 'python',     label: 'Python' },
    { id: 'csharp',     label: 'C# (NUnit)' },
    { id: 'ruby',       label: 'Ruby (RSpec)' },
    { id: 'kotlin',     label: 'Kotlin (JUnit 5)' },
  ],
  cypress: [
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
  ],
};

export function FrameworkSelector({ framework, language, onChange }: FrameworkSelectorProps) {
  const languages = LANGUAGES_BY_FRAMEWORK[framework];

  const handleFrameworkChange = (fw: Framework) => {
    // Conserver le langage si disponible, sinon prendre le premier du nouveau framework
    const available = LANGUAGES_BY_FRAMEWORK[fw];
    const sameLanguage = available.find((l) => l.id === language);
    onChange(fw, sameLanguage ? language : (available[0]?.id ?? 'typescript'));
  };

  return (
    <div className="space-y-2">
      {/* Framework */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Framework</p>
        <div className="flex gap-2">
          {FRAMEWORKS.map((fw) => (
            <button
              key={fw.id}
              type="button"
              onClick={() => handleFrameworkChange(fw.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                framework === fw.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{fw.logo}</span>
              {fw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Langage</p>
        <div className="flex gap-1.5 flex-wrap">
          {languages.map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => onChange(framework, lang.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                language === lang.id
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
