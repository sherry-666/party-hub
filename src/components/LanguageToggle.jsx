import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageToggle = () => {
  const { lang, setLang, t } = useTranslation();

  return (
    <div className="lang-toggle" role="group" aria-label={t('toggle.ariaLabel')}>
      <button
        type="button"
        className={`lang-toggle-btn ${lang === 'zh' ? 'active' : ''}`}
        onClick={() => setLang('zh')}
        aria-pressed={lang === 'zh'}
      >
        中
      </button>
      <span className="lang-toggle-divider" aria-hidden="true">/</span>
      <button
        type="button"
        className={`lang-toggle-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .lang-toggle {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1500;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          font-family: 'Outfit', sans-serif;
        }

        .lang-toggle-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 700;
          font-size: 0.9rem;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
          transition: color 0.2s, background 0.2s;
          font-family: inherit;
          min-width: 32px;
        }

        .lang-toggle-btn:hover {
          color: rgba(255, 255, 255, 0.85);
        }

        .lang-toggle-btn.active {
          color: white;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
        }

        .lang-toggle-divider {
          color: rgba(255, 255, 255, 0.25);
          font-weight: 300;
          font-size: 0.9rem;
        }

        @media (max-width: 640px) {
          .lang-toggle {
            top: 14px;
            right: 14px;
            padding: 4px 8px;
          }
          .lang-toggle-btn {
            font-size: 0.8rem;
            padding: 3px 8px;
          }
        }
      `}} />
    </div>
  );
};

export default LanguageToggle;
