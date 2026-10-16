// Midterm structure as announced in class.
export const EXAM = {
  durationMin: 120,
  mcPerChapter: 10,
  mcPoints: 0.75, // 80 × 0.75 = 60 points (Part A)
  partBChapters: [1, 2, 5, 8], // short questions only come from these chapters
  partBCount: 3,
  partBPoints: 8, // 3 × 8 = 24 points
  partCPoints: 16, // 1 reflection question
};

export const MC_POINTS_LABEL = (score: number, total: number) =>
  `${formatPoints(score * EXAM.mcPoints)} / ${formatPoints(total * EXAM.mcPoints)} points`;

export function formatPoints(p: number): string {
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace(/0$/, "");
}

export function isPartBChapter(chapter: number | null): boolean {
  return chapter !== null && EXAM.partBChapters.includes(chapter);
}
