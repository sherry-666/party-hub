import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCookie, setCookie } from '../utils/cookieUtils';
import zh from '../locales/zh';
import en from '../locales/en';

const DICTS = { zh, en };
const DEFAULT_LANG = 'zh';
const COOKIE_KEY = 'language';

const LanguageContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

const resolveKey = (dict, key) => {
  if (!dict) return undefined;
  if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), dict);
};

const interpolate = (str, vars) => {
  if (typeof str !== 'string' || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, name) => (vars[name] !== undefined ? String(vars[name]) : `{${name}}`));
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const stored = getCookie(COOKIE_KEY);
    return stored === 'en' || stored === 'zh' ? stored : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh';
  }, [lang]);

  const setLang = useCallback((next) => {
    if (next !== 'zh' && next !== 'en') return;
    setLangState(next);
    setCookie(COOKIE_KEY, next, 365);
  }, []);

  const t = useCallback((key, vars) => {
    const dict = DICTS[lang] || DICTS[DEFAULT_LANG];
    const value = resolveKey(dict, key);
    if (value === undefined) {
      const fallback = resolveKey(DICTS[DEFAULT_LANG], key);
      return interpolate(fallback !== undefined ? fallback : key, vars);
    }
    return interpolate(value, vars);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
