import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

// Top-level error boundary. React error boundaries must be class components
// (getDerivedStateFromError / componentDidCatch have no hook equivalent).
//
// This wraps the entire app (see App.tsx) so that if ANY provider, screen, or
// the navigator throws during render, the user sees a calm recovery screen
// instead of a blank white screen - the failure mode this app has hit before.
//
// Deliberately self-contained: it does NOT read ThemeContext or brand fonts,
// because the thing that crashed might be a provider or font loading itself.
// Colours are the "Midnight Signal" dark palette hard-coded from lib/theme so
// the fallback still looks on-brand even with everything else torn down.

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

const COLORS = {
  background: "#0B1128", // midnight
  surface: "#151D3E",
  text: "#EEF1FC",
  textMuted: "#A9B4DC",
  primary: "#F3C77C", // warm gold
  onPrimary: "#3B2508",
  border: "#2C3560",
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface it in logs for debugging / future crash reporting.
    console.error("ErrorBoundary caught an error:", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected problem. Your check-ins and journal are
            saved and safe. Try again below — if it keeps happening, close the
            app fully and reopen it.
          </Text>

          {__DEV__ && this.state.error ? (
            <Text style={styles.debug} selectable>
              {this.state.error.message}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try again"
            onPress={this.handleRetry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  debug: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 16,
    opacity: 0.8,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 24,
  },
  buttonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
});
