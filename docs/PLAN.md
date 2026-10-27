# Toddler Train Games: Plan

A small iOS app with 2–3 games that a parent and toddler play together on one
device, passing it back and forth or sharing the screen. It's built for train
journeys: offline, quiet when it needs to be, and quick to pick up and put down.

---

## 1. Who it's for

| Player | Needs |
| --- | --- |
| **Toddler (about 2–4 years)** | Big targets, instant feedback, no reading, no fail states, short games. Fine motor control is still developing (taps work; precise drags are harder). Attention span is 1–5 minutes per game. |
| **Parent** | Set up a game in seconds, one-handed if needed. Fun enough not to be boring. Confident nothing will pop up, charge money or go online. Can stop and resume at any station. |

## 2. Broad principles

### Play
1. **Together, not against each other.** The default is co-operative or
   "everyone wins" play. Turns exist to teach sharing and waiting, not to
   produce a loser. Any score is optional and celebrates both players.
2. **No fail states.** Nothing is "wrong". A mismatch in a memory game gets a
   friendly wobble and a giggle sound, never a buzzer.
3. **The parent can tune the difficulty.** Toddlers vary a lot between 2 and
   4. Each game has a few simple levels (e.g. 3 vs 6 vs 8 pairs) that the
   parent picks.
4. **Short rounds.** One round takes 1–3 minutes, with a natural end and a
   celebration, so the game can stop when the train pulls in.

### Interaction and design
5. **No reading needed.** Icons, colours, characters and sounds do the work.
   Words appear only in parent areas.
6. **Big, forgiving touch targets.** At least 80pt for toddler targets, with
   generous hit areas. Taps first; drags only where the snapping is very
   forgiving.
7. **Make turns obvious.** Each player has a colour and a character (e.g.
   🐻 Parent, 🐰 Toddler). The current player's side of the screen glows and
   their character waves. On a turn change, the device "hands over" with an
   animation.
8. **Landscape and shared.** The layout suits two people sitting side by side
   or facing each other across a train table. Simultaneous games use a split
   screen.
9. **Calm, not overstimulating.** Soft colours and gentle animations. No
   flashing, no loud surprises, no endless "one more" loops.

### Train-friendly
10. **Fully offline.** No network, accounts, ads, analytics, in-app purchases
    or external links. Works in airplane mode and through tunnels.
11. **Sound you can control.** Works fully muted, with visual feedback for
    every sound cue, and respects the silent switch. There's a quick volume
    toggle on the home screen for headphones vs. no sound.
12. **Battery-light.** No continuous heavy animation on idle screens, a modest
    frame rate where possible, and dark-mode friendly.
13. **Instant pause and resume.** The app saves state when it goes to the
    background. Locking the phone mid-game and reopening it at the next stop
    picks up where you left off.

### Safety and parental control
14. **Toddler-proof navigation.** Leaving a game, changing settings and going
    home need a parent gesture (e.g. press and hold for 2 seconds, or a
    two-finger tap). Stray taps can't escape a game.
15. **Plays well with Guided Access.** Works cleanly with iOS Guided Access,
    and the app explains how to turn it on in the parent area.
16. **Privacy by default.** No data leaves the device. No camera,
    microphone, location or contacts.

### Engineering
17. **Native and simple.** SwiftUI for the app shell and menus, with SpriteKit
    (or plain SwiftUI animation) inside games where needed. No third-party
    dependencies unless they're clearly worth it.
18. **One shared game framework.** Players, turns, celebrations, sounds,
    pause/resume and the parent gate are written once and reused by every
    game, so adding a game later is cheap.
19. **Universal app.** Supports iPhone and iPad, iOS 17+, landscape only.
20. **Testable game logic.** Game rules live in plain Swift types with unit
    tests, separate from rendering.

## 3. Candidate games

Three games give some variety: memory (turn-based), action (simultaneous) and
creative/physics (turn-based).

### A. Animal Pairs (memory match, turn-based)
Players take turns flipping two cards. A match makes the animal "come alive"
with a sound and animation, and the pair flies to the matching player's
basket. A mismatch makes the cards wobble and flip back. When all pairs are
found, both players' baskets get a celebration.
- Levels: 3 pairs (2x3), 6 pairs (3x4), 8 pairs (4x4).
- Themes: farm animals, vehicles (trains!), fruit.

### B. Bubble Pop (simultaneous, split screen)
The screen is split into two halves, one per player. Bubbles float up and each
player pops the bubbles on their side. Popped bubbles fill a **shared** jar
in the middle. When the jar is full, everyone celebrates together.
- Parent handicap: the parent's side gets fewer or faster bubbles, or the
  toddler's bubbles are bigger and slower.
- Optional "pop only the red ones" mode for older toddlers (colour
  recognition).

### C. Tower Stack (turn-based building)
Players take turns dropping a chunky block (animals or shapes) onto a wobbly
tower. When it falls, it falls in a funny way and everyone cheers, because
the crash is the fun part. A "height so far" marker celebrates new records.
- Tap to drop: the block swings gently above the tower so no drag is needed.
- Easy mode makes blocks sticky so towers rarely fall.

**Reserve ideas** if one of these doesn't work out: Colour Together (shared
drawing where players take turns choosing a colour and painting), Feed the
Animal (take turns giving the right food to a hungry character), and Noughts
& Crosses with animal tokens (for older toddlers).

## 4. User stories

Roles: **Parent**, **Toddler**, **Players** (both together).

### App shell and setup
- **US-01** As a parent, I want to open the app and start a game in two taps
  or fewer, so I can settle my toddler quickly.
- **US-02** As a toddler, I want to choose a game by tapping a big picture, so
  I can pick without reading.
- **US-03** As a parent, I want each of us to pick a character/colour (once,
  then remembered), so my toddler can tell whose turn it is.
- **US-04** As a parent, I want to choose an easy/medium/hard level before a
  game, so it suits my toddler's mood and ability.
- **US-05** As a parent, I want the app to work completely offline, so it
  works in tunnels and without signal.

### Turns and togetherness
- **US-06** As a toddler, I want to clearly see when it's my turn (my
  character waves and my side glows), so I know when to play.
- **US-07** As a toddler, I want taps during the other player's turn to be
  gently ignored, not to break the game, so I can't spoil the turn.
- **US-08** As players, we want a happy celebration at the end of every
  round that praises both of us, so nobody feels like they lost.
- **US-09** As a parent, I want to optionally hide or show scores, so I can
  decide whether we keep count.

### Animal Pairs
- **US-10** As a toddler, I want to tap a card to flip it and hear the animal
  sound, so it's fun even when it isn't a match.
- **US-11** As players, we want matched pairs to go to the player who found
  them, so we see what we each collected.
- **US-12** As a parent, I want to choose the number of cards and the theme,
  so the game grows with my toddler.

### Bubble Pop
- **US-13** As players, we want our own half of the screen to pop bubbles at
  the same time, so we don't have to wait for turns.
- **US-14** As players, we want our pops to fill one shared jar, so we work
  towards the same goal.
- **US-15** As a parent, I want to give myself a handicap, so my toddler
  contributes and stays engaged.

### Tower Stack
- **US-16** As a toddler, I want to drop a block with one tap, so I don't need
  precise dragging.
- **US-17** As players, we want a funny crash and a cheer when the tower
  falls, so falling is fun, not failing.
- **US-18** As a parent, I want an easy mode with stickier blocks, so younger
  toddlers can build tall towers.

### Train-friendly behaviour
- **US-19** As a parent, I want the game to pause and keep its state when I
  lock the phone or switch apps, so we can resume after getting off or on.
- **US-20** As a parent, I want to mute all sounds quickly (and have the app
  respect the silent switch), so we don't disturb other passengers.
- **US-21** As a parent, I want every sound to have a matching visual cue, so
  the games still work on mute.
- **US-22** As a parent, I want the app to use little battery, so my phone
  lasts the journey.

### Safety and parental control
- **US-23** As a parent, I want leaving a game or opening settings to need a
  press-and-hold, so my toddler can't wander off by accident.
- **US-24** As a parent, I want guidance on turning on Guided Access, so my
  toddler can't leave the app.
- **US-25** As a parent, I want no ads, purchases, links or data collection,
  so I can hand over the phone without worrying.

## 5. Suggested build order

1. **Foundation:** Xcode project, app shell, home screen, player setup,
   parent gate, sound manager, pause/resume, shared turn and celebration
   components. (US-01–09, 19–25)
2. **Game 1: Animal Pairs.** It's the simplest turn-based game and proves
   the framework. (US-10–12)
3. **Real-world test:** play it on an actual train journey and adjust
   target sizes, timing and sounds.
4. **Game 2: Bubble Pop** (US-13–15)
5. **Game 3: Tower Stack** (US-16–18). Physics needs the most tuning, so it
   comes last.
6. **Polish:** art, sounds, app icon, accessibility pass, and TestFlight to
   your own device.

## 6. Open questions

1. **Toddler's age?** This sets the default difficulty and whether
   Noughts & Crosses is worth including.
2. **iPhone, iPad or both?** iPad makes split-screen games much
   nicer; iPhone is what's usually in your pocket on a train.
3. **Do you have a Mac with Xcode, and an Apple Developer account?**
   You need Xcode to build and run on a device. A free account can sideload
   to your own phone (re-signing every 7 days); a paid account allows
   TestFlight and stable installs.
4. **Are these three games right?** Any favourite characters or themes
   (trains, dinosaurs, a particular TV show's *style*) to build around?
5. **Art and sound:** are simple shapes and emoji-style art fine to start,
   with nicer assets later?
