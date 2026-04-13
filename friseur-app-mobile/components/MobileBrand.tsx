import React from "react";
import { Image, Pressable, Text } from "react-native";
import { router } from "expo-router";

type Props = {
  showText?: boolean;
};

export default function MobileBrand({ showText = true }: Props) {
  return (
    <Pressable
      onPress={() => router.replace("/login")}
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 18,
      }}
    >
      <Image
        source={require("../assets/images/salora-logo.png")}
        style={{ width: 34, height: 34 }}
        resizeMode="contain"
      />

      {showText ? (
        <Text
          style={{
            fontSize: 20,
            fontWeight: "900",
            color: "#111",
            letterSpacing: 0.2,
          }}
        >
          Salora
        </Text>
      ) : null}
    </Pressable>
  );
}