(() => {
  'use strict';
  const W = 960, H = 1280;
  // テンプレート上の座標
  const FRAME = { x: 633, y: 210, w: 253, h: 316 };      // 写真枠
  const INFO = [                                          // 氏名・誕生日・身長
    { id: 'name',   x: 232, y: 260 },
    { id: 'birth',  x: 232, y: 330 },
    { id: 'height', x: 232, y: 397 },
  ];
  const INFO_MAX_W = 385;
  const ROW = { x: 306, y0: 660, h: 84, maxW: 570 };      // 記入欄
  const FONTS = {
    mincho:  '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS PMincho", "Noto Serif JP", serif',
    gothic:  '"Yu Gothic", "YuGothic", "Hiragino Kaku Gothic ProN", "Meiryo", "Noto Sans JP", sans-serif',
    rounded: '"Hiragino Maru Gothic ProN", "BIZ UDPGothic", "Meiryo", "Noto Sans JP", sans-serif',
  };

  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  // 配布元の image-web.jpg の SHA-256（これと一致する画像だけをテンプレートとして受け付ける）
  const EXPECTED_SHA256 = 'b3cf240ecb38f75378e94f616940605a962136515a1a77057125996fca3aad2b';
  let tpl = null;
  let photo = null;
  const st = { scale: 1, x: 0, y: 0, rot: 0, flip: false };   // x,y は枠サイズに対する % (-100..100)

  const ids = ['name', 'birth', 'height', 't0', 't1', 't2', 't3', 't4', 't5', 'font', 'fs1', 'fs2', 'color'];

  // 写真を枠に cover でフィットさせる基準倍率
  function baseScale() {
    return Math.max(FRAME.w / photo.width, FRAME.h / photo.height);
  }

  function drawPhoto() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h);
    if (photo) {
      const cx = FRAME.x + FRAME.w / 2 + st.x / 100 * FRAME.w;
      const cy = FRAME.y + FRAME.h / 2 + st.y / 100 * FRAME.h;
      const s = baseScale() * st.scale;
      ctx.translate(cx, cy);
      ctx.rotate(st.rot * Math.PI / 180);
      ctx.scale(st.flip ? -s : s, s);
      ctx.drawImage(photo, -photo.width / 2, -photo.height / 2);
    }
    ctx.restore();
    ctx.strokeStyle = '#8a98a8';
    ctx.lineWidth = 1;
    ctx.strokeRect(FRAME.x - 0.5, FRAME.y - 0.5, FRAME.w + 1, FRAME.h + 1);
  }

  // 幅を超える場合は横方向にだけ縮めて描画
  function fitText(text, x, cy, maxW, size, align) {
    ctx.font = `${size}px ${FONTS[$('font').value]}`;
    const w = ctx.measureText(text).width;
    ctx.save();
    ctx.translate(x, cy);
    if (w > maxW) ctx.scale(maxW / w, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function drawTexts() {
    ctx.fillStyle = $('color').value;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const fs1 = +$('fs1').value, fs2 = +$('fs2').value;
    for (const f of INFO) {
      const v = $(f.id).value.trim();
      if (v) fitText(v, f.x, f.y, INFO_MAX_W, fs1);
    }
    for (let i = 0; i < 6; i++) {
      const lines = $('t' + i).value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2);
      if (!lines.length) continue;
      const cy = ROW.y0 + ROW.h * i + ROW.h / 2;
      if (lines.length === 1) {
        fitText(lines[0], ROW.x, cy + 1, ROW.maxW, fs2);
      } else {
        const sz = Math.min(fs2, 28), gap = sz * 0.65;
        fitText(lines[0], ROW.x, cy - gap, ROW.maxW, sz);
        fitText(lines[1], ROW.x, cy + gap, ROW.maxW, sz);
      }
    }
  }

  function drawPlaceholder() {
    ctx.fillStyle = '#e4ecf5';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a5b6c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `44px ${FONTS.gothic}`;
    ctx.fillText('テンプレート画像を読み込んでください', W / 2, H / 2 - 30);
    ctx.font = `30px ${FONTS.gothic}`;
    ctx.fillText('image-web.jpg をここにドロップ', W / 2, H / 2 + 30);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    $('download').disabled = !tpl;
    if (tpl) {
      ctx.drawImage(tpl, 0, 0, W, H);
      drawPhoto();
      drawTexts();
    } else {
      drawPlaceholder();
    }
    $('o-scale').textContent = st.scale.toFixed(2) + '×';
    $('o-x').textContent = st.x.toFixed(0) + '%';
    $('o-y').textContent = st.y.toFixed(0) + '%';
    $('o-rot').textContent = st.rot.toFixed(1) + '°';
    $('o-fs1').textContent = $('fs1').value;
    $('o-fs2').textContent = $('fs2').value;
  }

  function syncControls() {
    $('scale').value = st.scale; $('px').value = st.x; $('py').value = st.y;
    $('rot').value = st.rot; $('flip').checked = st.flip;
  }

  // --- 写真読み込み ---
  function loadPhoto(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { photo = img; resetPhoto(); URL.revokeObjectURL(url); };
    img.onerror = () => { alert('画像を読み込めませんでした。'); URL.revokeObjectURL(url); };
    img.src = url;
  }
  function resetPhoto() {
    Object.assign(st, { scale: 1, x: 0, y: 0, rot: 0, flip: false });
    syncControls(); render();
  }

  $('file').addEventListener('change', e => loadPhoto(e.target.files[0]));
  $('reset').addEventListener('click', resetPhoto);
  $('clear').addEventListener('click', () => { photo = null; $('file').value = ''; render(); });
  $('scale').addEventListener('input', e => { st.scale = +e.target.value; render(); });
  $('px').addEventListener('input', e => { st.x = +e.target.value; render(); });
  $('py').addEventListener('input', e => { st.y = +e.target.value; render(); });
  $('rot').addEventListener('input', e => { st.rot = +e.target.value; render(); });
  $('flip').addEventListener('change', e => { st.flip = e.target.checked; render(); });
  ids.forEach(id => $(id).addEventListener('input', render));

  // --- キャンバス上のドラッグ / ホイール ---
  const toCanvas = e => {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  };
  const inFrame = p => p.x >= FRAME.x && p.x <= FRAME.x + FRAME.w && p.y >= FRAME.y && p.y <= FRAME.y + FRAME.h;
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    const p = toCanvas(e);
    if (!photo || !inFrame(p)) return;
    drag = { p, x: st.x, y: st.y };
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    const p = toCanvas(e);
    cv.style.cursor = photo && (drag || inFrame(p)) ? 'move' : 'default';
    if (!drag) return;
    st.x = Math.max(-100, Math.min(100, drag.x + (p.x - drag.p.x) / FRAME.w * 100));
    st.y = Math.max(-100, Math.min(100, drag.y + (p.y - drag.p.y) / FRAME.h * 100));
    syncControls(); render();
  });
  const endDrag = () => { drag = null; };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', e => {
    if (!photo || !inFrame(toCanvas(e))) return;
    e.preventDefault();
    st.scale = Math.max(0.2, Math.min(5, st.scale * Math.exp(-e.deltaY * 0.001)));
    syncControls(); render();
  }, { passive: false });

  // --- 保存 ---
  $('download').addEventListener('click', () => {
    cv.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'aogiri-student-card.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  });

  // --- テンプレート画像: SHA-256 検証 ---
  function sha256Fallback(bytes) {
    const K = new Uint32Array(64);
    for (let i = 0, n = 2, c = 0; c < 64; n++) {
      let p = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
      if (p) { K[c++] = Math.floor((Math.cbrt(n) % 1) * 2 ** 32); }
    }
    const H0 = new Uint32Array(8);
    for (let i = 0, n = 2, c = 0; c < 8; n++) {
      let p = true;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
      if (p) { H0[c++] = Math.floor((Math.sqrt(n) % 1) * 2 ** 32); }
    }
    const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6;
    const buf = new Uint8Array(total);
    buf.set(bytes); buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(len / 2 ** 29));
    dv.setUint32(total - 4, (len << 3) >>> 0);
    const w = new Uint32Array(64), h = H0.slice();
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }
    return Array.from(h, x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  async function sha256Hex(buffer) {
    if (window.crypto && crypto.subtle) {
      const d = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join('');
    }
    return sha256Fallback(new Uint8Array(buffer));
  }

  // --- テンプレート画像: ブラウザ内保存 (IndexedDB) ---
  const DB_NAME = 'aogiri-card-gen', STORE = 'kv', KEY = 'template';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbOp(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => { db.close(); res(req.result); };
      t.onerror = t.onabort = () => { db.close(); rej(t.error); };
    });
  }
  const saveTemplate = buf => idbOp('readwrite', s => s.put(buf, KEY)).catch(() => {});
  const loadSavedTemplate = () => idbOp('readonly', s => s.get(KEY)).catch(() => null);
  const forgetTemplate = () => idbOp('readwrite', s => s.delete(KEY)).catch(() => {});

  function setStatus(msg, cls) {
    const s = $('tpl-status');
    s.textContent = msg;
    s.className = 'status' + (cls ? ' ' + cls : '');
  }

  function decodeImage(buffer) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }));
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }

  // 検証に通ったときだけテンプレートとして採用する
  async function acceptTemplate(buffer, { save, label }) {
    const hex = await sha256Hex(buffer);
    if (hex !== EXPECTED_SHA256) {
      setStatus('テンプレート画像が一致しません（SHA-256 不一致）。配布元の image-web.jpg をそのまま選択してください。\n' +
        '期待: ' + EXPECTED_SHA256 + '\n実際: ' + hex, 'ng');
      $('tpl-status').style.whiteSpace = 'pre-wrap';
      return false;
    }
    let img;
    try { img = await decodeImage(buffer); }
    catch { setStatus('画像を読み込めませんでした。', 'ng'); return false; }
    tpl = img;
    $('tpl-status').style.whiteSpace = '';
    setStatus('✔ テンプレート読み込み済み（SHA-256 検証OK）' + (label ? ' - ' + label : ''), 'ok');
    if (save && $('tpl-remember').checked) await saveTemplate(buffer);
    render();
    return true;
  }

  async function handleTemplateFile(file) {
    if (!file) return;
    setStatus('検証中…');
    await acceptTemplate(await file.arrayBuffer(), { save: true, label: file.name });
  }

  $('tpl-file').addEventListener('change', e => handleTemplateFile(e.target.files[0]));
  $('tpl-forget').addEventListener('click', async () => {
    await forgetTemplate();
    tpl = null; $('tpl-file').value = '';
    setStatus('未読み込み（保存したテンプレートを削除しました）');
    render();
  });

  // プレビューへのドラッグ＆ドロップ
  ['dragenter', 'dragover'].forEach(t => cv.addEventListener(t, e => { e.preventDefault(); cv.classList.add('drop'); }));
  ['dragleave', 'drop'].forEach(t => cv.addEventListener(t, e => { e.preventDefault(); cv.classList.remove('drop'); }));
  cv.addEventListener('drop', e => handleTemplateFile(e.dataTransfer.files[0]));

  render();
  loadSavedTemplate().then(buf => {
    if (buf) acceptTemplate(buf, { save: false, label: '保存済み' });
  });
  // フォント読み込み後に再描画
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
