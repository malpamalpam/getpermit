import { siteConfig } from "@/config/site";

export function getTermsHtml(): string {
  return `
<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #1a1a2e;">

<h1 style="font-size:18px; text-transform:uppercase; letter-spacing:1px;">Regulamin świadczenia usług</h1>
<p style="color:#666;">Obowiązujący od: 1 stycznia 2025 r.</p>

<h2 style="font-size:14px; margin-top:24px;">§ 1. Definicje</h2>
<p>Na potrzeby niniejszego Regulaminu stosuje się następujące definicje:</p>
<ul>
  <li><strong>Usługodawca</strong> — ${siteConfig.legalName}, z siedzibą przy ul. ${siteConfig.contact.address.street}, ${siteConfig.contact.address.postal} ${siteConfig.contact.address.city}, NIP: ${siteConfig.company.nip}.</li>
  <li><strong>Klient</strong> — osoba fizyczna lub podmiot korzystający z usług Usługodawcy.</li>
  <li><strong>Usługa</strong> — świadczenie pomocy prawnej i administracyjnej w zakresie legalizacji pobytu i pracy cudzoziemców w Polsce.</li>
  <li><strong>Panel Klienta</strong> — system informatyczny dostępny pod adresem ${siteConfig.url}/panel, umożliwiający monitorowanie spraw i komunikację z Usługodawcą.</li>
</ul>

<h2 style="font-size:14px; margin-top:24px;">§ 2. Zakres usług</h2>
<p>Usługodawca świadczy w szczególności następujące usługi:</p>
<ol>
  <li>Doradztwo w zakresie legalizacji pobytu i pracy cudzoziemców;</li>
  <li>Przygotowanie i kompletowanie dokumentacji do wniosków pobytowych i o zezwolenie na pracę;</li>
  <li>Reprezentowanie Klientów przed organami administracji publicznej;</li>
  <li>Monitorowanie statusu złożonych wniosków;</li>
  <li>Przygotowywanie uzupełnień i odwołań od decyzji administracyjnych;</li>
  <li>Tłumaczenia przysięgłe i poświadczone dokumentów;</li>
  <li>Rejestracja PESEL i Profilu Zaufanego.</li>
</ol>

<h2 style="font-size:14px; margin-top:24px;">§ 3. Warunki korzystania z usług</h2>
<ol>
  <li>Korzystanie z usług wymaga zapoznania się i zaakceptowania niniejszego Regulaminu oraz Polityki Prywatności.</li>
  <li>Klient zobowiązany jest do podania prawdziwych i aktualnych danych osobowych oraz dokumentów.</li>
  <li>Usługi świadczone są wyłącznie po dokonaniu płatności, chyba że Usługodawca postanowi inaczej na piśmie.</li>
  <li>Usługodawca zastrzega sobie prawo odmowy świadczenia usług bez podania przyczyny.</li>
</ol>

<h2 style="font-size:14px; margin-top:24px;">§ 4. Prawa i obowiązki stron</h2>
<p><strong>Klient ma prawo do:</strong></p>
<ul>
  <li>Rzetelnej informacji o przebiegu i statusie swojej sprawy;</li>
  <li>Dostępu do dokumentów przetwarzanych przez Usługodawcę;</li>
  <li>Złożenia reklamacji zgodnie z § 5.</li>
</ul>
<p style="margin-top:12px;"><strong>Klient jest zobowiązany do:</strong></p>
<ul>
  <li>Niezwłocznego przekazywania wymaganych dokumentów;</li>
  <li>Informowania Usługodawcy o wszelkich zmianach sytuacji prawnej i faktycznej;</li>
  <li>Terminowego opłacania wynagrodzenia.</li>
</ul>

<h2 style="font-size:14px; margin-top:24px;">§ 5. Reklamacje</h2>
<ol>
  <li>Klient może złożyć reklamację drogą elektroniczną na adres ${siteConfig.contact.email}.</li>
  <li>Reklamacja powinna zawierać: dane Klienta, opis zdarzenia i oczekiwany sposób rozpatrzenia.</li>
  <li>Usługodawca rozpatruje reklamację w terminie 14 dni roboczych od jej otrzymania.</li>
  <li>W przypadku nieuwzględnienia reklamacji Klient ma prawo do skorzystania z pozasądowych metod rozstrzygania sporów.</li>
</ol>

<h2 style="font-size:14px; margin-top:24px;">§ 6. Postanowienia końcowe</h2>
<ol>
  <li>Usługodawca zastrzega sobie prawo do zmiany Regulaminu z co najmniej 14-dniowym uprzedzeniem Klientów drogą elektroniczną.</li>
  <li>W sprawach nieuregulowanych stosuje się przepisy prawa polskiego.</li>
  <li>Regulamin wchodzi w życie z dniem opublikowania.</li>
</ol>

</div>
  `.trim();
}
