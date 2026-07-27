import type { ExpoConfig, ConfigContext } from 'expo/config';
import base from './app.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const app = { ...config, ...base.expo } as ExpoConfig;
  const plugins = [...(base.expo.plugins ?? [])] as NonNullable<ExpoConfig['plugins']>;
  const organization = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  // Source-map upload needs the project identifiers at native-build time.
  // Local development stays warning-free when Sentry is not configured.
  if (organization && project) {
    plugins.splice(3, 0, [
      '@sentry/react-native/expo',
      { organization, project },
    ]);
  }

  return { ...app, plugins };
};
