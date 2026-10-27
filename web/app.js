/* Train Games: web MVP. Three two-player games for a grown-up and a 4-year-old.
   Plain script, no dependencies, so it runs from any static host or as one file. */
(() => {
  'use strict';

  /* ---------- Helpers ---------- */
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return e;
  };
  const svg = (tag, attrs = {}) => {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = n => Math.floor(Math.random() * n);
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('tg.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('tg.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
    del(k) { try { localStorage.removeItem('tg.' + k); } catch { /* storage unavailable */ } },
  };

  /* ---------- Players & settings ---------- */
  const CHARACTERS = [
    ['🐻', 'Bear'], ['🐰', 'Bunny'], ['🦊', 'Fox'], ['🐸', 'Frog'], ['🐼', 'Panda'], ['🦁', 'Lion'],
    ['🐯', 'Tiger'], ['🐨', 'Koala'], ['🐷', 'Piggy'], ['🐵', 'Monkey'], ['🦄', 'Unicorn'], ['🐲', 'Dragon'],
  ];
  const settings = Object.assign({ sound: true, voice: true, players: [0, 1] }, store.get('settings', {}));
  const saveSettings = () => store.set('settings', settings);
  const players = () => settings.players.map((c, seat) => ({ seat, emoji: CHARACTERS[c][0], name: CHARACTERS[c][1] }));

  /* ---------- Sound: synthesised, so there are no files to load ---------- */
  const Sound = {
    ctx: null,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* older Safari */ }
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(freq, dur, { type = 'sine', vol = 0.18, delay = 0, slide = null } = {}) {
      if (!settings.sound || !this.ctx) return;
      const t = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    },
    notes(freqs, step, opts) { freqs.forEach((f, i) => this.tone(f, step * 1.6, { ...opts, delay: i * step })); },
    play(name, n = 0) {
      switch (name) {
        case 'tap': return this.tone(660, 0.08, { type: 'triangle' });
        case 'flip': return this.tone(500, 0.12, { type: 'triangle', slide: 780 });
        case 'match': return this.notes([523, 659, 784, 1047], 0.09, { type: 'triangle' });
        case 'wobble': return this.tone(330, 0.3, { slide: 220, vol: 0.14 });
        case 'turn': return this.notes([587, 784], 0.12, { type: 'triangle', vol: 0.12 });
        case 'pop': return this.tone(700 + rand(500), 0.08, { slide: 1600, vol: 0.2 });
        case 'hop': return this.tone(392 * Math.pow(2, n / 12), 0.12, { type: 'triangle' });
        case 'climb': return this.notes([392, 440, 494, 523, 587, 659, 784], 0.1, { type: 'triangle', vol: 0.14 });
        case 'slide': return this.tone(1000, 1.1, { slide: 180, vol: 0.14 });
        case 'roll': for (let i = 0; i < 7; i++) this.tone(180 + rand(200), 0.04, { type: 'square', vol: 0.05, delay: i * 0.09 }); return;
        case 'home': return this.notes([784, 988, 1175, 1568], 0.1, { type: 'triangle' });
        case 'cheer':
          this.notes([523, 659, 784, 1047, 784, 1047, 1319], 0.12, { type: 'triangle', vol: 0.16 });
          return this.notes([262, 330, 392, 523], 0.21, { vol: 0.08 });
      }
    },
  };
  const say = text => {
    if (!settings.sound || !settings.voice || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95; u.pitch = 1.15; u.lang = 'en-GB';
      speechSynthesis.speak(u);
    } catch { /* speech unavailable */ }
  };
  document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });
  document.addEventListener('gesturestart', e => e.preventDefault());

  // Keep the screen on while a game is open.
  let wakeLock = null;
  const keepAwake = async () => { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* not allowed */ } };
  const letSleep = () => { try { wakeLock?.release(); } catch { /* already released */ } wakeLock = null; };

  /* ---------- Screens ---------- */
  const app = document.getElementById('app');
  let current = null;
  const mount = (node, ctrl = null) => {
    current?.destroy?.();
    current = ctrl;
    app.replaceChildren(node);
  };

  // Press-and-hold button: a stray toddler tap shows a hint instead of leaving.
  function holdButton(icon, label, onDone) {
    const ring = svg('svg', { viewBox: '0 0 56 56', 'aria-hidden': 'true' });
    ring.append(svg('circle', { cx: 28, cy: 28, r: 25 }));
    const btn = h('button', { class: 'icon-btn hold', 'aria-label': `${label} (press and hold)` },
      ring, h('span', { 'aria-hidden': 'true' }, icon), h('span', { class: 'hold-tip' }, `Hold to ${label.toLowerCase()}`));
    let timer = null;
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.classList.add('holding');
      timer = setTimeout(() => { timer = null; btn.classList.remove('holding'); onDone(); }, 1200);
    });
    const cancel = () => {
      if (!timer) return;
      clearTimeout(timer); timer = null;
      btn.classList.remove('holding');
      btn.classList.add('hint');
      setTimeout(() => btn.classList.remove('hint'), 1600);
    };
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') onDone(); });
    return btn;
  }

  function turnBar(ps, onHome) {
    const chips = ps.map(p => h('div', { class: `chip ${p.cls || 'seat' + p.seat}${p.cpu ? ' cpu' : ''}` },
      h('span', { class: 'chip-face', 'aria-label': p.cpu ? `${p.name} (computer)` : p.name }, p.emoji), h('span', { class: 'chip-bag' })));
    const el = h('div', { class: 'topbar' },
      holdButton('🏠', 'Go home', onHome), h('div', { class: 'chips' }, chips), h('div', { class: 'topbar-spacer' }));
    return {
      el, chips,
      setTurn(t) { chips.forEach((c, i) => c.classList.toggle('active', t === 'both' || t === i)); },
      bag: i => chips[i].querySelector('.chip-bag'),
    };
  }

  function overlay(...content) {
    const o = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'overlay-card' }, ...content));
    app.append(o);
    return o;
  }

  function celebrate({ ps, title, detail, onAgain, onHome, onKeepGoing }) {
    Sound.play('cheer');
    say(`Hooray! ${title}`);
    const confetti = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    const bits = ['🎉', '⭐', '🎈', '✨', '🌟', ps[0].emoji, ps[1].emoji];
    for (let i = 0; i < 28; i++) {
      confetti.append(h('span', { style: `left:${rand(100)}%;animation-duration:${2 + Math.random() * 2.5}s;animation-delay:${Math.random() * 1.2}s` }, bits[rand(bits.length)]));
    }
    const o = overlay(
      h('div', { class: 'cheer-faces', 'aria-hidden': 'true' }, ps.slice(0, 4).map(p => h('span', {}, p.emoji))),
      h('h2', {}, title),
      detail,
      h('div', { class: 'overlay-actions' },
        h('button', { class: 'play-btn', onclick: onAgain }, '🔁', h('span', {}, 'Again')),
        onKeepGoing && h('button', { class: 'play-btn secondary', onclick: () => { o.remove(); onKeepGoing(); } }, '▶️', h('span', {}, 'Keep going')),
        h('button', { class: 'play-btn secondary', onclick: onHome }, '🏠', h('span', {}, 'Home'))),
    );
    o.prepend(confetti);
  }

  /* ---------- Home ---------- */
  function showHome() {
    letSleep();
    const ps = players();
    const seatBtn = p => h('button', {
      class: `seat-btn seat${p.seat}`, 'aria-label': `Player ${p.seat + 1}: ${p.name}. Tap to change.`,
      onclick: () => {
        const other = settings.players[1 - p.seat];
        let next = settings.players[p.seat];
        do { next = (next + 1) % CHARACTERS.length; } while (next === other);
        settings.players[p.seat] = next;
        saveSettings();
        Sound.play('tap');
        say(CHARACTERS[next][1]);
        showHome();
      },
    }, p.emoji);
    const toggle = (key, on, off, label) => h('button', {
      class: 'icon-btn', 'aria-pressed': String(settings[key]), 'aria-label': label,
      onclick: () => { settings[key] = !settings[key]; saveSettings(); Sound.play('tap'); showHome(); },
    }, settings[key] ? on : off);

    const screen = h('div', { class: 'screen home' },
      h('div', { class: 'home-head' },
        h('h1', { class: 'wordmark' }, 'Train ', h('span', {}, 'Games')),
        h('div', { class: 'home-tools' },
          toggle('sound', '🔊', '🔇', 'Sound'),
          toggle('voice', '🗣️', '🤐', 'Spoken words'),
          h('button', { class: 'icon-btn', 'aria-label': 'Tips for grown-ups', onclick: showHelp }, 'ℹ️'))),
      h('div', { class: 'train', style: `--cars:${GAMES.length}` },
        h('div', { class: 'engine', 'aria-hidden': 'true' }, '🚂'),
        GAMES.map(g => h('button', { class: `carriage c-${g.id}`, onclick: () => { Sound.play('tap'); say(g.name); showSetup(g); } },
          h('span', { class: 'carriage-window', 'aria-hidden': 'true' }, g.icon),
          h('span', { class: 'carriage-name' }, g.name),
          h('span', { class: 'wheels', 'aria-hidden': 'true' }, h('i'), h('i'))))),
      h('div', { class: 'home-foot' },
        h('div', { class: 'players' },
          h('span', { class: 'players-label' }, 'Players'), seatBtn(ps[0]), h('span', { class: 'amp' }, '&'), seatBtn(ps[1])),
        h('p', { class: 'tip' }, matchMedia('(orientation: portrait)').matches
          ? 'Turn the phone sideways for the best fit.'
          : 'Tap a player to change their animal.')));
    mount(screen);
  }

  function showHelp() {
    const o = overlay(
      h('h2', {}, 'Tips for grown-ups'),
      h('ul', { class: 'help-list' },
        h('li', {}, 'To leave a game, press and hold 🏠 for about a second. A quick tap does nothing.'),
        h('li', {}, 'To stop little fingers leaving Safari: Settings → Accessibility → Guided Access → On. Then triple-click the side button while playing.'),
        h('li', {}, 'Games save as you go. Lock the phone at a station and carry on later.'),
        h('li', {}, 'Open the page while you still have signal. Once it has loaded it keeps working through tunnels.')),
      h('div', { class: 'overlay-actions' }, h('button', { class: 'play-btn', onclick: () => o.remove() }, 'OK')));
  }

  /* ---------- Setup ---------- */
  function showSetup(game) {
    const saved = store.get('save.' + game.id, null);
    const choice = Object.assign({ level: game.defaultLevel }, game.defaultOpts, store.get('choice.' + game.id, {}));
    const groups = [{ id: 'level', label: game.levelLabel, choices: game.levels }, ...game.options];

    const groupEls = groups.map(g => {
      const btns = g.choices.map(c => h('button', {
        class: 'choice', 'aria-pressed': String(choice[g.id] === c.id),
        onclick: () => {
          choice[g.id] = c.id;
          btns.forEach((b, i) => b.setAttribute('aria-pressed', String(g.choices[i].id === c.id)));
          Sound.play('tap');
        },
      }, h('span', { class: 'choice-icon', 'aria-hidden': 'true' }, c.icon), h('span', {}, c.label, c.sub && h('small', {}, c.sub))));
      return h('div', {}, h('div', { class: 'group-label' }, g.label), h('div', { class: 'choices' }, btns));
    });

    const start = (state, chosen) => {
      store.set('choice.' + game.id, chosen);
      playGame(game, chosen, state);
    };
    const screen = h('div', { class: 'screen setup' },
      h('div', { class: 'setup-head' },
        h('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: showHome }, '⬅️'),
        h('h1', {}, game.icon, ' ', game.name)),
      h('div', { class: 'setup-body' },
        h('div', { class: 'setup-groups' }, groupEls),
        h('div', { class: 'setup-actions' },
          saved && h('button', { class: 'play-btn', onclick: () => start(saved.state, saved.choice) }, '▶️', h('span', {}, 'Carry on')),
          h('button', {
            class: saved ? 'play-btn secondary' : 'play-btn',
            onclick: () => { store.del('save.' + game.id); start(null, { ...choice }); },
          }, saved ? '✨' : '▶️', h('span', {}, saved ? 'New game' : 'Play')))));
    mount(screen);
  }

  /* ---------- Game frame ---------- */
  function playGame(game, choice, saved) {
    const ps = game.players ? game.players(choice) : players();
    const level = game.levels.find(l => l.id === choice.level) || game.levels.find(l => l.id === game.defaultLevel);
    const screen = h('div', { class: `screen game game-${game.id}` });
    const body = h('div', { class: 'game-body' });
    const bar = turnBar(ps, showHome);
    screen.append(bar.el, body);
    let ctrl = null;
    mount(screen, { destroy: () => { ctrl?.destroy?.(); letSleep(); } });
    ctrl = game.create(body, {
      players: ps, level, opts: choice, saved, bar,
      save: state => store.set('save.' + game.id, { choice, state }),
      // onKeepGoing, if given, lets play continue after the celebration.
      finish: (title, detail, onKeepGoing) => {
        store.del('save.' + game.id);
        celebrate({ ps, title, detail, onKeepGoing, onAgain: () => playGame(game, choice, null), onHome: showHome });
      },
    });
    keepAwake();
  }

  // Fit n equal cards (3:4) into a box, using only layouts with no gaps.
  function fitGrid(n, w, hgt, gap) {
    let best = { cols: n, rows: 1, cw: 0 };
    for (let cols = 1; cols <= n; cols++) {
      if (n % cols) continue;
      const rows = n / cols;
      const cw = Math.min((w - gap * (cols - 1)) / cols, ((hgt - gap * (rows - 1)) / rows) * 0.75);
      if (cw > best.cw) best = { cols, rows, cw };
    }
    return best;
  }

  /* ---------- Game 1: Animal Pairs ---------- */
  const THEMES = {
    farm: [['🐮', 'Cow'], ['🐷', 'Pig'], ['🐑', 'Sheep'], ['🐔', 'Chicken'], ['🐴', 'Horse'], ['🐶', 'Dog'], ['🐱', 'Cat'], ['🦆', 'Duck']],
    vehicles: [['🚂', 'Train'], ['🚌', 'Bus'], ['🚗', 'Car'], ['🚒', 'Fire engine'], ['🚜', 'Tractor'], ['✈️', 'Aeroplane'], ['🚀', 'Rocket'], ['⛵', 'Boat']],
    fruit: [['🍎', 'Apple'], ['🍌', 'Banana'], ['🍓', 'Strawberry'], ['🍇', 'Grapes'], ['🍊', 'Orange'], ['🍐', 'Pear'], ['🍉', 'Watermelon'], ['🍒', 'Cherries']],
  };

  const PAIRS = {
    id: 'pairs', name: 'Animal Pairs', icon: '🐮',
    levelLabel: 'How many cards',
    levels: [
      { id: '3', label: '3 pairs', sub: 'quick', icon: '🃏', pairs: 3 },
      { id: '6', label: '6 pairs', sub: 'normal', icon: '🃏', pairs: 6 },
      { id: '8', label: '8 pairs', sub: 'tricky', icon: '🃏', pairs: 8 },
    ],
    defaultLevel: '6',
    options: [{ id: 'theme', label: 'Pictures', choices: [
      { id: 'farm', label: 'Animals', icon: '🐮' }, { id: 'vehicles', label: 'Vehicles', icon: '🚂' }, { id: 'fruit', label: 'Fruit', icon: '🍎' },
    ] }],
    defaultOpts: { theme: 'farm' },

    create(root, ctx) {
      const items = THEMES[ctx.opts.theme] || THEMES.farm;
      const n = ctx.level.pairs;
      let st = ctx.saved;
      if (!st || st.deck?.length !== n * 2) {
        const keys = shuffle([...items.keys()]).slice(0, n);
        const deck = shuffle(keys.flatMap(k => [k, k]));
        st = { deck, owner: deck.map(() => -1), turn: 0 };
      }
      let alive = true;
      let busy = false;
      let open = [];

      const grid = h('div', { class: 'pairs-grid' });
      const cards = st.deck.map((k, i) => {
        const card = h('button', { class: 'card', 'aria-label': `Card ${i + 1}`, onclick: () => tap(i) },
          h('div', { class: 'card-inner' },
            h('div', { class: 'face back' }),
            h('div', { class: 'face front', 'aria-hidden': 'true' }, items[k][0])));
        if (st.owner[i] >= 0) card.classList.add('up', 'gone');
        return card;
      });
      grid.append(...cards);
      root.append(grid);

      // Refill each player's bag from saved progress.
      st.deck.forEach((k, i) => {
        if (st.owner[i] >= 0 && st.deck.indexOf(k) === i) ctx.bar.bag(st.owner[i]).append(items[k][0]);
      });
      ctx.bar.setTurn(st.turn);
      say(`${ctx.players[st.turn].name} first!`);

      const layout = () => {
        const gap = Math.max(6, Math.min(12, root.clientWidth / 80));
        const g = fitGrid(cards.length, root.clientWidth, root.clientHeight, gap);
        grid.style.setProperty('--cols', g.cols);
        grid.style.setProperty('--cw', `${Math.floor(g.cw)}px`);
        grid.style.setProperty('--ch', `${Math.floor(g.cw / 0.75)}px`);
        grid.style.setProperty('--gap', `${gap}px`);
      };
      const ro = new ResizeObserver(layout);
      ro.observe(root);
      layout();

      const flyTo = (from, to, emoji) => {
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const f = h('div', { class: 'flyer' }, emoji);
        f.style.transform = `translate(${a.left + a.width / 2 - 24}px, ${a.top + a.height / 2 - 24}px)`;
        document.body.append(f);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          f.style.transform = `translate(${b.right - 30}px, ${b.top + b.height / 2 - 24}px) scale(.4)`;
        }));
        setTimeout(() => { f.remove(); to.append(emoji); }, 620);
      };

      async function tap(i) {
        if (busy || open.includes(i) || st.owner[i] >= 0) return;
        const [emoji, word] = items[st.deck[i]];
        cards[i].classList.add('up');
        open.push(i);
        Sound.play('flip');
        say(word);
        if (open.length < 2) return;

        busy = true;
        const [a, b] = open;
        await sleep(800);
        if (!alive) return;
        if (st.deck[a] === st.deck[b]) {
          Sound.play('match');
          say(`${word}! A match!`);
          st.owner[a] = st.owner[b] = st.turn;
          flyTo(cards[a], ctx.bar.bag(st.turn), emoji);
          cards[a].classList.add('gone');
          cards[b].classList.add('gone');
          open = [];
          ctx.save(st);
          if (st.owner.every(o => o >= 0)) {
            await sleep(900);
            if (!alive) return;
            const haul = h('div', { class: 'haul' }, ctx.players.map(p => h('div', {},
              h('span', {}, p.emoji), h('span', {}, ctx.bar.bag(p.seat).textContent || '–'))));
            ctx.finish('We found them all!', haul);
            return;
          }
          // A match means another go, as in the classic game.
        } else {
          Sound.play('wobble');
          cards[a].classList.add('wobble');
          cards[b].classList.add('wobble');
          await sleep(650);
          if (!alive) return;
          cards[a].classList.remove('up', 'wobble');
          cards[b].classList.remove('up', 'wobble');
          open = [];
          st.turn = 1 - st.turn;
          ctx.bar.setTurn(st.turn);
          Sound.play('turn');
          say(`${ctx.players[st.turn].name}'s turn`);
          ctx.save(st);
          await sleep(350);
        }
        busy = false;
      }

      return { destroy() { alive = false; ro.disconnect(); } };
    },
  };

  /* ---------- Game 2: Bubble Pop ---------- */
  const BUBBLES = {
    id: 'bubbles', name: 'Bubble Pop', icon: '🫧',
    levelLabel: 'Jar size',
    levels: [
      { id: 's', label: 'Small', sub: '12 bubbles', icon: '🫙', jar: 12 },
      { id: 'm', label: 'Medium', sub: '20 bubbles', icon: '🫙', jar: 20 },
      { id: 'l', label: 'Big', sub: '30 bubbles', icon: '🫙', jar: 30 },
    ],
    defaultLevel: 'm',
    options: [{ id: 'helper', label: 'Grown-up handicap', choices: [
      { id: 'on', label: 'On', sub: 'smaller, faster bubbles', icon: '🐢' }, { id: 'off', label: 'Off', sub: 'same for both', icon: '⚖️' },
    ] }],
    defaultOpts: { helper: 'on' },

    create(root, ctx) {
      const target = ctx.level.jar;
      const helper = ctx.opts.helper !== 'off';
      const tints = ['var(--b1)', 'var(--b2)', 'var(--b3)', 'var(--b4)'];
      const friends = ['🐟', '⭐', '🦋', '🐞', '🍓', '🐥'];
      let alive = true;
      let filled = 0;
      const popped = [0, 0];

      const halves = ctx.players.map(p => h('div', { class: `half seat${p.seat}` }, h('span', { class: 'half-mark', 'aria-hidden': 'true' }, p.emoji)));
      const glass = h('div', { class: 'jar-glass', style: `--target:${target}`, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': target, 'aria-valuenow': 0, 'aria-label': 'Bubble jar' });
      const jar = h('div', { class: 'jar' }, h('div', { class: 'jar-lid' }), glass);
      root.append(h('div', { class: 'bubbles' }, halves[0], jar, halves[1]));
      ctx.bar.setTurn('both');
      say('Pop the bubbles together!');

      const sides = halves.map((el, seat) => ({ el, seat, list: [], nextSpawn: 0 }));
      const isGrownUp = seat => seat === 0 && helper;

      function spawn(side) {
        const w = side.el.clientWidth;
        const hh = side.el.clientHeight;
        let d = Math.max(64, Math.min(130, Math.min(w, hh) * 0.34));
        let secs = 6.5;
        if (isGrownUp(side.seat)) { d *= 0.68; secs = 3.6; }
        const el = h('div', { class: 'bubble', style: `--d:${d}px` },
          h('div', { class: 'bubble-skin', style: `--tint:${tints[rand(tints.length)]}` }, Math.random() < 0.35 ? friends[rand(friends.length)] : ''));
        const b = { el, d, x: Math.random() * Math.max(0, w - d), y: hh, vy: (hh + d) / secs, phase: Math.random() * 6, done: false };
        el.addEventListener('pointerdown', e => { e.preventDefault(); pop(side, b); });
        side.el.append(el);
        side.list.push(b);
      }

      function pop(side, b) {
        if (b.done || filled >= target) return;
        b.done = true;
        b.el.classList.add('popped');
        setTimeout(() => b.el.remove(), 260);
        Sound.play('pop');
        filled++;
        popped[side.seat]++;
        glass.append(h('i', { class: `s${side.seat}` }));
        glass.setAttribute('aria-valuenow', filled);
        if (filled >= target) {
          setTimeout(() => {
            if (!alive) return;
            const detail = h('p', {}, ctx.players.map(p => `${p.emoji} ${popped[p.seat]}`).join('   '));
            ctx.finish('We filled the jar!', detail);
          }, 700);
        }
      }

      let last = performance.now();
      function frame(now) {
        if (!alive) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        for (const side of sides) {
          if (filled < target && now > side.nextSpawn && side.list.filter(b => !b.done).length < 5) {
            spawn(side);
            side.nextSpawn = now + (isGrownUp(side.seat) ? 600 : 800) + rand(400);
          }
          side.list = side.list.filter(b => {
            if (b.done) return false;
            b.y -= b.vy * dt;
            b.phase += dt * 1.8;
            if (b.y < -b.d) { b.el.remove(); return false; }
            b.el.style.transform = `translate(${b.x + Math.sin(b.phase) * 10}px, ${b.y}px)`;
            return true;
          });
        }
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);

      return { destroy() { alive = false; } };
    },
  };

  /* ---------- Game 3: Snakes & Ladders ---------- */
  const SNAKES = {
    id: 'snakes', name: 'Snakes & Ladders', icon: '🐍',
    levelLabel: 'Board',
    levels: [
      { id: '20', label: 'Little', sub: '20 squares · dice 1–3', icon: '🟩', cols: 5, rows: 4, die: 3,
        ladders: { 3: 8, 6: 15, 11: 17 }, snakes: { 9: 2, 14: 7, 19: 12 } },
      { id: '50', label: 'Medium', sub: '50 squares', icon: '🟨', cols: 10, rows: 5, die: 6,
        ladders: { 3: 22, 8: 26, 19: 38, 28: 47 }, snakes: { 17: 6, 33: 12, 44: 25, 48: 30 } },
      { id: '100', label: 'Classic', sub: '100 squares', icon: '🟥', cols: 10, rows: 10, die: 6,
        ladders: { 2: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 },
        snakes: { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 } },
    ],
    defaultLevel: '50',
    options: [{ id: 'hop', label: 'Moving', choices: [
      { id: 'tap', label: 'Tap to hop', sub: 'count each square', icon: '👆' }, { id: 'auto', label: 'Hop by itself', sub: 'quicker', icon: '🐇' },
    ] }],
    defaultOpts: { hop: 'tap' },

    create(root, ctx) {
      const L = ctx.level;
      const { cols, rows } = L;
      const N = cols * rows;
      const ps = ctx.players;
      let st = ctx.saved || { pos: [1, 1], turn: 0, done: [false, false] };
      let alive = true;
      let s = 48;
      let phase = 'roll';
      let left = 0;
      let hopCount = 0;

      // Square n (1-based) to its centre in board units, zig-zagging up from bottom-left.
      const centre = n => {
        const i = n - 1;
        const row = Math.floor(i / cols);
        const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
        return { x: col + 0.5, y: rows - 1 - row + 0.5 };
      };

      const board = h('div', { class: 'board', style: `--cols:${cols}` });
      for (let top = 0; top < rows; top++) {
        const row = rows - 1 - top;
        for (let c = 0; c < cols; c++) {
          const n = row * cols + (row % 2 === 0 ? c : cols - 1 - c) + 1;
          const cls = ['sq', `k${(c + top) % 2 + (row % 2) * 2}`, n === N && 'finish', n === 1 && 'start'].filter(Boolean).join(' ');
          board.append(h('div', { class: cls }, n === N || n === 1 ? '' : String(n)));
        }
      }

      // Snakes and ladders, drawn in board units so they scale with the squares.
      const art = svg('svg', { viewBox: `0 0 ${cols} ${rows}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      const paths = {};
      const ladderPts = (a, b) => [a, b];
      const snakePts = (a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const nx = -dy / len, ny = dx / len;
        const waves = Math.max(1, Math.round(len / 1.5));
        const pts = [];
        for (let i = 0; i <= 48; i++) {
          const t = i / 48;
          const w = Math.sin(t * Math.PI * 2 * waves) * 0.3 * Math.min(1, t * 6);
          pts.push({ x: a.x + dx * t + nx * w, y: a.y + dy * t + ny * w });
        }
        return pts;
      };
      const line = pts => 'M' + pts.map(p => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join('L');
      for (const [from, to] of Object.entries(L.ladders)) {
        const a = centre(+from), b = centre(to);
        paths[from] = ladderPts(a, b);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const ox = (-dy / len) * 0.17, oy = (dx / len) * 0.17;
        const g = svg('g', { stroke: '#A8692F', 'stroke-linecap': 'round' });
        g.append(svg('path', { d: `M${a.x + ox} ${a.y + oy}L${b.x + ox} ${b.y + oy}M${a.x - ox} ${a.y - oy}L${b.x - ox} ${b.y - oy}`, 'stroke-width': 0.07 }));
        const rungs = Math.max(2, Math.round(len / 0.32));
        let d = '';
        for (let r = 1; r < rungs; r++) {
          const t = r / rungs, x = a.x + dx * t, y = a.y + dy * t;
          d += `M${x + ox} ${y + oy}L${x - ox} ${y - oy}`;
        }
        g.append(svg('path', { d, 'stroke-width': 0.05 }));
        art.append(g);
      }
      const snakeColours = [['#2E8B3E', '#7FD08A'], ['#6D44B0', '#B79BEA'], ['#C76A0B', '#FFC46B']];
      Object.entries(L.snakes).forEach(([from, to], i) => {
        const pts = snakePts(centre(+from), centre(to));
        paths[from] = pts;
        const [dark, light] = snakeColours[i % snakeColours.length];
        const d = line(pts);
        art.append(svg('path', { d, fill: 'none', stroke: dark, 'stroke-width': 0.26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
        art.append(svg('path', { d, fill: 'none', stroke: light, 'stroke-width': 0.13, 'stroke-dasharray': '0.12 0.16', 'stroke-linecap': 'round' }));
        const hd = pts[0], nx = pts[0].x - pts[1].x, ny = pts[0].y - pts[1].y, nl = Math.hypot(nx, ny);
        const fx = nx / nl, fy = ny / nl, px = -fy, py = fx;
        art.append(svg('circle', { cx: hd.x, cy: hd.y, r: 0.22, fill: dark }));
        for (const side of [-1, 1]) {
          const ex = hd.x + fx * 0.06 + px * 0.09 * side, ey = hd.y + fy * 0.06 + py * 0.09 * side;
          art.append(svg('circle', { cx: ex, cy: ey, r: 0.065, fill: '#FFFFFF' }));
          art.append(svg('circle', { cx: ex + fx * 0.02, cy: ey + fy * 0.02, r: 0.032, fill: '#1E2B36' }));
        }
      });
      board.append(art);

      const counters = ps.map(p => {
        const face = h('div', { class: 'counter-face' }, p.emoji);
        const el = h('div', { class: `counter seat${p.seat}`, 'aria-label': `${p.name}'s counter` }, face);
        board.append(el);
        return { el, face };
      });

      const wrap = h('div', { class: 'board-wrap' }, board);
      const pips = Array.from({ length: 9 }, () => h('span', { class: 'pip' }));
      const die = h('button', { class: 'die', 'aria-label': 'Dice' }, pips);
      const face = h('div', { class: 'panel-face', 'aria-hidden': 'true' });
      const hint = h('div', { class: 'panel-hint', 'aria-live': 'polite' });
      const panel = h('div', { class: 'panel' }, face, die, hint);
      root.append(h('div', { class: 'snl' }, wrap, panel));

      const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
      const showDie = v => pips.forEach((p, i) => { p.classList.toggle('on', !!v && PIPS[v].includes(i)); p.classList.remove('used'); });

      // Where a counter sits: the square centre, nudged apart when both share it.
      const spot = (seat, n, pt = centre(n)) => {
        const shared = st.pos[0] === st.pos[1] && !pt.free;
        const nudge = shared ? (seat === 0 ? -0.14 : 0.14) : 0;
        return { x: (pt.x + nudge) * s - s * 0.32, y: (pt.y + nudge) * s - s * 0.32 };
      };
      const place = (seat, animate) => {
        const { el } = counters[seat];
        el.classList.toggle('moving', !!animate);
        const p = spot(seat, st.pos[seat]);
        el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      };
      const placeAll = animate => { place(0, animate); place(1, animate); };
      const follow = seat => {
        if (wrap.scrollHeight <= wrap.clientHeight) return;
        const y = centre(st.pos[seat]).y * s + board.offsetTop;
        wrap.scrollTo({ top: y - wrap.clientHeight / 2, behavior: 'smooth' });
      };

      const layout = () => {
        const w = wrap.clientWidth, hh = wrap.clientHeight;
        s = Math.floor(Math.min(w / cols, hh / rows));
        if (s < 44) s = Math.floor(Math.min(w / cols, 60));
        board.style.setProperty('--s', `${s}px`);
        placeAll(false);
      };
      const ro = new ResizeObserver(layout);
      ro.observe(wrap);
      layout();

      function showTurn(speak) {
        const p = ps[st.turn];
        ctx.bar.setTurn(st.turn);
        face.className = `panel-face seat${p.seat}`;
        face.textContent = p.emoji;
        counters.forEach((c, i) => c.el.classList.toggle('current', i === st.turn));
        phase = 'roll';
        die.className = `die ready seat${p.seat}`;
        hint.textContent = 'Tap to roll';
        if (speak) say(`${p.name}, roll the dice!`);
        follow(st.turn);
      }

      async function roll() {
        phase = 'rolling';
        die.classList.remove('ready');
        die.classList.add('rolling');
        hint.textContent = '';
        Sound.play('roll');
        for (let i = 0; i < 8; i++) { showDie(1 + rand(L.die)); await sleep(80); if (!alive) return; }
        const v = 1 + rand(L.die);
        showDie(v);
        die.classList.remove('rolling');
        say(String(v));
        left = v;
        hopCount = 0;
        await sleep(500);
        if (!alive) return;
        phase = 'hop';
        die.classList.add('hopping');
        if (ctx.opts.hop === 'auto') {
          while (alive && phase === 'hop') { hop(); await sleep(520); }
        } else {
          hint.textContent = 'Tap to hop';
        }
      }

      function hop() {
        if (phase !== 'hop' || left <= 0) return;
        const seat = st.turn;
        st.pos[seat] = Math.min(N, st.pos[seat] + 1);
        left--;
        hopCount++;
        const used = pips.filter(p => p.classList.contains('on') && !p.classList.contains('used'));
        used[used.length - 1]?.classList.add('used');
        const { face: f } = counters[seat];
        f.classList.remove('hop');
        void f.offsetWidth;
        f.classList.add('hop');
        placeAll(true);
        follow(seat);
        Sound.play('hop', hopCount);
        say(String(hopCount));
        if (left === 0 || st.pos[seat] === N) {
          phase = 'busy';
          hint.textContent = '';
          setTimeout(() => alive && resolve(seat), 600);
        }
      }

      function moveAlong(seat, pts, ms) {
        return new Promise(done => {
          const { el } = counters[seat];
          el.classList.remove('moving');
          // Even spacing along the drawn path, measured in board units.
          const seg = [0];
          for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
          const total = seg[seg.length - 1];
          const t0 = performance.now();
          const step = now => {
            if (!alive) return done();
            const t = Math.min(1, (now - t0) / ms);
            const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            const dist = e * total;
            let i = 1;
            while (i < seg.length - 1 && seg[i] < dist) i++;
            const k = (dist - seg[i - 1]) / (seg[i] - seg[i - 1] || 1);
            const pt = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k, free: true };
            const p = spot(seat, 0, pt);
            el.style.transform = `translate(${p.x}px, ${p.y}px)`;
            if (wrap.scrollHeight > wrap.clientHeight) wrap.scrollTop = pt.y * s + board.offsetTop - wrap.clientHeight / 2;
            if (t < 1) requestAnimationFrame(step); else done();
          };
          requestAnimationFrame(step);
        });
      }

      async function resolve(seat) {
        const n = st.pos[seat];
        if (L.ladders[n]) {
          Sound.play('climb');
          say('Up the ladder!');
          await moveAlong(seat, paths[n], 1000);
          st.pos[seat] = L.ladders[n];
        } else if (L.snakes[n]) {
          Sound.play('slide');
          say('Wheee!');
          await moveAlong(seat, paths[n], 1400);
          st.pos[seat] = L.snakes[n];
        }
        if (!alive) return;
        placeAll(true);
        const justHome = st.pos[seat] >= N && !st.done[seat];
        if (justHome) {
          st.done[seat] = true;
          ctx.bar.bag(seat).textContent = '🏁';
          await sleep(600);
          if (!alive) return;
        }
        if (st.done.every(Boolean)) {
          ctx.finish('Everyone got home!', h('p', {}, ps.map(p => p.emoji).join(' 🏁 ')));
          return;
        }
        const other = 1 - seat;
        st.turn = st.done[other] ? seat : other;
        ctx.save(st);
        if (justHome) {
          // First one home: start again straight away, or let the other player finish.
          ctx.finish(`${ps[seat].name} got home!`, h('p', {}, `${ps[seat].emoji} 🏁`), () => {
            ctx.save(st);
            Sound.play('turn');
            showTurn(true);
          });
          return;
        }
        if (st.turn !== seat) Sound.play('turn');
        showTurn(true);
      }

      die.addEventListener('click', () => {
        if (phase === 'roll') roll();
        else if (phase === 'hop' && ctx.opts.hop !== 'auto') hop();
      });

      st.done.forEach((d, i) => { if (d) ctx.bar.bag(i).textContent = '🏁'; });
      showDie(0);
      showTurn(true);

      return { destroy() { alive = false; ro.disconnect(); } };
    },
  };

  /* ---------- Game 4: Ludo ---------- */
  // The 52-square loop as [row, col] on a 15x15 grid, clockwise from red's start.
  const LUDO_TRACK = (() => {
    const t = [];
    const run = (r, c, dr, dc, n) => { for (let i = 0; i < n; i++) t.push([r + dr * i, c + dc * i]); };
    run(6, 1, 0, 1, 5); run(5, 6, -1, 0, 6); run(0, 7, 0, 1, 2); run(1, 8, 1, 0, 5);
    run(6, 9, 0, 1, 6); run(7, 14, 1, 0, 2); run(8, 13, 0, -1, 5); run(9, 8, 1, 0, 6);
    run(14, 7, 0, -1, 2); run(13, 6, -1, 0, 5); run(8, 5, 0, -1, 6); run(7, 0, -1, 0, 2);
    return t;
  })();
  const LUDO_START = [0, 13, 26, 39];
  const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  const LUDO_HOME_COL = [0, 1, 2, 3].map(s => [1, 2, 3, 4, 5].map(k =>
    [[7, k], [k, 7], [7, 14 - k], [14 - k, 7]][s]));
  const LUDO_YARD = [[0, 0], [0, 9], [9, 9], [9, 0]];
  const LUDO_FINISH = [{ x: 6.6, y: 7.5 }, { x: 7.5, y: 6.6 }, { x: 8.4, y: 7.5 }, { x: 7.5, y: 8.4 }];
  // A token's progress: -1 in the yard, 0-50 round the loop, 51-55 up its home column, 56 home.
  const YARD = -1, LAST_LOOP = 50, HOME = 56;
  const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  const LUDO = {
    id: 'ludo', name: 'Ludo', icon: '🎲',
    levelLabel: 'People playing',
    levels: [
      { id: '1', label: '1 person', sub: '+ 3 computer', icon: '🧒' },
      { id: '2', label: '2 people', sub: '+ 2 computer', icon: '👫' },
      { id: '3', label: '3 people', sub: '+ 1 computer', icon: '👪' },
      { id: '4', label: '4 people', sub: 'no computer', icon: '👨‍👩‍👧‍👦' },
    ],
    defaultLevel: '2',
    options: [{ id: 'tokens', label: 'Counters each', choices: [
      { id: '2', label: '2', sub: 'quicker game', icon: '⚡' }, { id: '4', label: '4', sub: 'classic', icon: '🏆' },
    ] }],
    defaultOpts: { tokens: '2' },

    // People take the first seats (with the two chosen animals); computers fill the rest.
    players(choice) {
      const humans = +choice.level || 2;
      const spare = CHARACTERS.map((_, i) => i).filter(i => !settings.players.includes(i));
      return [0, 1, 2, 3].map(seat => {
        const c = seat < 2 && seat < humans ? settings.players[seat] : spare.shift();
        return { seat, emoji: CHARACTERS[c][0], name: CHARACTERS[c][1], cpu: seat >= humans, cls: `lc${seat}` };
      });
    },

    create(root, ctx) {
      const ps = ctx.players;
      const nTok = ctx.opts.tokens === '4' ? 4 : 2;
      let st = ctx.saved;
      if (!st || st.tok?.length !== 4 || st.tok[0].length !== nTok) {
        st = { tok: ps.map(() => Array(nTok).fill(YARD)), turn: 0, tries: 0, out: [], keepGoing: false };
      }
      let alive = true;
      let phase = 'idle';
      let rolled = 0;
      let moves = [];
      let cell = 20;
      const shown = ps.map(() => []); // where each token was last drawn, in cell units

      const absOf = (seat, p) => (LUDO_START[seat] + p) % 52;
      const playing = seat => !st.out.includes(seat);

      /* Board */
      const art = svg('svg', { viewBox: '0 0 15 15', 'aria-hidden': 'true' });
      const add = (tag, attrs) => { const e = svg(tag, attrs); art.append(e); return e; };
      const line = 'stroke:var(--cell-line);stroke-width:.04';
      add('rect', { x: 0, y: 0, width: 15, height: 15, rx: 0.3, style: 'fill:var(--cell)' });
      LUDO_TRACK.forEach(([r, c], i) => {
        const owner = LUDO_START.indexOf(i);
        add('rect', { x: c, y: r, width: 1, height: 1, style: `fill:${owner >= 0 ? `var(--l${owner})` : 'var(--cell)'};${line}` });
        if (LUDO_SAFE.has(i) && owner < 0) {
          add('text', { x: c + 0.5, y: r + 0.78, 'font-size': 0.8, 'text-anchor': 'middle', style: 'fill:var(--muted)' }).textContent = '★';
        }
      });
      LUDO_HOME_COL.forEach((cells, s) => cells.forEach(([r, c]) =>
        add('rect', { x: c, y: r, width: 1, height: 1, style: `fill:var(--l${s});${line}` })));
      LUDO_YARD.forEach(([r, c], s) => {
        add('rect', { x: c, y: r, width: 6, height: 6, style: `fill:var(--l${s})` });
        add('rect', { x: c + 0.7, y: r + 0.7, width: 4.6, height: 4.6, rx: 0.6, style: 'fill:var(--cell)' });
        for (let i = 0; i < nTok; i++) {
          const q = yardSpot(s, i);
          add('circle', { cx: q.x, cy: q.y, r: 0.62, style: `fill:var(--l${s}-soft);stroke:var(--l${s});stroke-width:.08` });
        }
      });
      [['6,6 6,9 7.5,7.5', 0], ['6,6 9,6 7.5,7.5', 1], ['9,6 9,9 7.5,7.5', 2], ['6,9 9,9 7.5,7.5', 3]]
        .forEach(([points, s]) => add('polygon', { points, style: `fill:var(--l${s})` }));

      function yardSpot(seat, i) {
        const [r, c] = LUDO_YARD[seat];
        return { x: c + (i % 2 ? 4.25 : 1.75), y: r + (i < 2 ? 1.75 : 4.25) };
      }
      function spotOf(seat, i, p) {
        if (p === YARD) return { key: `y${seat}${i}`, ...yardSpot(seat, i) };
        if (p <= LAST_LOOP) { const a = absOf(seat, p); const [r, c] = LUDO_TRACK[a]; return { key: `m${a}`, x: c + 0.5, y: r + 0.5 }; }
        if (p < HOME) { const [r, c] = LUDO_HOME_COL[seat][p - 51]; return { key: `h${seat}${p}`, x: c + 0.5, y: r + 0.5 }; }
        return { key: `f${seat}`, ...LUDO_FINISH[seat] };
      }

      const board = h('div', { class: 'ludo-board' }, art);
      const tokEls = ps.map(p => st.tok[p.seat].map(() => {
        const el = h('div', { class: `ludo-token lc${p.seat}` }, h('div', { class: 'ludo-token-face' }, p.emoji));
        board.append(el);
        return el;
      }));

      // Draw every token, fanning out any that share a square.
      function drawTokens(how = '') {
        const groups = {};
        ps.forEach(p => st.tok[p.seat].forEach((prog, i) => {
          const sp = spotOf(p.seat, i, prog);
          (groups[sp.key] ||= []).push({ seat: p.seat, i, sp });
        }));
        for (const list of Object.values(groups)) {
          list.forEach(({ seat, i, sp }, k) => {
            const n = list.length;
            const ang = (k / n) * Math.PI * 2 - Math.PI / 4;
            const spread = n > 1 ? 0.24 : 0;
            const x = sp.x + Math.cos(ang) * spread, y = sp.y + Math.sin(ang) * spread;
            shown[seat][i] = { x, y };
            const el = tokEls[seat][i];
            el.classList.remove('moving', 'slow');
            if (how) el.classList.add(how);
            el.style.transform = `translate(${(x - 0.45) * cell}px, ${(y - 0.45) * cell}px) scale(${n > 1 ? 0.72 : 1})`;
          });
        }
      }

      /* Panel */
      const pips = Array.from({ length: 9 }, () => h('span', { class: 'pip' }));
      const die = h('button', { class: 'die', 'aria-label': 'Dice' }, pips);
      const face = h('div', { class: 'panel-face', 'aria-hidden': 'true' });
      const hint = h('div', { class: 'panel-hint', 'aria-live': 'polite' });
      const wrap = h('div', { class: 'ludo-wrap' }, board);
      root.append(h('div', { class: 'ludo' }, h('div', { class: 'ludo-side' }, ctx.bar.el), wrap, h('div', { class: 'panel' }, face, die, hint)));
      const showDie = v => pips.forEach((p, i) => p.classList.toggle('on', !!v && DIE_PIPS[v].includes(i)));

      const layout = () => {
        const size = Math.floor(Math.min(wrap.clientWidth, wrap.clientHeight));
        cell = size / 15;
        board.style.width = board.style.height = `${size}px`;
        board.style.setProperty('--cs', `${cell}px`);
        drawTokens();
      };
      const ro = new ResizeObserver(layout);
      ro.observe(wrap);
      layout();

      const updateBags = () => ps.forEach(p => {
        ctx.bar.bag(p.seat).textContent = '★'.repeat(st.tok[p.seat].filter(t => t === HOME).length);
      });

      /* Rules */
      function legalMoves(seat, v) {
        const out = [];
        st.tok[seat].forEach((p, i) => {
          if (p === YARD) { if (v === 6) out.push({ i, from: p, to: 0 }); }
          // No exact roll needed to get home: overshooting still counts.
          else if (p < HOME) out.push({ i, from: p, to: Math.min(HOME, p + v) });
        });
        return out;
      }
      // How many opponent tokens could land on loop square a with their next roll.
      function danger(seat, a) {
        if (LUDO_SAFE.has(a)) return 0;
        let d = 0;
        ps.forEach(o => {
          if (o.seat === seat || !playing(o.seat)) return;
          for (const p of st.tok[o.seat]) {
            if (p < 0 || p > LAST_LOOP) continue;
            const dist = (a - absOf(o.seat, p) + 52) % 52;
            if (dist >= 1 && dist <= 6 && p + dist <= LAST_LOOP) d++;
          }
        });
        return d;
      }
      function victims(seat, to) {
        if (to > LAST_LOOP) return [];
        const a = absOf(seat, to);
        if (LUDO_SAFE.has(a)) return [];
        const hit = [];
        ps.forEach(o => {
          if (o.seat === seat) return;
          st.tok[o.seat].forEach((p, j) => { if (p >= 0 && p <= LAST_LOOP && absOf(o.seat, p) === a) hit.push([o.seat, j]); });
        });
        return hit;
      }
      // Semi-smart: weighs captures, safety and progress, with some randomness so it can be beaten.
      function computerPick(seat, list) {
        if (Math.random() < 0.15) return list[rand(list.length)];
        let best = null, bestScore = -Infinity;
        for (const m of list) {
          let score = Math.random() * 10 + m.from / 10;
          if (m.from === YARD) score += 50;
          if (m.to === HOME) score += 90;
          else if (m.to > LAST_LOOP) score += m.from <= LAST_LOOP ? 45 : 5;
          if (m.to <= LAST_LOOP) {
            const a = absOf(seat, m.to);
            score += victims(seat, m.to).length * 75;
            if (LUDO_SAFE.has(a)) score += 15;
            score -= danger(seat, a) * 25;
          }
          if (m.from >= 0 && m.from <= LAST_LOOP) score += danger(seat, absOf(seat, m.from)) * 20;
          if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
      }

      /* Turns */
      function showTurn() {
        const p = ps[st.turn];
        ctx.bar.setTurn(st.turn);
        face.className = `panel-face lc${p.seat}`;
        face.textContent = p.emoji;
        die.className = `die lc${p.seat}`;
      }

      async function startTurn() {
        if (!alive) return;
        const p = ps[st.turn];
        showTurn();
        if (p.cpu) {
          phase = 'cpu';
          hint.textContent = '';
          await sleep(400);
          if (alive) roll();
        } else {
          phase = 'roll';
          die.classList.add('ready');
          hint.textContent = 'Tap to roll';
          say(`${p.name}, roll the dice!`);
        }
      }

      async function roll() {
        phase = 'rolling';
        die.classList.remove('ready');
        die.classList.add('rolling');
        hint.textContent = '';
        Sound.play('roll');
        for (let i = 0; i < 7; i++) { showDie(1 + rand(6)); await sleep(75); if (!alive) return; }
        const v = 1 + rand(6);
        const seat = st.turn, p = ps[seat];
        showDie(v);
        die.classList.remove('rolling');
        if (!p.cpu) say(String(v));
        await sleep(450);
        if (!alive) return;

        moves = legalMoves(seat, v);
        if (!moves.length) {
          // With nobody out of the yard, you get three goes at rolling a 6.
          const nobodyOut = st.tok[seat].every(t => t === YARD || t === HOME);
          if (nobodyOut && st.tries < 2) {
            st.tries++;
            if (p.cpu) { await sleep(350); if (alive) roll(); return; }
            phase = 'roll';
            die.classList.add('ready');
            hint.textContent = 'Roll again';
            return;
          }
          hint.textContent = 'No move';
          await sleep(900);
          if (alive) endTurn(false);
          return;
        }
        if (p.cpu) { move(seat, computerPick(seat, moves), v); return; }
        // Tokens in the same place make the same move, so only ask when there's a real choice.
        const distinct = moves.filter((m, k) => moves.findIndex(n => n.from === m.from) === k);
        if (distinct.length === 1) { move(seat, distinct[0], v); return; }
        phase = 'pick';
        rolled = v;
        hint.textContent = 'Tap a counter';
        moves.forEach(m => tokEls[seat][m.i].classList.add('movable'));
      }

      // Taps pick the nearest counter that can move, so small fingers don't need to be precise.
      board.addEventListener('pointerdown', e => {
        if (phase !== 'pick') return;
        const r = board.getBoundingClientRect();
        const x = (e.clientX - r.left) / cell, y = (e.clientY - r.top) / cell;
        let best = null, bestDist = Infinity;
        for (const m of moves) {
          const q = shown[st.turn][m.i];
          const d = Math.hypot(q.x - x, q.y - y);
          if (d < bestDist) { bestDist = d; best = m; }
        }
        if (best && bestDist < 3) move(st.turn, best, rolled);
      });
      die.addEventListener('click', () => { if (phase === 'roll' && !ps[st.turn].cpu) roll(); });

      async function move(seat, m, v) {
        phase = 'moving';
        hint.textContent = '';
        tokEls[seat].forEach(el => el.classList.remove('movable'));
        const toks = st.tok[seat];
        if (m.from === YARD) {
          toks[m.i] = 0;
          Sound.play('climb');
          drawTokens('slow');
          await sleep(600);
        } else {
          for (let k = m.from + 1; k <= m.to; k++) {
            toks[m.i] = k;
            drawTokens('moving');
            Sound.play('hop', k - m.from);
            await sleep(170);
            if (!alive) return;
          }
        }
        const hit = victims(seat, m.to);
        if (hit.length) {
          await sleep(200);
          hit.forEach(([o, j]) => { st.tok[o][j] = YARD; });
          Sound.play('slide');
          say(`Back to the nest, ${ps[hit[0][0]].name}!`);
          drawTokens('slow');
          await sleep(900);
        }
        if (!alive) return;
        if (m.to === HOME) { Sound.play('home'); updateBags(); }

        if (toks.every(t => t === HOME) && playing(seat)) {
          st.out.push(seat);
          await sleep(400);
          if (!alive) return;
          const left = ps.filter(p => playing(p.seat));
          const peopleLeft = left.some(p => !p.cpu);
          if (left.length <= 1 || !peopleLeft || st.keepGoing) {
            if (left.length <= 1 || !peopleLeft) { gameOver(); return; }
            Sound.play('cheer');
            say(`${ps[seat].name} is home!`);
          } else {
            // First one home: start again, or let everyone else carry on.
            const detail = h('p', {}, `${ps[seat].emoji} 🏁`);
            ctx.finish(`${ps[seat].name} got home first!`, detail, () => {
              st.keepGoing = true;
              endTurn(false);
            });
            return;
          }
        }
        endTurn(v === 6 && playing(seat));
      }

      function gameOver() {
        const order = [...st.out, ...ps.map(p => p.seat).filter(s => playing(s))];
        ctx.finish(`${ps[st.out[0]].name} got home first!`,
          h('p', {}, order.map(s => ps[s].emoji + (playing(s) ? '' : '🏁')).join('  ')));
      }

      function endTurn(again) {
        st.tries = 0;
        if (again) {
          if (!ps[st.turn].cpu) say('Six! Roll again!');
        } else {
          do { st.turn = (st.turn + 1) % 4; } while (!playing(st.turn));
          Sound.play('turn');
        }
        ctx.save(st);
        startTurn();
      }

      updateBags();
      showDie(0);
      startTurn();

      return { destroy() { alive = false; ro.disconnect(); } };
    },
  };

  const GAMES = [PAIRS, BUBBLES, SNAKES, LUDO];

  showHome();
})();
