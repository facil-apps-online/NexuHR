import icd10Data from '@/data/icd10-codes.json';

export interface Icd10Code {
  code: string;
  es: string;
  en: string;
  chapter: number;
}

export interface Icd10Diagnosis {
  code: string;
  es: string;
  en: string;
}

const codes: Icd10Code[] = icd10Data as Icd10Code[];

const chapterNames: Record<number, { es: string; en: string }> = {
  1: { es: 'Enfermedades infecciosas y parasitarias', en: 'Infectious and parasitic diseases' },
  2: { es: 'Neoplasias', en: 'Neoplasms' },
  3: { es: 'Enfermedades de la sangre', en: 'Diseases of the blood' },
  4: { es: 'Enfermedades endocrinas y metabólicas', en: 'Endocrine, nutritional and metabolic diseases' },
  5: { es: 'Trastornos mentales y de comportamiento', en: 'Mental and behavioural disorders' },
  6: { es: 'Enfermedades del sistema nervioso', en: 'Diseases of the nervous system' },
  7: { es: 'Enfermedades del ojo y sus anexos', en: 'Diseases of the eye and adnexa' },
  8: { es: 'Enfermedades del oído', en: 'Diseases of the ear and mastoid' },
  9: { es: 'Enfermedades del aparato circulatorio', en: 'Diseases of the circulatory system' },
  10: { es: 'Enfermedades del aparato respiratorio', en: 'Diseases of the respiratory system' },
  11: { es: 'Enfermedades del aparato digestivo', en: 'Diseases of the digestive system' },
  12: { es: 'Enfermedades de la piel', en: 'Diseases of the skin' },
  13: { es: 'Enfermedades del sistema musculoesquelético', en: 'Diseases of the musculoskeletal system' },
  14: { es: 'Enfermedades del aparato genitourinario', en: 'Diseases of the genitourinary system' },
  15: { es: 'Embarazo, parto y puerperio', en: 'Pregnancy, childbirth and the puerperium' },
  16: { es: 'afecciones perinatales', en: 'Conditions originating in the perinatal period' },
  17: { es: 'Malformaciones congénitas', en: 'Congenital malformations' },
  18: { es: 'Síntomas y signos anormales', en: 'Symptoms, signs and abnormal findings' },
  19: { es: 'Lesiones traumatismos y envenenamientos', en: 'Injury, poisoning and external causes' },
  20: { es: 'Causas externas de morbilidad', en: 'External causes of morbidity' },
  21: { es: 'Factores que influyen en el estado de salud', en: 'Factors influencing health status' },
  22: { es: 'Códigos para propósitos especiales', en: 'Codes for special purposes' },
};

let searchIndex: Map<string, Icd10Code[]> | null = null;

function buildSearchIndex(): Map<string, Icd10Code[]> {
  if (searchIndex) return searchIndex;
  searchIndex = new Map();

  for (const item of codes) {
    const terms = [
      item.code.toLowerCase(),
      item.es.toLowerCase(),
      item.en.toLowerCase(),
      ...item.es.toLowerCase().split(/\s+/),
      ...item.en.toLowerCase().split(/\s+/),
    ];

    for (const term of terms) {
      if (term.length < 2) continue;
      const key = term.slice(0, 4);
      if (!searchIndex.has(key)) searchIndex.set(key, []);
      searchIndex.get(key)!.push(item);
    }
  }

  return searchIndex;
}

export function searchIcd10(query: string, limit = 50): Icd10Code[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const index = buildSearchIndex();
  const seen = new Set<string>();
  const results: Icd10Code[] = [];

  // Exact code match first
  for (const item of codes) {
    if (item.code.toLowerCase() === q) {
      results.push(item);
      seen.add(item.code);
    }
  }

  // Prefix match on code
  for (const item of codes) {
    if (seen.has(item.code)) continue;
    if (item.code.toLowerCase().startsWith(q)) {
      results.push(item);
      seen.add(item.code);
    }
  }

  // Fuzzy match on descriptions
  const qWords = q.split(/\s+/).filter(w => w.length >= 2);
  for (const item of codes) {
    if (seen.has(item.code) || results.length >= limit) break;
    const esLower = item.es.toLowerCase();
    const enLower = item.en.toLowerCase();
    const match = qWords.every(w => esLower.includes(w) || enLower.includes(w));
    if (match) {
      results.push(item);
      seen.add(item.code);
    }
  }

  return results.slice(0, limit);
}

export function getIcd10ByCode(code: string): Icd10Code | undefined {
  return codes.find(c => c.code === code);
}

export function getChapterName(chapter: number, lang: 'es' | 'en' = 'es'): string {
  return chapterNames[chapter]?.[lang] || `Capítulo ${chapter}`;
}

export function getCodesByChapter(chapter: number): Icd10Code[] {
  return codes.filter(c => c.chapter === chapter);
}

export function getChapters(): Array<{ chapter: number; name: string; count: number }> {
  const map = new Map<number, number>();
  for (const c of codes) {
    map.set(c.chapter, (map.get(c.chapter) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([ch, count]) => ({ chapter: ch, name: getChapterName(ch), count }))
    .sort((a, b) => a.chapter - b.chapter);
}

export function codesToDiagnostics(codes: Icd10Code[]): Icd10Diagnosis[] {
  return codes.map(c => ({ code: c.code, es: c.es, en: c.en }));
}

export function isValidIcd10Code(code: string): boolean {
  return codes.some(c => c.code === code);
}

export const ICD10_MAX_DIAGNOSES = 3;
