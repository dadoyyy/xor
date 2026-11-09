import { formatScore } from "@xor/shared-utils";

export function formatScoreSummary(score: number, maxScore: number): string {
  return `${formatScore(score)}/${formatScore(maxScore)}`;
}

