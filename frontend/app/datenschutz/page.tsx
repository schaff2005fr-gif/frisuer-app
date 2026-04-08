export const metadata = {
  title: "Datenschutz | Friseur App",
  description: "Datenschutzerklärung der Friseur App",
};

export default function DatenschutzPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Datenschutzerklärung</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>1. Verantwortlicher</h2>
        <p>
          Verantwortlich für die Datenverarbeitung im Zusammenhang mit dieser Website und App ist:
        </p>
        <p>
          Schafik Fraitat
          <br />
          Arenbergstr. 21
          <br />
          45329 Essen
          <br />
          Deutschland
          <br />
          E-Mail: schaff2005.fr@gmail.com
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          2. Allgemeine Hinweise zur Datenverarbeitung
        </h2>
        <p>
          Ich verarbeite personenbezogene Daten der Nutzerinnen und Nutzer nur, soweit dies zur
          Bereitstellung einer funktionsfähigen Website und App sowie meiner Inhalte und Leistungen
          erforderlich ist.
        </p>
        <p>
          Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder
          identifizierbare natürliche Person beziehen.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          3. Aufruf der Website / App
        </h2>
        <p>
          Beim Aufruf dieser Website bzw. App werden technisch erforderliche Daten verarbeitet, um
          die Inhalte bereitzustellen und die Stabilität und Sicherheit des Angebots zu
          gewährleisten.
        </p>
        <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>IP-Adresse</li>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>aufgerufene Seiten / Ressourcen</li>
          <li>Browsertyp und Browserversion</li>
          <li>Betriebssystem</li>
          <li>Referrer-URL</li>
          <li>technische Logdaten</li>
        </ul>
        <p>
          Die Verarbeitung erfolgt zur technischen Bereitstellung, Stabilität und Sicherheit des
          Angebots.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          4. Registrierung und Login
        </h2>
        <p>Wenn Nutzer ein Konto anlegen oder sich einloggen, verarbeite ich folgende Daten:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>E-Mail-Adresse</li>
          <li>Passwort (nicht im Klartext, sondern nur in verschlüsselter Form / als Hash)</li>
          <li>Rolle des Nutzers (z. B. CUSTOMER oder BARBER)</li>
        </ul>
        <p>
          Die Verarbeitung erfolgt zum Zweck der Einrichtung und Verwaltung von Nutzerkonten sowie
          zur Authentifizierung und Nutzung geschützter Bereiche der App.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          5. Lokale Speicherung im Browser
        </h2>
        <p>
          Zur Aufrechterhaltung des Login-Status und zur technischen Nutzung der App werden im
          Browser des Nutzers lokal Daten gespeichert, insbesondere
          Authentifizierungsinformationen und nutzerbezogene Anwendungsdaten.
        </p>
        <p>
          Diese Speicherung dient ausschließlich der Bereitstellung der gewünschten Funktionen der
          App.
        </p>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO sowie, soweit technisch erforderlich, Art.
          6 Abs. 1 lit. f DSGVO.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>6. Terminbuchungen</h2>
        <p>
          Im Rahmen der Terminbuchung verarbeite ich die für die Durchführung der Buchung
          erforderlichen Daten. Dazu können insbesondere gehören:
        </p>
        <ul style={{ paddingLeft: 22 }}>
          <li>gebuchter Service</li>
          <li>Datum und Uhrzeit bzw. Zeitfenster</li>
          <li>Dauer</li>
          <li>Buchungsstatus</li>
          <li>optionale Notizen</li>
          <li>Zuordnung zum Kundenkonto</li>
          <li>Zuordnung zum Barber</li>
        </ul>
        <p>
          Die Verarbeitung erfolgt zur Durchführung der Terminbuchung, zur Verwaltung der Termine
          und zur Bereitstellung der entsprechenden Funktionen innerhalb der App.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>7. Barber-Profile</h2>
        <p>
          Barber können innerhalb der App ein Profil anlegen bzw. pflegen. Dabei können
          insbesondere folgende Daten verarbeitet und öffentlich angezeigt werden:
        </p>
        <ul style={{ paddingLeft: 22 }}>
          <li>Name</li>
          <li>Telefonnummer</li>
          <li>Straße</li>
          <li>Postleitzahl</li>
          <li>Stadt</li>
          <li>Bio</li>
          <li>Instagram</li>
          <li>Website</li>
          <li>Profilbild</li>
        </ul>
        <p>
          Diese Daten werden verarbeitet, um ein öffentliches Profil und eine buchbare Präsenz
          innerhalb der App bereitzustellen.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          8. Profilbilder / Bild-Upload
        </h2>
        <p>
          Barber können Profilbilder hochladen. Diese Bilder werden über einen externen
          Dienstleister gespeichert und ausgeliefert.
        </p>
        <p>Dabei können insbesondere folgende Daten verarbeitet werden:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>Bilddatei</li>
          <li>Bild-URL</li>
          <li>technische Metadaten im Zusammenhang mit Upload und Auslieferung</li>
        </ul>
        <p>Die Verarbeitung erfolgt zum Zweck der Darstellung des Barber-Profils.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          9. Benachrichtigungen innerhalb der App
        </h2>
        <p>
          Innerhalb der App können Benachrichtigungen zu Buchungen und Statusänderungen verarbeitet
          werden. Dabei können insbesondere folgende Daten verarbeitet werden:
        </p>
        <ul style={{ paddingLeft: 22 }}>
          <li>Benachrichtigungstyp</li>
          <li>Bezug zu einer Buchung</li>
          <li>Zeitstempel</li>
          <li>Lesestatus</li>
          <li>Zuordnung zu einem Nutzerkonto</li>
        </ul>
        <p>
          Die Verarbeitung erfolgt zur Bereitstellung der Benachrichtigungsfunktion innerhalb der
          App.
        </p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.</p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          10. Empfänger und eingesetzte Dienstleister
        </h2>
        <p>
          Zur Bereitstellung der App nutze ich technische Dienstleister. Dabei kann nicht
          ausgeschlossen werden, dass personenbezogene Daten in dem hierfür erforderlichen Umfang an
          diese Dienstleister übermittelt oder durch diese verarbeitet werden.
        </p>
        <p>Aktuell eingesetzte Dienstleister sind insbesondere:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>Vercel (Frontend-Hosting)</li>
          <li>Render (Backend-Hosting)</li>
          <li>Neon (Hosting der PostgreSQL-Datenbank)</li>
          <li>Cloudinary (Speicherung und Auslieferung von Profilbildern)</li>
        </ul>
        <p>
          Diese Dienstleister werden nur im Rahmen der Bereitstellung und technischen Durchführung
          des Angebots eingesetzt.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>11. Speicherdauer</h2>
        <p>
          Ich speichere personenbezogene Daten nur so lange, wie dies für die jeweiligen Zwecke
          erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.
        </p>
        <p>Im Einzelnen gilt:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>
            Kontodaten: bis zur Löschung des Nutzerkontos, soweit keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen
          </li>
          <li>
            Buchungsdaten: solange sie für die Durchführung, Dokumentation und Abwicklung der
            Buchungen erforderlich sind
          </li>
          <li>
            Profildaten: bis zur Änderung oder Löschung durch den Nutzer bzw. bis zur Löschung des
            Kontos
          </li>
          <li>
            technische Logdaten: grundsätzlich nur so lange, wie dies für Betrieb, Sicherheit und
            Fehleranalyse erforderlich ist
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          12. Rechtsgrundlagen der Verarbeitung
        </h2>
        <p>Soweit ich personenbezogene Daten verarbeite, erfolgt dies insbesondere auf Grundlage von:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>
            Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Erfüllung eines Vertrags oder
            zur Durchführung vorvertraglicher Maßnahmen erforderlich ist
          </li>
          <li>
            Art. 6 Abs. 1 lit. f DSGVO, soweit die Verarbeitung zur Wahrung berechtigter Interessen
            erforderlich ist, insbesondere zur technischen Bereitstellung, IT-Sicherheit und
            Fehleranalyse
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          13. Rechte der betroffenen Personen
        </h2>
        <p>Betroffene Personen haben nach der DSGVO insbesondere folgende Rechte:</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>Recht auf Auskunft</li>
          <li>Recht auf Berichtigung</li>
          <li>Recht auf Löschung</li>
          <li>Recht auf Einschränkung der Verarbeitung</li>
          <li>Recht auf Datenübertragbarkeit</li>
          <li>Recht auf Widerspruch</li>
          <li>Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde</li>
        </ul>
        <p>
          Zur Ausübung dieser Rechte kann jederzeit Kontakt über die oben angegebene E-Mail-Adresse
          aufgenommen werden.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          14. Beschwerderecht bei einer Aufsichtsbehörde
        </h2>
        <p>
          Betroffene Personen haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
          Verarbeitung ihrer personenbezogenen Daten zu beschweren.
        </p>
        <p>Zuständige Aufsichtsbehörde in Nordrhein-Westfalen ist:</p>
        <p>
          Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen
          <br />
          Kavalleriestr. 2-4
          <br />
          40213 Düsseldorf
          <br />
          Deutschland
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          15. Keine Nutzung von Analyse- und Marketingtools
        </h2>
        <p>
          Aktuell werden nach meinem derzeitigen Stand keine Analyse-, Tracking- oder Marketingtools
          eingesetzt, die über das technisch erforderliche Maß hinausgehen.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          16. Keine Kontaktaufnahme über Kontaktformular
        </h2>
        <p>
          Auf dieser Website / in dieser App wird derzeit kein eigenes Kontaktformular
          bereitgestellt.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          17. Aktualität und Änderung dieser Datenschutzerklärung
        </h2>
        <p>
          Ich behalte mir vor, diese Datenschutzerklärung anzupassen, wenn sich die Rechtslage, die
          App oder die eingesetzten Dienste ändern.
        </p>
      </section>
    </main>
  );
}