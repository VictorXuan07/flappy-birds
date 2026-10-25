// 获取画布和画笔 / Get the canvas and drawing context
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');
const controls = document.getElementById('controls');
let bird = { x: 100, y: 280, width: 30, height: 25, vy: 0 };
let state = 'READY', score = 0, best = 0, pipes = [];
let gravity = 0.35, flapSpeed = -6, gap = 190, speed = 2;
let moveBird = () => { }, movePipes = () => { }, drawPipes = () => { };
let onFlap = () => { }, drawEffects = () => { }, afterScore = () => { };
let saveBest = () => { }, clearEffects = () => { };
const backgroundImage = new Image(); // 加载项目内的背景图片 / Load the background picture included with the game.
backgroundImage.src = 'pictures/background.png';
// 背景和地面 / Background and ground
function background() {
  ctx.fillStyle = '#08142f'; ctx.fillRect(0, 0, 400, 600);
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    const scale = Math.max(400 / backgroundImage.width, 550 / backgroundImage.height); // 等比例填满，避免变形 / Fill the sky without stretching the picture.
    const width = backgroundImage.width * scale, height = backgroundImage.height * scale;
    ctx.drawImage(backgroundImage, (400 - width) / 2, (550 - height) / 2, width, height);
  }
  ctx.fillStyle = '#101b35'; ctx.fillRect(0, 550, 400, 50);
  ctx.fillStyle = '#63e9ff'; ctx.fillRect(0, 550, 400, 3);
}
let drawBird = () => { };
function endGame() {
  if (state !== 'PLAYING') return;
  state = 'GAME_OVER'; best = Math.max(best, score); saveBest();
}
function reset() {
  state = 'READY'; bird.y = 280; bird.vy = 0; pipes = []; score = 0; clearEffects();
  speed = 2; // Restore the starting speed each round.
  gap = 190; // 每局恢复原来的管道开口 / Restore the original pipe opening each round.
}
// 每秒进行六十次物理更新 / Run physics at sixty steps per second
let previous = 0, elapsed = 0;
function frame(time) {
  elapsed += Math.min((time - previous) / 1000, 0.05); previous = time;
  while (elapsed >= 1 / 60) { moveBird(); movePipes(); elapsed -= 1 / 60; }
  background(); drawPipes(); drawEffects(); drawBird();
  ctx.fillStyle = '#08142fe6'; ctx.fillRect(48, 12, 304, 42); // 深色底保证分数清晰 / Dark backing keeps scores readable.
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`Score ${score}   Best ${best}`, 200, 40);
  if (state !== 'PLAYING') {
    ctx.fillStyle = '#08142fe6'; ctx.fillRect(60, 190, 280, 56);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial'; ctx.fillText(state === 'READY' ? 'Ready to fly' : 'Game over', 200, 225);
  }
  requestAnimationFrame(frame);
}
// 画出小鸟 / Draw the bird
drawBird = () => {
  ctx.fillStyle = '#ffc946'; ctx.beginPath();
  ctx.ellipse(bird.x + 15, bird.y + 12.5, 15, 12.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#27213c'; ctx.beginPath(); ctx.arc(bird.x + 21, bird.y + 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ec7936'; ctx.fillRect(bird.x + 25, bird.y + 12, 5, 4);
};
// 输入与重力 / Input and gravity
function flap() {
  if (state === 'GAME_OVER') { reset(); return; }
  state = 'PLAYING'; bird.vy = flapSpeed; onFlap();
}
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['SELECT', 'BUTTON', 'INPUT'].includes(e.target.tagName)) {
    e.preventDefault(); if (!e.repeat) flap();
  }
});
canvas.addEventListener('pointerdown', () => { canvas.focus(); flap(); });
moveBird = () => {
  if (state !== 'PLAYING') return;
  bird.vy += gravity; bird.y += bird.vy;
  if (bird.y < 0) { bird.y = 0; bird.vy = 0; }
  if (bird.y + bird.height >= 550) { bird.y = 550 - bird.height; endGame(); }
};
statusText.textContent = 'Press Space to start. Press again to flap. After a crash, press once to reset.';
// 生成和移动管道 / Create and move pipes
function createPipe() {
  const top = 70 + Math.random() * (550 - gap - 140);
  pipes.push({ x: 400, top, bottom: top + gap, scored: false });
}
movePipes = () => {
  if (state !== 'PLAYING') return;
  for (const p of pipes) p.x -= speed;
  pipes = pipes.filter(p => p.x + 60 > 0);
  if (!pipes.length || pipes[pipes.length - 1].x < 170) createPipe();
};
let pipeLabels = ['', ''];
drawPipes = () => {
  for (const p of pipes) {
    ctx.fillStyle = '#478354'; ctx.fillRect(p.x, 0, 60, p.top); ctx.fillRect(p.x, p.bottom, 60, 550 - p.bottom);
    ctx.fillStyle = '#74b779'; ctx.fillRect(p.x, p.top - 12, 60, 12); ctx.fillRect(p.x, p.bottom, 60, 12);
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = '10px Arial';
    ctx.fillText(pipeLabels[0], p.x + 30, p.top - 24); ctx.fillText(pipeLabels[1], p.x + 30, p.bottom + 30);
  }
};
// 检查碰撞并且只计分一次 / Check collisions and score only once
const movePipesWithoutHits = movePipes;
movePipes = () => {
  movePipesWithoutHits();
  if (state !== 'PLAYING') return;
  for (const p of pipes) {
    const overlap = bird.x + bird.width > p.x && bird.x < p.x + 60;
    if (overlap && (bird.y < p.top || bird.y + bird.height > p.bottom)) { endGame(); return; }
    if (!p.scored && p.x + 60 < bird.x) {
      p.scored = true; score++; afterScore();
      if (score % 5 === 0) {
        speed *= 1.1; // Every 5 points, increase the current speed by 10% (no /60 needed).
        gap *= 0.97; // 每得5分，新管道开口缩小3%，保留当前宽度的97% / Every 5 points, new pipe openings keep 97% of the current gap.
      }
    }
  }
};
// 保存到当前浏览器 / Save in this browser
const storageKey = 'aie1101-bird-best';
document.getElementById('saveNote').textContent = 'Best score is saved in this browser at this address.';
try { best = Math.max(0, Number(localStorage.getItem(storageKey)) || 0); }
catch { document.getElementById('saveNote').textContent = 'Storage unavailable. Best score lasts until you close this page.'; }
saveBest = () => {
  try { localStorage.setItem(storageKey, String(best)); }
  catch { document.getElementById('saveNote').textContent = 'Storage unavailable. Best score lasts until you close this page.'; }
};
// 跳跃粒子和音效 / Jump particles and sound
let particles = [], audio = null, soundOn = false;
const soundButton = document.createElement('button'); soundButton.textContent = 'Sound off'; controls.append(soundButton);
soundButton.onclick = () => { soundOn = !soundOn; soundButton.textContent = soundOn ? 'Sound on' : 'Sound off'; };
onFlap = () => {
  for (let i = 0; i < 8; i++) particles.push({ x: bird.x, y: bird.y + 20, vx: -1 - Math.random() * 2, vy: Math.random() * 2, life: 1 });
  if (!soundOn) return;
  try {
    audio = audio || new AudioContext(); audio.resume().catch(() => { });
    const tone = audio.createOscillator(), volume = audio.createGain();
    tone.connect(volume); volume.connect(audio.destination);
    tone.frequency.setValueAtTime(600, audio.currentTime);
    tone.frequency.exponentialRampToValueAtTime(300, audio.currentTime + 0.08);
    volume.gain.setValueAtTime(0.06, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.1);
    tone.start(); tone.stop(audio.currentTime + 0.1);
  } catch { soundButton.textContent = 'Sound unavailable'; soundOn = false; }
};
const moveBirdWithoutParticles = moveBird;
moveBird = () => {
  moveBirdWithoutParticles();
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life -= 1 / 30; }
  particles = particles.filter(p => p.life > 0);
};
drawEffects = () => { for (const p of particles) { ctx.globalAlpha = p.life; ctx.fillStyle = '#179fb7'; ctx.fillRect(p.x, p.y, 5, 5); } ctx.globalAlpha = 1; };
clearEffects = () => { particles = []; };
// 三个主题与经典小鸟 / Three themes and the classic bird
const classicBird = drawBird;
const skins = [
  { name: 'Classic', need: 0, labels: ['', ''] },
  { name: 'Coder', need: 5, labels: ['Bug', 'Deadline'] },
  { name: 'Nailong', need: 10, labels: ['hahaha', 'eee'], picture: 'pictures/nailong.png' },
  { name: 'Nylong', need: 15, labels: ['Pre', 'Exam'], picture: 'pictures/nylon.png' }
];
for (const s of skins) {
  if (s.picture) {
    s.image = new Image(); // 提前加载角色图片 / Load character pictures before drawing them.
    s.image.src = s.picture;
  }
}
let skin = 0;
const label = document.createElement('label'); label.textContent = 'Character '; label.htmlFor = 'skin'; controls.append(document.createElement('br'), label);
const picker = document.createElement('select'); picker.id = 'skin'; controls.append(picker);
for (const s of skins) { const option = document.createElement('option'); option.textContent = s.name; picker.append(option); }
picker.onchange = () => { skin = picker.selectedIndex; pipeLabels = skins[skin].labels; reset(); };
drawBird = () => {
  if (skin === 0) { classicBird(); return; }
  if (skin === 1) {
    ctx.fillStyle = '#634585'; ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    ctx.textAlign = 'center'; ctx.fillStyle = 'white'; ctx.font = 'bold 17px Arial';
    ctx.fillText('<>', bird.x + 15, bird.y + 19);
    return;
  }
  const image = skins[skin].image;
  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.min(bird.width / image.width, bird.height / image.height); // 保持图片比例并放进原来的碰撞框 / Fit the picture inside the original hitbox without stretching.
    const width = image.width * scale, height = image.height * scale;
    ctx.drawImage(image, bird.x + (bird.width - width) / 2, bird.y + (bird.height - height) / 2, width, height);
  } else { classicBird(); } // 图片未加载时仍显示小鸟 / Show the classic bird while the picture is unavailable.
};
// 用最高分解锁角色 / Unlock characters with the best score
function updateUnlocks() {
  skins.forEach((s, i) => {
    picker.options[i].disabled = best < s.need;
    picker.options[i].textContent = s.name + (best < s.need ? ` - reach ${s.need}` : '');
  });
}
afterScore = () => { best = Math.max(best, score); saveBest(); updateUnlocks(); };
updateUnlocks();
statusText.textContent = 'Score 5 to unlock Coder, 10 for Nailong and 15 for Nylong. Change character to start a fresh round.';



// 在此添加下一段代码 / ADD_NEXT_FEATURE_HERE
requestAnimationFrame(frame);

