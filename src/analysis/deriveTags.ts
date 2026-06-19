import { detectHangingPiece } from '@/domain/taggers/hangingPiece';
import { detectWeakOpening } from '@/domain/taggers/weakOpening';
import type { WeaknessTag } from '@/domain/types';
import type { EngineLine } from '@/engine/types';

export type DeriveInput = {
  fenBefore: string;
  fenAfter: string;
  san: string;
  ply: number;
  cpLoss: number;
  line: EngineLine;
  wasCapture: boolean;
};

export function deriveTags(input: DeriveInput): WeaknessTag[] {
  const tags = new Set<WeaknessTag>();
  const { fenBefore, fenAfter, san, ply, cpLoss, line, wasCapture } = input;

  if (detectHangingPiece(fenAfter) && cpLoss >= 100) tags.add('hangsPieces');
  if (detectHangingPiece(fenBefore) && cpLoss >= 100) tags.add('missesTactics');
  if (line.mate !== null && line.mate > 0 && cpLoss >= 200) tags.add('missesMates');
  if (tags.has('hangsPieces') && !wasCapture && cpLoss >= 200) tags.add('ignoresThreats');
  if (detectWeakOpening(fenBefore, san, ply)) tags.add('weakOpening');

  return [...tags];
}
