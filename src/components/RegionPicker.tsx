import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { spacing, fontSizes, fonts } from "@/lib/theme";
import { SUPPORTED_COUNTRIES, CountryCode } from "@/constants/crisisResources";

// Lets the person override which country's crisis/support numbers are shown
// (Section 4.6) - used from both the Support tab and Settings.
export function RegionPicker({
  visible,
  currentCountry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentCountry: CountryCode;
  onSelect: (code: CountryCode) => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Choose your region</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            This sets which crisis/support numbers and emergency number are shown.
          </Text>
          <FlatList
            data={SUPPORTED_COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const selected = item.code === currentCountry;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.code);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    { borderColor: theme.border, minHeight: theme.minTouchTarget },
                    selected && { backgroundColor: theme.primarySoft },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set region to ${item.countryName}`}
                >
                  <Text style={{ color: theme.text, fontSize: fontSizes.body, fontWeight: selected ? "700" : "400" }}>
                    {item.countryName}
                  </Text>
                  {selected ? <Text style={{ color: theme.text }}>✓</Text> : null}
                </Pressable>
              );
            }}
          />
          <Pressable onPress={onClose} style={[styles.closeButton, { minHeight: theme.minTouchTarget }]}>
            <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: spacing.lg, maxHeight: "70%" },
  title: { fontSize: fontSizes.title, fontFamily: fonts.heading, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSizes.label, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  closeButton: { alignItems: "center", justifyContent: "center", marginTop: spacing.md },
});
