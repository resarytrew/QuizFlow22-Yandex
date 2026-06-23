const LEGAL_DOCUMENT_BASE_URL = 'https://mykviz.ru';

export const LEGAL_DOCUMENTS = [
  {
    id: 'offer',
    label: 'Публичная оферта',
    href: `${LEGAL_DOCUMENT_BASE_URL}/legal/public-offer.html`,
  },
  {
    id: 'privacy',
    label: 'Обработка персональных данных',
    href: `${LEGAL_DOCUMENT_BASE_URL}/legal/privacy-policy.html`,
  },
  {
    id: 'rules',
    label: 'Правила проекта',
    href: `${LEGAL_DOCUMENT_BASE_URL}/legal/project-rules.html`,
  },
] as const;

export const LEGAL_DOCUMENT_HREFS = {
  offer: LEGAL_DOCUMENTS[0].href,
  privacy: LEGAL_DOCUMENTS[1].href,
  rules: LEGAL_DOCUMENTS[2].href,
} as const;
