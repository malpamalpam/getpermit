import { siteConfig } from "@/config/site";

interface ContractData {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  address?: string | null;
  amountPln?: number; // kwota w PLN (pełna)
  date?: string; // data zawarcia, domyślnie dzisiaj
}

export function generateContractHtml(data: ContractData): string {
  const today = data.date ?? new Date().toLocaleDateString("pl-PL");
  const clientName =
    [data.firstName, data.lastName].filter(Boolean).join(" ") || data.email;
  const clientAddress = data.address ?? "—";
  const amountFormatted = data.amountPln
    ? `${data.amountPln.toLocaleString("pl-PL")} zł`
    : "___________";

  return `
<div style="font-family: Georgia, serif; font-size: 14px; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">

<h1 style="text-align:center; font-size:18px; text-transform:uppercase; letter-spacing:1px;">
  Umowa o świadczenie usług legalizacyjnych
</h1>
<p style="text-align:center; color:#666;">zawarta w Warszawie dnia <strong>${today}</strong></p>

<h2 style="font-size:14px; margin-top:32px;">§ 1. Strony umowy</h2>
<p><strong>Zleceniobiorca (Świadczeniodawca):</strong><br/>
${siteConfig.legalName}<br/>
ul. ${siteConfig.contact.address.street}, ${siteConfig.contact.address.postal} ${siteConfig.contact.address.city}<br/>
NIP: ${siteConfig.company.nip}<br/>
e-mail: ${siteConfig.contact.email}<br/>
zwana dalej <em>„Firmą"</em>.
</p>

<p style="margin-top:16px;"><strong>Zleceniodawca (Świadczeniobiorca):</strong><br/>
${clientName}<br/>
${clientAddress}<br/>
e-mail: ${data.email}<br/>
zwany dalej <em>„Klientem"</em>.
</p>

<h2 style="font-size:14px; margin-top:32px;">§ 2. Przedmiot umowy</h2>
<p>Firma zobowiązuje się do świadczenia na rzecz Klienta usług polegających na pomocy w legalizacji pobytu i/lub pracy na terytorium Rzeczypospolitej Polskiej, w tym w szczególności:</p>
<ol>
  <li>Analizy sytuacji prawno-pobytowej Klienta;</li>
  <li>Przygotowania i skompletowania dokumentacji wymaganej przez właściwy urząd;</li>
  <li>Złożenia wniosków w imieniu Klienta lub przy jego asyście;</li>
  <li>Monitorowania przebiegu postępowania oraz informowania Klienta o jego etapach;</li>
  <li>Pomocy w przygotowaniu ewentualnych uzupełnień, odwołań lub ponagleń.</li>
</ol>
<p>Szczegółowy zakres usług określany jest indywidualnie i potwierdzany korespondencją elektroniczną.</p>

<h2 style="font-size:14px; margin-top:32px;">§ 3. Obowiązki stron</h2>
<p><strong>Firma zobowiązuje się do:</strong></p>
<ol>
  <li>Prowadzenia spraw Klienta z należytą starannością i zgodnie z obowiązującym prawem;</li>
  <li>Zachowania poufności wszystkich przekazanych danych i dokumentów;</li>
  <li>Informowania Klienta o istotnych zmianach w jego sprawie w terminie do 3 dni roboczych od ich zaistnienia;</li>
  <li>Przechowywania dokumentacji zgodnie z przepisami o ochronie danych osobowych.</li>
</ol>
<p style="margin-top:16px;"><strong>Klient zobowiązuje się do:</strong></p>
<ol>
  <li>Dostarczenia kompletnej, rzetelnej i aktualnej dokumentacji w terminach ustalonych z Firmą;</li>
  <li>Niezwłocznego informowania Firmy o wszelkich zmianach sytuacji (zmiana pracy, adresu, danych paszportowych itp.);</li>
  <li>Terminowego regulowania wynagrodzenia zgodnie z § 4;</li>
  <li>Osobistego stawiennictwa w urzędzie, gdy wymaga tego charakter czynności.</li>
</ol>

<h2 style="font-size:14px; margin-top:32px;">§ 4. Wynagrodzenie i warunki płatności</h2>
<p>Strony ustalają wynagrodzenie Firmy za świadczone usługi w wysokości <strong>${amountFormatted}</strong> brutto (VAT zw.).</p>
<p>Płatność dokonywana jest jednorazowo, z góry, przed przystąpieniem Firmy do realizacji usługi, za pośrednictwem systemu płatności online wskazanego w Panelu Klienta.</p>
<p>Potwierdzeniem opłacenia usługi jest automatyczne potwierdzenie transakcji przesyłane na adres e-mail Klienta.</p>

<h2 style="font-size:14px; margin-top:32px;">§ 5. Czas trwania i wypowiedzenie</h2>
<p>Umowa zostaje zawarta na czas realizacji usługi określonej w § 2 i wygasa z chwilą jej wykonania lub rozwiązania.</p>
<p>Każda ze stron może rozwiązać umowę z zachowaniem 14-dniowego okresu wypowiedzenia, składając oświadczenie drogą elektroniczną na adres e-mail drugiej strony.</p>
<p>W przypadku rezygnacji przez Klienta po dokonaniu płatności, a przed przystąpieniem Firmy do świadczenia usług, Klientowi przysługuje zwrot 80% wynagrodzenia. Po rozpoczęciu świadczenia usług zwrot nie przysługuje.</p>

<h2 style="font-size:14px; margin-top:32px;">§ 6. Klauzula poufności</h2>
<p>Strony zobowiązują się do zachowania poufności wszelkich informacji uzyskanych w związku z wykonywaniem niniejszej umowy. Obowiązek ten nie dotyczy informacji powszechnie dostępnych ani tych, których ujawnienie jest wymagane przez przepisy prawa.</p>

<h2 style="font-size:14px; margin-top:32px;">§ 7. Odpowiedzialność</h2>
<p>Firma ponosi odpowiedzialność za prawidłowe przygotowanie dokumentacji i terminowe złożenie wniosków. Firma nie odpowiada za decyzje organów administracji publicznej ani za skutki wynikające z błędnych lub niekompletnych informacji dostarczonych przez Klienta.</p>

<h2 style="font-size:14px; margin-top:32px;">§ 8. Postanowienia końcowe</h2>
<ol>
  <li>W sprawach nieuregulowanych niniejszą umową zastosowanie mają przepisy Kodeksu cywilnego oraz inne właściwe przepisy prawa polskiego.</li>
  <li>Wszelkie spory wynikające z niniejszej umowy strony będą starały się rozstrzygać polubownie. W przypadku braku porozumienia sądem właściwym będzie sąd właściwy dla siedziby Firmy.</li>
  <li>Umowa zostaje zawarta w formie elektronicznej poprzez akceptację jej treści w Panelu Klienta, co jest równoznaczne z podpisem strony.</li>
</ol>

<div style="margin-top:48px; display:flex; justify-content:space-between;">
  <div>
    <p style="border-top:1px solid #ccc; padding-top:8px; width:200px;">Firma<br/><em>${siteConfig.legalName}</em></p>
  </div>
  <div>
    <p style="border-top:1px solid #ccc; padding-top:8px; width:200px;">Klient<br/><em>${clientName}</em></p>
  </div>
</div>

</div>
  `.trim();
}
