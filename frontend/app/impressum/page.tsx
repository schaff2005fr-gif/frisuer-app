export const metadata = {
  title: "Impressum | Friseur App",
  description: "Impressum der Friseur App",
};

export default function ImpressumPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>Impressum</h1>

      <section>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          Angaben gemäß § 5 DDG
        </h2>

        <p>
          Schafik Fraitat
          <br />
          Arenbergstr. 21
          <br />
          45329 Essen
          <br />
          Deutschland
        </p>

        <p>
          E-Mail: schaff2005.fr@gmail.com
        </p>
      </section>
    </main>
  );
}