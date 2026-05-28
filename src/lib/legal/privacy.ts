import { siteConfig } from "@/config/site";

export function getPrivacyHtml(): string {
  return `
<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #1a1a2e;">

<h1 style="font-size:18px; text-transform:uppercase; letter-spacing:1px;">Polityka prywatności i ochrona danych osobowych (RODO)</h1>
<p style="color:#666;">Obowiązująca od: 1 stycznia 2025 r.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 1. Administrator danych osobowych</h2>
<p>Administratorem Twoich danych osobowych jest <strong>${siteConfig.legalName}</strong>, ul. ${siteConfig.contact.address.street}, ${siteConfig.contact.address.postal} ${siteConfig.contact.address.city}, NIP: ${siteConfig.company.nip}, e-mail: ${siteConfig.contact.email}.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 2. Cel i podstawa prawna przetwarzania</h2>
<p>Twoje dane osobowe przetwarzamy w następujących celach i na następujących podstawach prawnych:</p>
<ul>
  <li><strong>Wykonanie umowy</strong> (art. 6 ust. 1 lit. b RODO) — w celu świadczenia usług legalizacji pobytu i pracy;</li>
  <li><strong>Obowiązek prawny</strong> (art. 6 ust. 1 lit. c RODO) — w celu wypełnienia obowiązków wynikających z przepisów prawa (m.in. przechowywania dokumentacji);</li>
  <li><strong>Prawnie uzasadniony interes</strong> (art. 6 ust. 1 lit. f RODO) — w celach komunikacji, obsługi klienta i dochodzenia ewentualnych roszczeń;</li>
  <li><strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) — w celach marketingowych, jeśli wyrażono odrębną zgodę.</li>
</ul>

<h2 style="font-size:14px; margin-top:24px;">§ 3. Zakres przetwarzanych danych</h2>
<p>Przetwarzamy następujące kategorie danych osobowych:</p>
<ul>
  <li>Dane identyfikacyjne: imię, nazwisko, data urodzenia, obywatelstwo, numer paszportu;</li>
  <li>Dane kontaktowe: adres e-mail, numer telefonu, adres zamieszkania;</li>
  <li>Dane pobytowe: status pobytowy, historia wjazdów, zezwolenia na pracę;</li>
  <li>Dane pracodawcy: nazwa firmy, adres, warunki zatrudnienia;</li>
  <li>Dokumenty: kopie paszportu, wiz, kart pobytu, umów o pracę i inne dokumenty wymagane do legalizacji.</li>
</ul>

<h2 style="font-size:14px; margin-top:24px;">§ 4. Okres przechowywania danych</h2>
<ul>
  <li>Dane związane z umową przechowywane są przez okres trwania umowy oraz 5 lat po jej zakończeniu (dla celów podatkowych i ewentualnych roszczeń);</li>
  <li>Dokumenty legalizacyjne przechowywane są przez okres wymagany przepisami prawa, nie dłużej niż 10 lat;</li>
  <li>Dane marketingowe — do czasu cofnięcia zgody.</li>
</ul>

<h2 style="font-size:14px; margin-top:24px;">§ 5. Prawa osoby, której dane dotyczą</h2>
<p>Przysługują Ci następujące prawa:</p>
<ul>
  <li><strong>Dostęp</strong> — prawo do uzyskania informacji o przetwarzanych danych;</li>
  <li><strong>Sprostowanie</strong> — prawo do poprawienia nieprawidłowych danych;</li>
  <li><strong>Usunięcie</strong> — prawo do usunięcia danych („prawo do bycia zapomnianym"), w zakresie dopuszczalnym przez prawo;</li>
  <li><strong>Ograniczenie przetwarzania</strong> — prawo do żądania ograniczenia przetwarzania danych;</li>
  <li><strong>Przenoszalność</strong> — prawo do otrzymania danych w ustrukturyzowanym formacie;</li>
  <li><strong>Sprzeciw</strong> — prawo do sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie;</li>
  <li><strong>Cofnięcie zgody</strong> — w każdym czasie, bez wpływu na zgodność z prawem przetwarzania przed jej cofnięciem.</li>
</ul>
<p>W celu realizacji praw możesz skontaktować się pod adresem: ${siteConfig.contact.email}.</p>
<p>Przysługuje Ci także prawo do wniesienia skargi do organu nadzorczego — Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 6. Odbiorcy danych</h2>
<p>Twoje dane mogą być przekazywane:</p>
<ul>
  <li>Organom administracji publicznej (w zakresie niezbędnym do złożenia wniosków);</li>
  <li>Dostawcom usług IT (hosting, poczta elektroniczna) — na podstawie stosownych umów powierzenia;</li>
  <li>Tłumaczom i biegłym sądowym — w zakresie niezbędnym do realizacji usługi.</li>
</ul>
<p>Dane nie są przekazywane do państw trzecich poza Europejskim Obszarem Gospodarczym bez odpowiednich zabezpieczeń.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 7. Bezpieczeństwo danych</h2>
<p>Stosujemy odpowiednie środki techniczne i organizacyjne chroniące Twoje dane przed nieuprawnionym dostępem, utratą lub zniszczeniem, w tym szyfrowanie połączeń (TLS), kontrolę dostępu i regularne kopie zapasowe.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 8. Zmiany polityki prywatności</h2>
<p>Zastrzegamy prawo do zmiany niniejszej polityki. O istotnych zmianach poinformujemy drogą e-mail lub poprzez Panel Klienta.</p>

</div>
  `.trim();
}
