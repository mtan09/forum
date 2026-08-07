import { captureAppException } from '@/lib/sentry';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tapLight } from '@/lib/haptics';

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureAppException(error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.brand}>forum</Text>
        <Text style={styles.title}>This screen hit a problem.</Text>
        <Text style={styles.copy}>
          The error was recorded with the app version and build number. You can retry without signing out.
        </Text>
        <Pressable
          onPress={() => { tapLight(); this.setState({ error: null }); }}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.72 }]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111013',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  brand: { color: '#B647FF', fontSize: 30, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 18 },
  copy: { color: '#B8B4BF', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  button: {
    marginTop: 22,
    minWidth: 150,
    borderRadius: 14,
    backgroundColor: '#B647FF',
    paddingHorizontal: 22,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
