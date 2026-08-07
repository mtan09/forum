import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

/**
 * Open a link outside the app.
 *
 * Native keeps expo-web-browser's in-app browser (SFSafariViewController on
 * iOS), which is the right affordance there — you stay in the app and swipe
 * back.
 *
 * Web cannot use it. expo-web-browser always calls window.open with a feature
 * string carrying explicit width/height/top/left and toolbar=no, which every
 * browser surfaces as a stripped-down popup window rather than a tab, and no
 * option suppresses those defaults. An anchor with target="_blank" gets the
 * ordinary new tab people expect, and rel="noopener" keeps the opened page from
 * reaching back into ours through window.opener.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Platform.OS !== 'web') {
    await WebBrowser.openBrowserAsync(url);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
