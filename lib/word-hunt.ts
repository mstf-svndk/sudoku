export type Category = 'Hayvanlar' | 'Doğa' | 'Günlük yaşam' | 'Bilim';
export type WordEntry = { word: string; clue: string; category: Category };

export const WORDS: WordEntry[] = [
  { word: 'KAPLAN', clue: 'Çizgili, büyük bir kedidir.', category: 'Hayvanlar' },
  { word: 'ZÜRAFA', clue: 'Boynu çok uzundur.', category: 'Hayvanlar' },
  { word: 'PENGUEN', clue: 'Uçamaz ama çok iyi yüzer.', category: 'Hayvanlar' },
  { word: 'KİRPİ', clue: 'Sırtında dikenler taşır.', category: 'Hayvanlar' },
  { word: 'YUNUS', clue: 'Denizde yaşayan zeki bir memelidir.', category: 'Hayvanlar' },
  { word: 'KAPLUMBAĞA', clue: 'Evini sırtında taşır.', category: 'Hayvanlar' },
  { word: 'GÖKKUŞAĞI', clue: 'Yağmurdan sonra gökyüzünde renk renk görünür.', category: 'Doğa' },
  { word: 'ŞELALE', clue: 'Suyun yüksekten döküldüğü yerdir.', category: 'Doğa' },
  { word: 'YILDIRIM', clue: 'Fırtınada gökyüzünde ışıldar.', category: 'Doğa' },
  { word: 'PAPATYA', clue: 'Beyaz yapraklı, sarı ortalı bir çiçektir.', category: 'Doğa' },
  { word: 'RÜZGAR', clue: 'Havayı hareket ettirir, kendisi görünmez.', category: 'Doğa' },
  { word: 'ORMAN', clue: 'Birçok ağacın birlikte büyüdüğü yerdir.', category: 'Doğa' },
  { word: 'ŞEMSİYE', clue: 'Yağmurda kuru kalmana yardım eder.', category: 'Günlük yaşam' },
  { word: 'KÜTÜPHANE', clue: 'Kitapların ödünç alındığı sessiz yerdir.', category: 'Günlük yaşam' },
  { word: 'BİSİKLET', clue: 'İki tekeri ve pedalları vardır.', category: 'Günlük yaşam' },
  { word: 'PENCERE', clue: 'Evden dışarı bakmanı sağlar.', category: 'Günlük yaşam' },
  { word: 'BUZDOLABI', clue: 'Yiyecekleri soğuk tutar.', category: 'Günlük yaşam' },
  { word: 'KALEM', clue: 'Yazı yazmak için kullanılır.', category: 'Günlük yaşam' },
  { word: 'GEZEGEN', clue: 'Bir yıldızın çevresinde dolanır.', category: 'Bilim' },
  { word: 'MIKNATIS', clue: 'Bazı metalleri kendine çeker.', category: 'Bilim' },
  { word: 'DENEY', clue: 'Bir fikri sınamak için yapılır.', category: 'Bilim' },
  { word: 'TELESKOP', clue: 'Uzak gök cisimlerine bakmayı sağlar.', category: 'Bilim' },
  { word: 'ROBOT', clue: 'Komutlarla çeşitli işler yapabilen makinedir.', category: 'Bilim' },
  { word: 'ELEKTRİK', clue: 'Lambayı yakmak için de kullanılır.', category: 'Bilim' },
];

export const LETTERS = Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ');

export function cleanWord(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
}

export function validCustomWord(value: string): boolean {
  const word = cleanWord(value);
  return word.length >= 4 && word.length <= 20 && /^[A-ZÇĞİÖŞÜ ]+$/.test(word);
}

export function pickWord(category: Category | 'Karışık', previous?: string, random = Math.random): WordEntry {
  const pool = WORDS.filter((entry) => (category === 'Karışık' || entry.category === category) && entry.word !== previous);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
