import { useTranslation } from 'react-i18next';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { languageNames, supportedLngs } from '@/i18n';

type LanguageSwitcherProps = {
  /** Called after the language changes (e.g. to close the mobile menu). */
  onLanguageChange?: () => void;
  size?: 'sm' | 'md';
  className?: string;
};

export function LanguageSwitcher({
  onLanguageChange,
  size = 'sm',
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
    onLanguageChange?.();
  };

  return (
    <ToggleGroup
      variant="language"
      value={[current]}
      onValueChange={(values) => {
        if (values[0]) changeLanguage(values[0]);
      }}
      className={className}
      aria-label={t('common.switchLanguage')}
    >
      {supportedLngs.map((lng) => (
        <ToggleGroupItem
          variant="language"
          size={size}
          key={lng}
          value={lng}
          aria-label={`${t('common.switchLanguage')} / ${languageNames[lng]}`}
        >
          {languageNames[lng]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
