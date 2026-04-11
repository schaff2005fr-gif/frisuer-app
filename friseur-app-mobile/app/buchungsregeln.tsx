import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function BuchungsregelnScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Buchungs- und Nutzungsregeln</Text>

        <Section title="1. Geltungsbereich">
          <Text style={styles.text}>
            Diese Buchungs- und Nutzungsregeln gelten für die Nutzung dieser App sowie für die
            Online-Buchung von Terminen bei teilnehmenden Friseuren bzw. Barbern.
          </Text>
        </Section>

        <Section title="2. Nutzung der App">
          <Text style={styles.text}>
            Nutzer können über die App ein Kundenkonto erstellen, Friseure ansehen und verfügbare
            Termine buchen. Friseure können über ein eigenes Konto ihr Profil, ihre Leistungen,
            Verfügbarkeiten und Buchungen verwalten.
          </Text>
          <Text style={styles.text}>
            Es besteht kein Anspruch auf eine dauerhafte oder jederzeit unterbrechungsfreie
            Verfügbarkeit der App.
          </Text>
        </Section>

        <Section title="3. Registrierung und wahrheitsgemäße Angaben">
          <Text style={styles.text}>
            Bei der Registrierung und Nutzung der App sind wahrheitsgemäße und vollständige Angaben
            zu machen. Nutzer sind verpflichtet, ihre Zugangsdaten vertraulich zu behandeln und
            nicht an Dritte weiterzugeben.
          </Text>
        </Section>

        <Section title="4. Terminbuchung">
          <Text style={styles.text}>
            Termine können ausschließlich über die in der App angezeigten verfügbaren Zeiten
            gebucht werden. Mit Abschluss der Buchung stellt der Nutzer eine verbindliche
            Terminanfrage bzw. Terminbuchung entsprechend der jeweiligen Darstellung in der App.
          </Text>
          <Text style={styles.text}>
            Der gebuchte Termin bezieht sich auf die ausgewählte Leistung, den ausgewählten Friseur
            sowie den gewählten Tag und Zeitraum.
          </Text>
        </Section>

        <Section title="5. Pflichten des Kunden">
          <Text style={styles.text}>Kunden sind verpflichtet,</Text>
          <BulletList
            items={[
              "korrekte Kontaktdaten anzugeben,",
              "zum vereinbarten Termin pünktlich zu erscheinen,",
              "Verhinderungen rechtzeitig mitzuteilen bzw. den Termin rechtzeitig zu stornieren,",
              "die App nicht missbräuchlich zu verwenden.",
            ]}
          />
        </Section>

        <Section title="6. Stornierung durch Kunden">
          <Text style={styles.text}>
            Gebuchte Termine können nur im Rahmen der in der App vorgesehenen Funktionen storniert
            werden. Eine Stornierung ist nur bis zu dem Zeitpunkt möglich, an dem die App eine
            Stornierung noch zulässt.
          </Text>
          <Text style={styles.text}>
            Nach Ablauf dieser Frist kann eine Stornierung ausgeschlossen sein. In diesem Fall
            sollte der Kunde den Friseur direkt kontaktieren, sofern entsprechende Kontaktdaten
            verfügbar sind.
          </Text>
        </Section>

        <Section title="7. Nichterscheinen und verspätetes Erscheinen">
          <Text style={styles.text}>
            Erscheint ein Kunde nicht zum gebuchten Termin oder deutlich verspätet, kann der Friseur
            den Termin ablehnen, verkürzen oder als nicht wahrgenommen markieren.
          </Text>
          <Text style={styles.text}>
            Bei wiederholtem Nichterscheinen oder missbräuchlichem Buchungsverhalten kann das
            Nutzerkonto eingeschränkt oder gesperrt werden.
          </Text>
        </Section>

        <Section title="8. Änderungen oder Absagen durch den Friseur">
          <Text style={styles.text}>
            Friseure können Termine in berechtigten Fällen absagen, verschieben oder anpassen, etwa
            bei Krankheit, unvorhergesehenen betrieblichen Gründen oder organisatorischen
            Änderungen.
          </Text>
          <Text style={styles.text}>
            Ein Anspruch auf Durchführung eines Termins zu einer ganz bestimmten Uhrzeit besteht nur
            im Rahmen der tatsächlichen betrieblichen Möglichkeiten.
          </Text>
        </Section>

        <Section title="9. Leistungen und Preise">
          <Text style={styles.text}>
            Art, Umfang und Dauer der angebotenen Leistungen richten sich nach den Angaben des
            jeweiligen Friseurs in der App.
          </Text>
          <Text style={styles.text}>
            Sofern Preise in der App angegeben werden, gelten die dort ausgewiesenen Informationen.
            Falls keine Preise angezeigt werden, ist die Buchung zunächst auf die Terminreservierung
            beschränkt.
          </Text>
        </Section>

        <Section title="10. Verbot missbräuchlicher Nutzung">
          <Text style={styles.text}>
            Es ist untersagt, die App missbräuchlich zu verwenden. Dazu zählen insbesondere:
          </Text>
          <BulletList
            items={[
              "falsche oder irreführende Angaben,",
              "mehrfache Scheinbuchungen,",
              "Störungen der technischen Abläufe,",
              "unbefugte Zugriffe auf fremde Konten oder Daten.",
            ]}
          />
        </Section>

        <Section title="11. Sperrung von Konten">
          <Text style={styles.text}>
            Bei Verstößen gegen diese Regeln oder bei missbräuchlicher Nutzung kann ein Konto
            vorübergehend oder dauerhaft eingeschränkt bzw. gesperrt werden.
          </Text>
        </Section>

        <Section title="12. Haftung für technische Verfügbarkeit">
          <Text style={styles.text}>
            Die App wird mit Sorgfalt betrieben. Dennoch kann keine Gewähr für eine jederzeit
            unterbrechungsfreie Verfügbarkeit, Fehlerfreiheit oder ständige Erreichbarkeit
            übernommen werden.
          </Text>
          <Text style={styles.text}>
            Für Ausfälle, Verzögerungen oder technisch bedingte Fehlbuchungen wird nur im Rahmen der
            gesetzlichen Vorschriften gehaftet.
          </Text>
        </Section>

        <Section title="13. Datenschutz">
          <Text style={styles.text}>
            Informationen zur Verarbeitung personenbezogener Daten befinden sich in der
            Datenschutzerklärung.
          </Text>
        </Section>

        <Section title="14. Änderungen dieser Regeln">
          <Text style={styles.text}>
            Diese Buchungs- und Nutzungsregeln können angepasst werden, wenn dies aufgrund
            technischer, organisatorischer oder rechtlicher Änderungen erforderlich ist.
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