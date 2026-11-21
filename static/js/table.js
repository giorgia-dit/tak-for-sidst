// SETUP

const seats = document.querySelector('.seats');
const canvas = seats.querySelector('canvas');
const ctx = canvas.getContext('2d');
const data = JSON.parse(document.getElementById('table-data').textContent);
const cards = new Map(data.cards.map((card) => [card.seat, card]));

// CONSTANTS

const SCORES = ['snak', 'gejst', 'undren', 'minder'];
const FULL_ROUNDS = 2; //  number of full rounds of touches filling quality lines
const TOUCH_INTERVAL = 1.2; // secs between two touches
const TRAIL_INTERVAL = 0.18; // secs between two points of the same score
const TRAIL_DURATION = 1.6; // secs from the seat to the thread


// COMPUTATIONS

// read a color from BS variables
function color(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// return sum over all touches for each score 
function scoreTotals(touches) {
  const totals = Object.fromEntries(SCORES.map((score) => [score, 0]));
  for (const touch of touches) {
    const card = cards.get(touch.seat);
    for (const score of SCORES) totals[score] += card[score];
  }
  return totals;
}

// return touches to replay, oldest first: 
// - anon-user: none
// - first visit: all
// - further visit: touches after previous visit
function newTouches() {
  if (!data.card_seat) return [];
  if (!data.card_previous_seen_at) return data.touches;
  const since = new Date(data.card_previous_seen_at);
  return data.touches.filter((touch) => new Date(touch.at) > since);
}

// return score points that make a thread as long as the table
function fullLength() {
  const roundTotals = SCORES.map((score) =>
    data.cards.reduce((sum, card) => sum + card[score], 0),
  );
  return FULL_ROUNDS * Math.max(...roundTotals);
}

// return position and size of the middle grid column
function tableRect() {
  const styles = getComputedStyle(seats);
  const [left, middle] = styles.gridTemplateColumns.split(' ').map(parseFloat);
  const gap = parseFloat(styles.columnGap);
  return { x: left + gap, y: 0, width: middle, height: seats.clientHeight };
}

// return map of positions where each seat meets the table edge, keyed by seat number (e.g. 26 → { x: 120, y: 310 })
function measureSeats(table) {
  const origin = seats.getBoundingClientRect();
  const points = new Map();
  for (const button of seats.querySelectorAll('[data-seat]')) {
    const rect = button.getBoundingClientRect();
    const isLeft = rect.left < origin.left + table.x;
    points.set(Number(button.dataset.seat), {
      x: isLeft ? table.x : table.x + table.width,
      y: rect.top - origin.top + rect.height / 2,
    });
  }
  return points;
}

// return horizontal offset of a thread at u (0-1 along the table) in lane widths
function wobble(u, index, time) {
  return Math.sin(u * 16 + time * 0.7 + index * 1.7) * 0.12
    + Math.sin(u * 5 - time * 0.4 + index) * 0.08;
}

// return position of the thread of the score at index, at u (0-1 along the table)
function threadPoint(index, u, time) {
  const lane = table.width / (SCORES.length + 1);
  return {
    x: table.x + lane * (index + 1) + wobble(u, index, time) * lane,
    y: table.y + u * table.height,
  };
}

// return position at t (0-1) on the quadratic curve from a to b, bent towards c
function curvePoint(a, c, b, t) {
  const m = 1 - t;
  return {
    x: m * m * a.x + 2 * m * t * c.x + t * t * b.x,
    y: m * m * a.y + 2 * m * t * c.y + t * t * b.y,
  };
}

// STATE

const replay = newTouches();
const seenTouches = data.touches.filter((touch) => !replay.includes(touch));
let totals = scoreTotals(seenTouches); // grows during the replay, as trails reach the threads
const trails = replay.flatMap((touch, touchIndex) => {
  const card = cards.get(touch.seat);
  return SCORES.flatMap((score, index) =>
    Array.from({ length: card[score] }, (_, point) => ({
      seat: touch.seat,
      score,
      index,
      start: touchIndex * TOUCH_INTERVAL + point * TRAIL_INTERVAL,
      arrived: false,
    })),
  );
});
const litAt = new Map(seenTouches.map((touch) => [touch.seat, -Infinity])); // time each seat lights up: 0 if seated, its first replayed touch otherwise
let replayStart = null; // set when the intro closes; the replay runs from then
replay.forEach((touch, touchIndex) => {
  if (!litAt.has(touch.seat)) litAt.set(touch.seat, touchIndex * TOUCH_INTERVAL);
});
const full = fullLength();
const colors = {
    table: color('--bs-secondary-bg'),
    glow: color('--bs-body-color-rgb'),
    ...Object.fromEntries(SCORES.map((score) => [score, color(`--bs-${score}`)])),
};

// layout-dependent, updated by resize()
let table = tableRect();
let seatPoints = measureSeats(table);


// UPDATE

// mark the trails that reached their thread and add their point to its total
function update(time) {
  for (const trail of trails) {
    if (!trail.arrived && time >= trail.start + TRAIL_DURATION) {
      trail.arrived = true;
      totals[trail.score] += 1;
    }
  }
}


// DRAWING

function drawTable() {
  ctx.fillStyle = colors.table;
  ctx.beginPath();
  ctx.roundRect(table.x, table.y, table.width, table.height, table.width * 0.15);
  ctx.fill();
}

// draw threads: one lane per score, length proportional to its total
function drawThreads(time) {
  const lane = table.width / (SCORES.length + 1);
    ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  SCORES.forEach((score, index) => {
    const progress = Math.min(totals[score] / full, 1);
    if (!progress) return;

    const steps = Math.max(2, Math.round(60 * progress));
    ctx.strokeStyle = colors[score];
    ctx.beginPath();
    for (let step = 0; step <= steps; step++) {
      const point = threadPoint(index, (step / steps) * progress, time);
      if (step === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  });
}

// draw trails in flight: a fading tail moving from the seat to the tip of the thread
function drawTrails(time, elapsed) {
  ctx.lineCap = 'round';

  for (const trail of trails) {
    const progress = (elapsed - trail.start) / TRAIL_DURATION;
    if (progress <= 0 || trail.arrived) continue;

    const eased = progress * progress * (3 - 2 * progress);
    const seat = seatPoints.get(trail.seat);
    const tip = threadPoint(trail.index, Math.min(totals[trail.score] / full, 1), time);
    const bend = { x: tip.x, y: seat.y };
    const own = trail.seat === data.card_seat;

    ctx.strokeStyle = colors[trail.score];
    ctx.lineWidth = own ? 2 : 1.5;

    const tail = Math.max(0, eased - 0.3);
    let previous = curvePoint(seat, bend, tip, tail);
    for (let step = 1; step <= 10; step++) {
      const current = curvePoint(seat, bend, tip, tail + ((eased - tail) * step) / 10);
      ctx.globalAlpha = (own ? 1 : 0.3) * (step / 10);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.x, current.y);
      ctx.stroke();
      previous = current;
    }
  }

  ctx.globalAlpha = 1;
}

// draw seats: a warm glow fading in when someone first sits, stronger for the own seat
function drawSeats(elapsed) {
  for (const [seat, start] of litAt) {
    const light = Math.min(Math.max((elapsed - start) / 1.4, 0), 1);
    if (!light) continue;

    const point = seatPoints.get(seat);
    const own = seat === data.card_seat;
    const radius = own ? 36 : 24;
    const alpha = (own ? 0.5 : 0.3) * light;

    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    glow.addColorStop(0, `rgba(${colors.glow}, ${alpha})`);
    glow.addColorStop(1, `rgba(${colors.glow}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
  }
}

function draw(time, elapsed) {
  ctx.clearRect(0, 0, seats.clientWidth, seats.clientHeight);
  drawTable();
  drawSeats(elapsed);
  drawThreads(time);
  drawTrails(time, elapsed);
}


// START

// resize the canvas to the grid, scaled for high-density screens (max 2x)
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(seats.clientWidth * ratio);
  canvas.height = Math.round(seats.clientHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  table = tableRect();
  seatPoints = measureSeats(table);
}

// monitor intro: closing it starts the replay
const intro = document.getElementById('intro');
if (intro) {
  intro.addEventListener('click', () => {
    intro.classList.remove('show');
    intro.addEventListener('transitionend', () => { intro.hidden = true; }, { once: true });
    replayStart = performance.now() / 1000;
  }, { once: true });
} else {
  replayStart = performance.now() / 1000;
}

function frame(now) {
  const time = now / 1000;
  const elapsed = replayStart === null ? -1 : time - replayStart;
  update(elapsed);
  draw(time, elapsed);
  requestAnimationFrame(frame);
}

new ResizeObserver(resize).observe(seats);
requestAnimationFrame(frame);