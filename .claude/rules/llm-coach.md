# LLM coach rules

Conventions for the pluggable coach layer that generates move explanations and coaching feedback.

## Architecture

The coach is a pluggable interface. Two implementations ship:

1. **Claude coach** (default): calls the Anthropic API using `claude-opus-4-8`. Active when `ANTHROPIC_API_KEY` is set.
2. **Rules-based fallback**: deterministic text generation driven by `MoveClass` and `WeaknessTag` values. Active when the API key is absent or the Claude call fails.

Both implementations satisfy the same `Coach` interface. Call sites do not branch on which coach is active — the coach factory injects the correct implementation at startup.

## Claude coach

- **Model**: `claude-opus-4-8`. Never hardcode a different model ID without updating `COACH_MODEL` in `.env.example` and this file.
- **Model override**: the model ID is read from `process.env.COACH_MODEL`, defaulting to `claude-opus-4-8`. This lets operators pin to a specific model without a code change.
- **Temperature**: low (0.3 or less) for factual move explanations. Slightly higher (0.5–0.7) for motivational or summary messages.
- **Streaming**: always stream coach responses. Use the Anthropic SDK's streaming API and flush chunks to the client as they arrive. Buffer to sentence boundaries before displaying — never show a mid-sentence stream fragment in the UI.
- **Prompt structure**: system prompt establishes the coach persona and the user's weakness profile. User message contains FEN before/after, the played SAN, the best SAN, centipawn loss, move class, and applicable weakness tags. See `chess-domain.md` for canonical field names.
- **Max tokens**: cap at 400 tokens for single-move explanations; 800 for game summaries. Coach explanations should be concise — a paragraph, not an essay.

## Prompt hygiene

- **No PII in prompts.** The chess.com username is not sent to the Anthropic API. If a user display name is needed for personalization, use a generic "you" in the prompt.
- **No raw game PGN.** Send only the fields the coach needs (FEN, SAN, bestSan, cpLoss, moveClass, tags, phase). Full PGN is unnecessary and increases token cost.
- **System prompt is version-controlled** in `src/coach/prompts/`. Changes to the prompt are treated as code changes — they go through review. Do not generate prompts dynamically from user input.
- **Never log the full prompt or the full response** in production. Log the move ID, model, token counts, and latency only.

## Fallback coach

- The fallback must produce output for every valid `(MoveClass, WeaknessTag[])` combination.
- Output is deterministic given the same inputs. No randomness in the fallback path.
- Fallback explanations are clearly written but not expected to match the nuance of the LLM coach. They are a degradation path, not a feature.
- The fallback never calls any external API or network resource.

## Error handling

- If the Anthropic API returns a non-200 response, log the error server-side and activate the fallback. Do not propagate raw API errors to the client.
- If streaming is interrupted mid-response, discard the partial output and re-attempt once. On second failure, use the fallback.
- Coach errors are never fatal to the game review flow. The board and engine analysis still render; the coach panel shows the fallback explanation or a brief "Coach unavailable" message.

## Rate limiting and cost

- Debounce coach requests: do not call the API for every ply as the user scrubs through a game. Trigger a coach request only when the user pauses on a move for more than 500 ms, or explicitly requests an explanation.
- Cache coach responses per (gameId, ply) in the SQLite database. A repeated visit to the same move does not incur a second API call.
- Log token counts per request to the database for cost monitoring.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
