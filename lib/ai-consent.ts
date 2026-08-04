export const AI_CONSENT_VERSION = '2026-08-02';

type ConsentRequestHandler = () => Promise<boolean>;

let consentRequestHandler: ConsentRequestHandler | null = null;

export function setAIConsentRequestHandler(handler: ConsentRequestHandler | null): void {
  consentRequestHandler = handler;
}

export async function requestAIConsent(): Promise<boolean> {
  return consentRequestHandler ? consentRequestHandler() : false;
}
