export const metadata = {
  title: "Buchungs- und Nutzungsregeln | Friseur App",
  description: "Buchungs- und Nutzungsregeln der Friseur App",
};

export default function BuchungsregelnPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>
        Buchungs- und Nutzungsregeln
      </h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>1. Geltungsbereich</h2>
        <p>
          Diese Buchungs- und Nutzungsregeln gelten für die Nutzung dieser Website und App sowie
          für die Online-Buchung von Terminen bei teilnehmenden Friseuren bzw. Barbern.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>2. Nutzung der App</h2>
        <p>
          Nutzer können über die App ein Kundenkonto erstellen, Friseure ansehen und verfügbare
          Termine buchen. Friseure können über ein eigenes Konto ihr Profil, ihre Leistungen,
          Verfügbarkeiten und Buchungen verwalten.
        </p>
        <p>
          Es besteht kein Anspruch auf eine dauerhafte oder jederzeit unterbrechungsfreie
          Verfügbarkeit der App.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          3. Registrierung und wahrheitsgemäße Angaben
        </h2>
        <p>
          Bei der Registrierung und Nutzung der App sind wahrheitsgemäße und vollständige Angaben zu
          machen. Nutzer sind verpflichtet, ihre Zugangsdaten vertraulich zu behandeln und nicht an
          Dritte weiterzugeben.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>4. Terminbuchung</h2>
        <p>
          Termine können ausschließlich über die in der App angezeigten verfügbaren Zeiten gebucht
          werden. Mit Abschluss der Buchung stellt der Nutzer eine verbindliche Terminanfrage bzw.
          Terminbuchung entsprechend der jeweiligen Darstellung in der App.
        </p>
        <p>
          Der gebuchte Termin bezieht sich auf die ausgewählte Leistung, den ausgewählten Friseur
          sowie den gewählten Tag und Zeitraum.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          5. Pflichten des Kunden
        </h2>
        <p>Kunden sind verpflichtet,</p>
        <ul style={{ paddingLeft: 22 }}>
          <li>korrekte Kontaktdaten anzugeben,</li>
          <li>zum vereinbarten Termin pünktlich zu erscheinen,</li>
          <li>Verhinderungen rechtzeitig mitzuteilen bzw. den Termin rechtzeitig zu stornieren,</li>
          <li>die App nicht missbräuchlich zu verwenden.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          6. Stornierung durch Kunden
        </h2>
        <p>
          Gebuchte Termine können nur im Rahmen der in der App vorgesehenen Funktionen storniert
          werden. Eine Stornierung ist nur bis zu dem Zeitpunkt möglich, an dem die App eine
          Stornierung noch zulässt.
        </p>
        <p>
          Nach Ablauf dieser Frist kann eine Stornierung ausgeschlossen sein. In diesem Fall sollte
          der Kunde den Friseur direkt kontaktieren, sofern entsprechende Kontaktdaten verfügbar
          sind.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          7. Nichterscheinen und verspätetes Erscheinen
        </h2>
        <p>
          Erscheint ein Kunde nicht zum gebuchten Termin oder deutlich verspätet, kann der Friseur
          den Termin ablehnen, verkürzen oder als nicht wahrgenommen markieren.
        </p>
        <p>
          Bei wiederholtem Nichterscheinen oder missbräuchlichem Buchungsverhalten kann das
          Nutzerkonto eingeschränkt oder gesperrt werden.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          8. Änderungen oder Absagen durch den Friseur
        </h2>
        <p>
          Friseure können Termine in berechtigten Fällen absagen, verschieben oder anpassen, etwa
          bei Krankheit, unvorhergesehenen betrieblichen Gründen oder organisatorischen Änderungen.
        </p>
        <p>
          Ein Anspruch auf Durchführung eines Termins zu einer ganz bestimmten Uhrzeit besteht nur
          im Rahmen der tatsächlichen betrieblichen Möglichkeiten.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          9. Leistungen und Preise
        </h2>
        <p>
          Art, Umfang und Dauer der angebotenen Leistungen richten sich nach den Angaben des
          jeweiligen Friseurs in der App.
        </p>
        <p>
          Sofern Preise in der App angegeben werden, gelten die dort ausgewiesenen Informationen.
          Falls keine Preise angezeigt werden, ist die Buchung zunächst auf die Terminreservierung
          beschränkt.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          10. Verbot missbräuchlicher Nutzung
        </h2>
        <p>
          Es ist untersagt, die App missbräuchlich zu verwenden. Dazu zählen insbesondere:
        </p>
        <ul style={{ paddingLeft: 22 }}>
          <li>falsche oder irreführende Angaben,</li>
          <li>mehrfache Scheinbuchungen,</li>
          <li>Störungen der technischen Abläufe,</li>
          <li>unbefugte Zugriffe auf fremde Konten oder Daten.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          11. Sperrung von Konten
        </h2>
        <p>
          Bei Verstößen gegen diese Regeln oder bei missbräuchlicher Nutzung kann ein Konto
          vorübergehend oder dauerhaft eingeschränkt bzw. gesperrt werden.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          12. Haftung für technische Verfügbarkeit
        </h2>
        <p>
          Die App wird mit Sorgfalt betrieben. Dennoch kann keine Gewähr für eine jederzeit
          unterbrechungsfreie Verfügbarkeit, Fehlerfreiheit oder ständige Erreichbarkeit übernommen
          werden.
        </p>
        <p>
          Für Ausfälle, Verzögerungen oder technisch bedingte Fehlbuchungen wird nur im Rahmen der
          gesetzlichen Vorschriften gehaftet.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          13. Datenschutz
        </h2>
        <p>
          Informationen zur Verarbeitung personenbezogener Daten befinden sich in der
          Datenschutzerklärung.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          14. Änderungen dieser Regeln
        </h2>
        <p>
          Diese Buchungs- und Nutzungsregeln können angepasst werden, wenn dies aufgrund technischer,
          organisatorischer oder rechtlicher Änderungen erforderlich ist.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          15. Salora Pro Abo für Friseure
        </h2>
        <p>
          Für die Nutzung bestimmter Funktionen im Barber-Bereich kann ein kostenpflichtiges
          Abonnement (&quot;Salora Pro&quot;) erforderlich sein.
        </p>
        <p>
          Salora Pro wird derzeit als monatliches Abonnement zu einem Preis von 39,99 € pro Monat
          angeboten, sofern im jeweiligen Checkout oder in der App kein anderer Preis angezeigt
          wird.
        </p>
        <p>
          Die im Rahmen von Salora Pro freigeschalteten Funktionen ergeben sich aus der jeweils
          aktuellen Beschreibung in der App, auf der Website oder im Checkout.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          16. Laufzeit, Verlängerung und Kündigung
        </h2>
        <p>
          Das Salora Pro Abo wird monatlich abgerechnet und verlängert sich automatisch um jeweils
          einen weiteren Monat, sofern es nicht vor dem nächsten Abrechnungszeitraum gekündigt
          wird.
        </p>
        <p>
          Eine Kündigung wirkt jeweils zum Ende des laufenden Abrechnungszeitraums. Bereits
          gezahlte Entgelte werden, vorbehaltlich zwingender gesetzlicher Vorschriften, nicht
          anteilig erstattet.
        </p>
        <p>
          Die Verwaltung und Kündigung erfolgt über den jeweils verwendeten Zahlungsweg bzw. den
          dort bereitgestellten Kundenbereich oder die zugehörigen Kontoeinstellungen.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          17. Zahlungsabwicklung
        </h2>
        <p>
          Die Zahlungsabwicklung für kostenpflichtige Web-Abonnements erfolgt über den im Checkout
          angegebenen Zahlungsdienstleister.
        </p>
        <p>
          Bei Käufen innerhalb von mobilen Apps kann die Abrechnung zusätzlich über den jeweiligen
          App-Store-Anbieter erfolgen. In diesen Fällen können ergänzend die Bedingungen des
          jeweiligen Zahlungs- oder Plattformanbieters gelten.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          18. Digitale Leistung und Widerruf
        </h2>
        <p>
          Bei Salora Pro handelt es sich um eine digitale Leistung, die unmittelbar nach
          Vertragsschluss bzw. nach erfolgreicher Zahlung freigeschaltet werden kann.
        </p>
        <p>
          Sofern gesetzlich erforderlich, wird der Nutzer vor Abschluss des Abonnements gesondert
          darauf hingewiesen, dass mit Beginn der Ausführung der digitalen Leistung das gesetzliche
          Widerrufsrecht ganz oder teilweise erlöschen kann.
        </p>
      </section>
    </main>
  );
}