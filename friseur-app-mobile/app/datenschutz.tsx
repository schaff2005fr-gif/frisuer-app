import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function DatenschutzScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Datenschutzerklärung</Text>

        <Section title="1. Verantwortlicher">
          <Text style={styles.text}>
            Verantwortlich für die Datenverarbeitung im Zusammenhang mit dieser App ist:
          </Text>
          <Text style={styles.text}>
            Schafik Fraitat{"\n"}
            Arenbergstr. 21{"\n"}
            45329 Essen{"\n"}
            Deutschland{"\n"}
            E-Mail: schaff2005.fr@gmail.com
          </Text>
        </Section>

        <Section title="2. Allgemeine Hinweise zur Datenverarbeitung">
          <Text style={styles.text}>
            Ich verarbeite personenbezogene Daten der Nutzerinnen und Nutzer nur, soweit dies zur
            Bereitstellung einer funktionsfähigen App sowie meiner Inhalte und Leistungen
            erforderlich ist.
          </Text>
          <Text style={styles.text}>
            Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder
            identifizierbare natürliche Person beziehen.
          </Text>
        </Section>

        <Section title="3. Aufruf der App">
          <Text style={styles.text}>
            Beim Aufruf dieser App werden technisch erforderliche Daten verarbeitet, um die Inhalte
            bereitzustellen und die Stabilität und Sicherheit des Angebots zu gewährleisten.
          </Text>
          <Text style={styles.text}>Dabei können insbesondere folgende Daten verarbeitet werden:</Text>
          <BulletList
            items={[
              "IP-Adresse",
              "Datum und Uhrzeit des Zugriffs",
              "aufgerufene Seiten / Ressourcen",
              "Browsertyp und Browserversion",
              "Betriebssystem",
              "Referrer-URL",
              "technische Logdaten",
            ]}
          />
          <Text style={styles.text}>
            Die Verarbeitung erfolgt zur technischen Bereitstellung, Stabilität und Sicherheit des
            Angebots.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</Text>
        </Section>

        <Section title="4. Registrierung und Login">
          <Text style={styles.text}>
            Wenn Nutzer ein Konto anlegen oder sich einloggen, verarbeite ich folgende Daten:
          </Text>
          <BulletList
            items={[
              "E-Mail-Adresse",
              "Passwort (nicht im Klartext, sondern nur in verschlüsselter Form / als Hash)",
              "Rolle des Nutzers (z. B. CUSTOMER oder BARBER)",
            ]}
          />
          <Text style={styles.text}>
            Die Verarbeitung erfolgt zum Zweck der Einrichtung und Verwaltung von Nutzerkonten sowie
            zur Authentifizierung und Nutzung geschützter Bereiche der App.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</Text>
        </Section>

        <Section title="5. Lokale Speicherung auf dem Gerät">
          <Text style={styles.text}>
            Zur Aufrechterhaltung des Login-Status und zur technischen Nutzung der App werden auf
            dem Gerät des Nutzers lokal Daten gespeichert, insbesondere
            Authentifizierungsinformationen und nutzerbezogene Anwendungsdaten.
          </Text>
          <Text style={styles.text}>
            Diese Speicherung dient ausschließlich der Bereitstellung der gewünschten Funktionen der
            App.
          </Text>
          <Text style={styles.text}>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO sowie, soweit technisch erforderlich,
            Art. 6 Abs. 1 lit. f DSGVO.
          </Text>
        </Section>

        <Section title="6. Terminbuchungen">
          <Text style={styles.text}>
            Im Rahmen der Terminbuchung verarbeite ich die für die Durchführung der Buchung
            erforderlichen Daten. Dazu können insbesondere gehören:
          </Text>
          <BulletList
            items={[
              "gebuchter Service",
              "Datum und Uhrzeit bzw. Zeitfenster",
              "Dauer",
              "Buchungsstatus",
              "optionale Notizen",
              "Zuordnung zum Kundenkonto",
              "Zuordnung zum Barber",
            ]}
          />
          <Text style={styles.text}>
            Die Verarbeitung erfolgt zur Durchführung der Terminbuchung, zur Verwaltung der Termine
            und zur Bereitstellung der entsprechenden Funktionen innerhalb der App.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</Text>
        </Section>

        <Section title="7. Barber-Profile">
          <Text style={styles.text}>
            Barber können innerhalb der App ein Profil anlegen bzw. pflegen. Dabei können
            insbesondere folgende Daten verarbeitet und öffentlich angezeigt werden:
          </Text>
          <BulletList
            items={[
              "Name",
              "Telefonnummer",
              "Straße",
              "Postleitzahl",
              "Stadt",
              "Bio",
              "Instagram",
              "Website",
              "Profilbild",
            ]}
          />
          <Text style={styles.text}>
            Diese Daten werden verarbeitet, um ein öffentliches Profil und eine buchbare Präsenz
            innerhalb der App bereitzustellen.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</Text>
        </Section>

        <Section title="8. Profilbilder / Bild-Upload">
          <Text style={styles.text}>
            Barber können Profilbilder hochladen. Diese Bilder werden über einen externen
            Dienstleister gespeichert und ausgeliefert.
          </Text>
          <Text style={styles.text}>Dabei können insbesondere folgende Daten verarbeitet werden:</Text>
          <BulletList
            items={[
              "Bilddatei",
              "Bild-URL",
              "technische Metadaten im Zusammenhang mit Upload und Auslieferung",
            ]}
          />
          <Text style={styles.text}>
            Die Verarbeitung erfolgt zum Zweck der Darstellung des Barber-Profils.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</Text>
        </Section>

        <Section title="9. Benachrichtigungen innerhalb der App">
          <Text style={styles.text}>
            Innerhalb der App können Benachrichtigungen zu Buchungen und Statusänderungen
            verarbeitet werden. Dabei können insbesondere folgende Daten verarbeitet werden:
          </Text>
          <BulletList
            items={[
              "Benachrichtigungstyp",
              "Bezug zu einer Buchung",
              "Zeitstempel",
              "Lesestatus",
              "Zuordnung zu einem Nutzerkonto",
            ]}
          />
          <Text style={styles.text}>
            Die Verarbeitung erfolgt zur Bereitstellung der Benachrichtigungsfunktion innerhalb der
            App.
          </Text>
          <Text style={styles.text}>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</Text>
        </Section>

        <Section title="10. Empfänger und eingesetzte Dienstleister">
          <Text style={styles.text}>
            Zur Bereitstellung der App nutze ich technische Dienstleister. Dabei kann nicht
            ausgeschlossen werden, dass personenbezogene Daten in dem hierfür erforderlichen Umfang
            an diese Dienstleister übermittelt oder durch diese verarbeitet werden.
          </Text>
          <Text style={styles.text}>Aktuell eingesetzte Dienstleister sind insbesondere:</Text>
          <BulletList
            items={[
              "Vercel (Frontend-Hosting)",
              "Render (Backend-Hosting)",
              "Neon (Hosting der PostgreSQL-Datenbank)",
              "Cloudinary (Speicherung und Auslieferung von Profilbildern)",
            ]}
          />
          <Text style={styles.text}>
            Diese Dienstleister werden nur im Rahmen der Bereitstellung und technischen Durchführung
            des Angebots eingesetzt.
          </Text>
        </Section>

        <Section title="11. Speicherdauer">
          <Text style={styles.text}>
            Ich speichere personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke
            erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
          </Text>
          <Text style={styles.text}>Im Einzelnen gilt:</Text>
          <BulletList
            items={[
              "Kontodaten: bis zur Löschung des Nutzerkontos, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen",
              "Buchungsdaten: solange sie für die Durchführung, Dokumentation und Abwicklung der Buchungen erforderlich sind",
              "Profildaten: bis zur Änderung oder Löschung durch den Nutzer bzw. bis zur Löschung des Kontos",
              "technische Logdaten: grundsätzlich nur so lange, wie dies für Betrieb, Sicherheit und Fehleranalyse erforderlich ist",
            ]}
          />
        </Section>

        <Section title="12. Rechtsgrundlagen der Verarbeitung">
          <Text style={styles.text}>
            Soweit ich personenbezogene Daten verarbeite, erfolgt dies insbesondere auf Grundlage
            von:
          </Text>
          <BulletList
            items={[
              "Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Erfüllung eines Vertrags oder zur Durchführung vorvertraglicher Maßnahmen erforderlich ist",
              "Art. 6 Abs. 1 lit. f DSGVO, soweit die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist, insbesondere zur technischen Bereitstellung, IT-Sicherheit und Fehleranalyse",
            ]}
          />
        </Section>

        <Section title="13. Rechte der betroffenen Personen">
          <Text style={styles.text}>
            Betroffene Personen haben nach der DSGVO insbesondere folgende Rechte:
          </Text>
          <BulletList
            items={[
              "Recht auf Auskunft",
              "Recht auf Berichtigung",
              "Recht auf Löschung",
              "Recht auf Einschränkung der Verarbeitung",
              "Recht auf Datenübertragbarkeit",
              "Recht auf Widerspruch",
              "Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde",
            ]}
          />
          <Text style={styles.text}>
            Zur Ausübung dieser Rechte kann jederzeit Kontakt über die oben angegebene E-Mail-Adresse
            aufgenommen werden.
          </Text>
        </Section>

        <Section title="14. Beschwerderecht bei einer Aufsichtsbehörde">
          <Text style={styles.text}>
            Betroffene Personen haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
            Verarbeitung ihrer personenbezogenen Daten zu beschweren.
          </Text>
          <Text style={styles.text}>Zuständige Aufsichtsbehörde in Nordrhein-Westfalen ist:</Text>
          <Text style={styles.text}>
            Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen{"\n"}
            Kavalleriestr. 2-4{"\n"}
            40213 Düsseldorf{"\n"}
            Deutschland
          </Text>
        </Section>

        <Section title="15. Keine Nutzung von Analyse- und Marketingtools">
          <Text style={styles.text}>
            Aktuell werden nach meinem derzeitigen Stand keine Analyse-, Tracking- oder
            Marketingtools eingesetzt, die über das technisch erforderliche Maß hinausgehen.
          </Text>
        </Section>

        <Section title="16. Keine Kontaktaufnahme über Kontaktformular">
          <Text style={styles.text}>
            In dieser App wird derzeit kein eigenes Kontaktformular bereitgestellt.
          </Text>
        </Section>

        <Section title="17. Aktualität und Änderung dieser Datenschutzerklärung">
          <Text style={styles.text}>
            Ich behalte mir vor, diese Datenschutzerklärung anzupassen, wenn sich die Rechtslage,
            die App oder die eingesetzten Dienste ändern.
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
    marginBottom: 10,
  },
  list: {
    marginBottom: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    lineHeight: 24,
    color: "#111",
    marginRight: 8,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
  },
});