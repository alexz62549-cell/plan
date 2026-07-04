export type ManualPlanRow = {
  child_id: number;
  date: string;
  subject: string;
  content: string;
};

export function normalizeManualPlanRows(rows: ManualPlanRow[]): ManualPlanRow[] {
  return rows
    .map((row, index) => {
      const normalized = {
        child_id: Number(row.child_id),
        date: row.date.trim(),
        subject: row.subject.trim(),
        content: row.content.trim()
      };
      if (!normalized.content) return null;
      if (!normalized.child_id || !normalized.date || !normalized.subject) {
        throw new Error(`请补全第 ${index + 1} 行的孩子、日期、学科和内容`);
      }
      return normalized;
    })
    .filter((row): row is ManualPlanRow => row !== null);
}
