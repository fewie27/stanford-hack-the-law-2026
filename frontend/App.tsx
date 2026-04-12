import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { getEvidenceApiBaseUrl, isProductionEvidenceApi } from './evidenceApi';

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const apiBase = getEvidenceApiBaseUrl();
  const apiMode = isProductionEvidenceApi() ? 'Server API' : 'Local dev (localhost:8000)';

  return (
    <View style={styles.root}>
      <View style={[styles.card, isWide && styles.cardWide]}>
        <Text style={styles.badge}>React Native · Web</Text>
        <Text style={styles.title}>Hackathon Template</Text>
        <Text style={styles.subtitle}>
          API: {apiMode}
        </Text>
        <Text style={[styles.subtitle, styles.mono]} selectable>
          {apiBase}
        </Text>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 520,
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardWide: {
    paddingVertical: 48,
    paddingHorizontal: 40,
  },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#38bdf8',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#94a3b8',
  },
  mono: {
    fontFamily: 'monospace',
    color: '#e2e8f0',
  },
});
