import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-impressum',
  imports: [CommonModule],
  template: `
  <article class="container">
    <h1>Impressum</h1>

    <section>
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Duale Hochschule Baden-Württemberg Mosbach<br>
        Lohrtalweg 10<br>
        74821 Mosbach
      </p>
    </section>

    <section>
      <h2>Kontakt</h2>
      <p>
        Telefon: +49 6261 939-0<br>
        Fax: +49 6261 939-199<br>
        E-Mail: <a href="mailto:mosbach@dhbw.de">mosbach@dhbw.de</a><br>
        Internet: <a href="https://www.mosbach.dhbw.de" target="_blank" rel="noopener">www.mosbach.dhbw.de</a>
      </p>
    </section>

    <section>
      <h2>Vertreten durch</h2>
      <p>
        Rektorin Prof. Dr. Gabi Jeck-Schlottmann<br>
        Kanzlerin Dr. Gisela Finckh
      </p>
    </section>

    <section>
      <h2>Aufsichtsbehörde</h2>
      <p>
        Ministerium für Wissenschaft, Forschung und Kunst Baden-Württemberg<br>
        Königstraße 46<br>
        70173 Stuttgart
      </p>
    </section>

    <section>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>
        Die Inhalte dieser Website dienen ausschließlich zu Demonstrationszwecken im Rahmen
        eines Studienprojekts der DHBW Mosbach.
      </p>
    </section>
  </article>
  `,
  styles: [`
    .container{max-width:780px;margin:32px auto;padding:0 16px}
    h1{margin-bottom:24px}
    h2{margin:24px 0 8px;font-size:1.2rem}
    p{margin:0 0 12px;line-height:1.6}
    a{color:#2563eb;text-decoration:none}
    a:hover{text-decoration:underline}
  `]
})
export class ImpressumComponent {}
