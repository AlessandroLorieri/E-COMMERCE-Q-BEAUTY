import React from 'react';
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'it' ? 'en' : 'it');
  };

  return (
    <button
      onClick={toggleLanguage}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: '#d4af37',
        color: '#000',
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        zIndex: 1001
      }}
    >
      {i18n.language === 'it' ? 'EN' : 'IT'}
    </button>
  );
}

export default LanguageSwitcher;
