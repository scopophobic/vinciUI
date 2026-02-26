export type DiffPart = {
  text: string;
  kind: 'same' | 'added' | 'removed';
};

export function wordDiff(oldStr: string, newStr: string): DiffPart[] {
  const aw = oldStr.split(/\s+/).filter(Boolean);
  const bw = newStr.split(/\s+/).filter(Boolean);
  const result: DiffPart[] = [];
  const aSet = new Set(aw);
  const bSet = new Set(bw);
  let ai = 0;
  let bi = 0;
  while (ai < aw.length || bi < bw.length) {
    if (ai < aw.length && bi < bw.length && aw[ai] === bw[bi]) {
      result.push({ text: aw[ai], kind: 'same' });
      ai++;
      bi++;
    } else if (bi < bw.length && !aSet.has(bw[bi])) {
      result.push({ text: bw[bi], kind: 'added' });
      bi++;
    } else if (ai < aw.length && !bSet.has(aw[ai])) {
      result.push({ text: aw[ai], kind: 'removed' });
      ai++;
    } else if (bi < bw.length) {
      result.push({ text: bw[bi], kind: 'added' });
      bi++;
    } else {
      result.push({ text: aw[ai], kind: 'removed' });
      ai++;
    }
  }
  return result;
}
