import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function ImpressumScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Impressum</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Angaben gemäß § 5 DDG</Text>

          <Text style={styles.text}>
            Schafik Fraitat{"\n"}
            Arenbergstr. 21{"\n"}
            45329 Essen{"\n"}
            Deutschland
          </Text>

          <Text style={styles.text}>
            E-Mail: schaff2005.fr@gmail.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f7f7f8",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ececec",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
    marginBottom: 14,
  },
});