const seats = document.querySelector('.seats');
const canvas = seats.querySelector('canvas');
const ctx = canvas.getContext('2d');

const data = JSON.parse(document.getElementById('table-data').textContent);
const SCORES = ['snak', 'gejst', 'undren', 'minder'];
const FULL_ROUNDS = 2; //  number of full rounds of touches filling quality lines

// read a color from BS variables
function color(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// return position and size of the middle grid column
function tableRect() {
  const styles = getComputedStyle(seats);
  const [left, middle] = styles.gridTemplateColumns.split(' ').map(parseFloat);
  const gap = parseFloat(styles.columnGap);
  return { x: left + gap, y: 0, width: middle, height: seats.clientHeight };
}

// return sum over all touches for each score 
function scoreTotals() {
  const cards = new Map(data.cards.map((card) => [card.seat, card]));
  const totals = Object.fromEntries(SCORES.map((score) => [score, 0]));
  for (const touch of data.touches) {
    const card = cards.get(touch.seat);
    for (const score of SCORES) totals[score] += card[score];
  }
  return totals;
}

// return score points that make a thread as long as the table
function fullLength() {
  const roundTotals = SCORES.map((score) =>
    data.cards.reduce((sum, card) => sum + card[score], 0),
  );
  return FULL_ROUNDS * Math.max(...roundTotals);
}

const totals = scoreTotals();
const full = fullLength();
const colors = {
  table: color('--bs-secondary-bg'),
  ...Object.fromEntries(SCORES.map((score) => [score, color(`--bs-${score}`)])),
};

function wobble(u, index, time) {
  return Math.sin(u * 16 + time * 0.7 + index * 1.7) * 0.12
    + Math.sin(u * 5 - time * 0.4 + index) * 0.08;
}

function draw(time) {
  ctx.clearRect(0, 0, seats.clientWidth, seats.clientHeight);

  const table = tableRect();
  ctx.fillStyle = colors.table;
  ctx.beginPath();
  ctx.roundRect(table.x, table.y, table.width, table.height, table.width * 0.15);
  ctx.fill();

  // threads: one lane per score, length proportional to its total
  const lane = table.width / (SCORES.length + 1);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  SCORES.forEach((score, index) => {
    const progress = Math.min(totals[score] / full, 1);
    if (!progress) return;

    const x = table.x + lane * (index + 1);
    const steps = Math.max(2, Math.round(60 * progress));

    ctx.strokeStyle = colors[score];
    ctx.beginPath();
    for (let step = 0; step <= steps; step++) {
      const u = (step / steps) * progress;
      const pointX = x + wobble(u, index, time) * lane;
      const pointY = table.y + u * table.height;
      if (step === 0) ctx.moveTo(pointX, pointY);
      else ctx.lineTo(pointX, pointY);
    }
    ctx.stroke();
  });
}

// resize the canvas to the grid, scaled for high-density screens (max 2x)
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(seats.clientWidth * ratio);
  canvas.height = Math.round(seats.clientHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

new ResizeObserver(resize).observe(seats);

function frame(now) {
  draw(now / 1000);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);