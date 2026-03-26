export interface DiffToken {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

function tokenize(text: string): string[] {
  // Split on whitespace boundaries, keeping whitespace as tokens
  // e.g. "hello world" → ["hello", " ", "world"]
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

export function computeWordDiff(original: string, improved: string): DiffToken[] {
  const a = tokenize(original);
  const b = tokenize(improved);

  const m = a.length;
  const n = b.length;

  // Build LCS DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const prev = dp[i - 1]!;
      const curr = dp[i]!;
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]! + 1
          : Math.max(prev[j]!, curr[j - 1]!);
    }
  }

  // Backtrack to produce diff tokens
  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ text: a[i - 1]!, type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.unshift({ text: b[j - 1]!, type: 'added' });
      j--;
    } else {
      result.unshift({ text: a[i - 1]!, type: 'removed' });
      i--;
    }
  }

  return result;
}
