import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation, languages, changeLanguage, type LanguageCode } from '@/i18n';

const LanguageSettings: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'en';

  const handleLanguageChange = async (code: LanguageCode) => {
    await changeLanguage(code, 'wildfire-app_language');
  };

  const getLanguageButtonClass = (isSelected: boolean) => {
    if (isSelected) {
      return 'border-primary/40 bg-primary/5';
    }
    return 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/60';
  };

  return (
    <div className="space-y-1.5">
      {languages.map((language, index) => (
        <button
          key={language.code}
          onClick={() => handleLanguageChange(language.code)}
          style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
          className={`
            md-row-in w-full px-2.5 py-1.5 rounded-md border transition-colors duration-150 flex items-center justify-between text-foreground
            ${getLanguageButtonClass(currentLang === language.code)}
          `}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">{language.flag}</span>
            <div className="text-left">
              <div className="font-medium text-xs text-foreground">
                {language.nativeName}
              </div>
            </div>
          </div>
          {currentLang === language.code && (
            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default LanguageSettings;
