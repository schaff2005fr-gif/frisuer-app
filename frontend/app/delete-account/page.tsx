export const metadata = {
  title: "Konto löschen | Salora",
  description: "Informationen zur Löschung deines Salora-Kontos und der zugehörigen Daten.",
};

export default function DeleteAccountPage() {
  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#111",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>
        Konto löschen
      </h1>

      <p style={{ marginBottom: 16 }}>
        Wenn du dein Salora-Konto und die damit verbundenen personenbezogenen
        Daten löschen lassen möchtest, kannst du dies direkt in der App
        veranlassen oder uns über die unten angegebene E-Mail-Adresse eine
        Anfrage senden.
      </p>

      <section style={{ marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          So kannst du die Löschung anfordern
        </h2>

        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 10 }}>
            Nutze die Funktion zur Kontolöschung direkt in der App.
          </li>
          <li style={{ marginBottom: 10 }}>
            Oder sende eine E-Mail an{" "}
            <a
              href="mailto:schaff2005.fr@gmail.com?subject=Anfrage%20zur%20Kontol%C3%B6schung%20bei%20Salora"
              style={{ color: "#0a66c2", textDecoration: "underline" }}
            >
              schaff2005.fr@gmail.com
            </a>
            .
          </li>
          <li style={{ marginBottom: 10 }}>
            Bitte gib dabei die E-Mail-Adresse an, mit der dein Konto bei
            Salora registriert wurde, damit wir deine Anfrage zuordnen können.
          </li>
        </ol>
      </section>

      <section style={{ marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          Welche Daten gelöscht werden
        </h2>

        <p style={{ marginBottom: 12 }}>
          Nach erfolgreicher Prüfung deiner Anfrage löschen wir dein Konto sowie
          die damit verbundenen personenbezogenen Daten, soweit keine
          gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>

        <p style={{ marginBottom: 12 }}>
          Dazu können insbesondere folgende Daten gehören:
        </p>

        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>Kontodaten</li>
          <li style={{ marginBottom: 8 }}>Profildaten</li>
          <li style={{ marginBottom: 8 }}>Buchungsbezogene Daten</li>
          <li style={{ marginBottom: 8 }}>vom Nutzer hinterlegte Kontaktdaten</li>
        </ul>
      </section>

      <section style={{ marginTop: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          Gesetzliche Aufbewahrung
        </h2>

        <p style={{ marginBottom: 12 }}>
          Daten, die wir aufgrund gesetzlicher Vorschriften weiterhin speichern
          müssen, werden nicht sofort gelöscht, sondern nach Ablauf der
          jeweiligen Aufbewahrungsfrist entfernt.
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          Kontakt
        </h2>

        <p style={{ marginBottom: 0 }}>
          E-Mail:{" "}
          <a
            href="mailto:schaff2005.fr@gmail.com?subject=Anfrage%20zur%20Kontol%C3%B6schung%20bei%20Salora"
            style={{ color: "#0a66c2", textDecoration: "underline" }}
          >
            schaff2005.fr@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}