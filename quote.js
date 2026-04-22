const QUOTES = [
  "Saj vem da imaš Tetris rada... Ampak Kalvarija te tudi čaka!",
  "Dovolj imaš zaenkrat - poročilo se nebo napisalo samo....",
  "Si že Kristjanu danes povedala da ga imaš neizmerno rada?",
  "Tudi če si danes zmrda... Jutri je nov dan, in si lahko Smrketa!",
  "Si danes že pozdravila Bineta? Veš, da potrebuje tvojo toplino...",
  "Ko si jezna z mano se spomni, da bi lahko bila v Bau na šihtu...",
  "En pepsi na dan odžene zdravnika... Kam?",
  "Friendly reminder, da malo pomisliš na svojga 4-nožnega francoza.",
  "Danes pač gresta na Feri-ja. Jbg pač ma rad suhega pšanca pa riž."
];

function setRandomQuote() {
  const quoteEl = document.getElementById("daily-quote");
  if (!quoteEl || QUOTES.length === 0) return;
  const randomIndex = Math.floor(Math.random() * QUOTES.length);
  quoteEl.textContent = QUOTES[randomIndex];
}

setRandomQuote();
