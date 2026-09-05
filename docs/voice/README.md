# Burrow Brawl — recording script 01

Thirty original lines, ready to generate. Filenames match the game's existing event slots. A few phrases have been tightened so they fit self-damage, splash hits and both movement tools. The draft is intentionally separate from current prototype audio: captions and recordings will switch together when the new pack arrives.

## Voice direction

Start with **Cheeky Scout** for the complete 30-line pack. Keep one consistent voice across the pack; change the performance for each line. The other two styles are optional alternatives, not an extra 60 clips you need to generate now.

**Cheeky Scout:** A tiny cartoon garden soldier, mischievous and scrappy, with natural conversational timing and a light, slightly high register. Confident until something goes wrong. A smile in the voice, expressive small breaths, crisp words and understated comic pauses. Short game reactions, not narration. Dry studio recording, no background sound. Avoid a robotic cadence or an exaggerated chipmunk effect.

**Grumpy Veteran:** A small, world-weary cartoon garden soldier with a warm, slightly raspy mid register. Unimpressed, dry and economical. The comedy comes from irritation and underplayed punchlines. Speak naturally, with clear words. Dry studio recording, no background sound.

**Nervous Rookie:** A small, enthusiastic cartoon garden soldier with a bright, youthful register. Quick bursts of confidence followed by awkward realization. Nervous amusement, clear consonants, lively but intelligible pacing. Dry studio recording, no background sound.

For a quick comparison, try the same four files in all three styles: `hit-1.wav`, `miss-3.wav`, `friendly-0.wav`, `heal-1.wav`. Pick the character you like, then generate the rest. This audition is optional.

## Export

- Speak only the quoted line. Do not read the filename, trigger or direction.
- One clip per filename below. Aim for roughly 1–3 seconds; up to 4 seconds is fine for a natural delivery.
- Prefer clean mono WAV at 44.1 or 48 kHz. MP3 is also fine; the clips can be converted during integration.
- Leave about 0.15 seconds before speech and 0.25 seconds after it. No music, reverb, overlapping characters or added effects.
- Keep pitch natural in the generated voice. Character-specific processing can be adjusted after listening in the game.
- Put the files in one ZIP. If you make alternate voice packs, put each pack in its own folder using the same filenames.

Use [CSV](recording-script.csv) for batch generation, [JSON](recording-script.json) for structured import, or [plain text](lines-only.txt) when only spoken words are needed. Every line is from the acting worm's perspective, including friendly/self-damage apologies.

## Lines

| File             | Situation                             | Delivery                                                | Spoken text                                 |
| ---------------- | ------------------------------------- | ------------------------------------------------------- | ------------------------------------------- |
| `turn-0.wav`     | Your turn begins                      | Quietly determined; tiny pause after Right.             | Right. Small steps.                         |
| `turn-1.wav`     | Your turn begins                      | Cheeky confidence; smile on improve.                    | My turn to improve the view.                |
| `turn-2.wav`     | Your turn begins                      | Puzzled accusation; stress who.                         | All right, who moved the horizon?           |
| `turn-3.wav`     | Your turn begins                      | Overconfident; second sentence is the punchline.        | Confidence first. Accuracy later.           |
| `hit-0.wav`      | Your attack damaged the enemy         | Cheerful mock courier; brisk finish.                    | Special delivery. No signature needed!      |
| `hit-1.wav`      | Your attack damaged the enemy         | Surprised delight; stress almost.                       | That was almost deliberate!                 |
| `hit-2.wav`      | Your attack damaged the enemy         | Smug observation; play it casually.                     | You've got a little crater on you.          |
| `hit-3.wav`      | Your attack damaged the enemy         | Dry politeness; pause before the apology.               | Successful delivery. Very indirect apology. |
| `hit-4.wav`      | Your attack damaged the enemy         | Genuine relief, then pride.                             | Oh good, the maths worked!                  |
| `hit-5.wav`      | Your attack damaged the enemy         | Grand declaration from someone very small.              | Consider yourself thoroughly gardened.      |
| `miss-0.wav`     | Your attack missed the enemy          | Indignant; blame the target.                            | Who put the target over there?              |
| `miss-1.wav`     | Your attack missed the enemy          | Defensive first sentence; sheepish second.              | That was a warning. To the scenery.         |
| `miss-2.wav`     | Your attack missed the enemy          | Completely sincere, absurd excuse.                      | I was aiming for next Thursday.             |
| `miss-3.wav`     | Your attack missed the enemy          | Quick excuse; firmer on Definitely.                     | Wind. Definitely the wind.                  |
| `miss-4.wav`     | Your attack missed the enemy          | Self-congratulation, then realization.                  | Excellent shot. Wrong postcode.             |
| `miss-5.wav`     | Your attack missed the enemy          | Conspiratorial first sentence; dry punchline.           | Nobody saw that. Especially the target.     |
| `miss-6.wav`     | Your attack missed the enemy          | Nervous scientist pretending that was the test.         | Testing gravity. Still works!               |
| `friendly-0.wav` | Your attack hurt you or your teammate | Startled, then embarrassed.                             | That was not the plan!                      |
| `friendly-1.wav` | Your attack hurt you or your teammate | Trying very hard to minimize the disaster.              | A small setback. For our side.              |
| `friendly-2.wav` | Your attack hurt you or your teammate | Dry regret; stress Unfriendly.                          | Friendly fire. Unfriendly review.           |
| `friendly-3.wav` | Your attack hurt you or your teammate | Awkward optimism; make team expense the joke.           | Let's call that a team expense.             |
| `skip-0.wav`     | Your unused turn ends                 | Bluffing confidence; repeat Very tactical more quietly. | A tactical pause. Very tactical.            |
| `skip-1.wav`     | Your unused turn ends                 | Patient, smug and a little theatrical.                  | I'll let the suspense do the damage.        |
| `skip-2.wav`     | Your unused turn ends                 | Innocent whistling energy; obviously stalling.          | Just checking the soil.                     |
| `utility-0.wav`  | You built a bridge or teleported      | Small, satisfied victory; stress big improvement.       | A small step. A big improvement.            |
| `utility-1.wav`  | You built a bridge or teleported      | Relieved and resourceful.                               | A little room to improvise!                 |
| `utility-2.wav`  | You built a bridge or teleported      | Satisfied, then a doubtful Probably.                    | Much better. Probably.                      |
| `heal-0.wav`     | You used a healing item               | Relieved; little smile on Good as new.                  | A little compost. Good as new.              |
| `heal-1.wav`     | You used a healing item               | Urgent Medic, then surprised self-correction.           | Medic! Oh wait, that's me.                  |
| `heal-2.wav`     | You used a healing item               | Brisk confidence; mutter Slightly damp.                 | Back in business. Slightly damp.            |
