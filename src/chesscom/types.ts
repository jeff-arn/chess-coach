import { z } from 'zod';

export const USERNAME_RE = /^[A-Za-z0-9_-]{1,32}$/;

export const archiveGameSchema = z.object({
  url: z.string(),
  pgn: z.string(),
  time_control: z.string().optional(),
  end_time: z.number(),
  white: z.object({ username: z.string(), result: z.string() }),
  black: z.object({ username: z.string(), result: z.string() }),
});

export const archiveSchema = z.object({ games: z.array(archiveGameSchema) });

export const statsSchema = z.object({
  chess_rapid: z.object({ last: z.object({ rating: z.number() }) }).optional(),
});

export type ArchiveGame = z.infer<typeof archiveGameSchema>;
