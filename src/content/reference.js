/* ============================================================================
   Leitura do criativo: transforma o anúncio de referência em imagens que dá
   para anexar num chat.

   Vídeo vira frames — quatro nos primeiros segundos, porque é ali que mora o
   gancho, e o resto distribuído até o fim. Imagem vira ela mesma, reduzida.
   Tudo local: o fbcdn é buscado com a permissão de host da extensão, o vídeo
   entra num blob (canvas não contamina) e nada sai do navegador.
   ========================================================================== */
window.ALC = window.ALC || {};

ALC.reference = (function () {
  const MAX_W = 720;             // frame maior que isso não acrescenta leitura
  const AUDIO_NAME = 'audio.wav';
  const JPEG_Q = 0.72;

  /** Momentos a capturar: o gancho denso, depois o resto espalhado. */
  function timeline(duration, n) {
    const d = Math.max(1, duration || 1);
    const cabeca = [0, 1, 2, 3].filter((t) => t < d).slice(0, Math.min(4, n));
    const restam = n - cabeca.length;
    if (restam <= 0) return cabeca;
    const ini = cabeca.length ? cabeca[cabeca.length - 1] + 1 : 0;
    const fim = Math.max(ini, d - 0.3);
    const passo = restam > 1 ? (fim - ini) / (restam - 1) : 0;
    const cauda = [];
    for (let i = 0; i < restam; i++) cauda.push(Math.min(fim, ini + passo * i));
    return cabeca.concat(cauda).map((t) => Math.round(t * 10) / 10);
  }

  function draw(video, w, h) {
    const escala = Math.min(1, MAX_W / (w || MAX_W));
    const cv = document.createElement('canvas');
    cv.width = Math.round((w || MAX_W) * escala);
    cv.height = Math.round((h || MAX_W) * escala);
    cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', JPEG_Q);
  }

  const seek = (v, t) => new Promise((resolve) => {
    let pronto = false;
    const done = () => { if (!pronto) { pronto = true; resolve(); } };
    v.addEventListener('seeked', done, { once: true });
    v.currentTime = t;
    setTimeout(done, 4000);                 // frame preso não trava o fluxo
  });

  /* WAV mono 16 kHz: o menor arquivo que qualquer chat que aceite áudio abre sem
     plugin, e o formato que todo transcritor prefere. Estéreo 48 kHz do original
     seria 12x maior sem acrescentar nada — fala não precisa de mais que isso. */
  const AUDIO_HZ = 16000;

  function wavDe(mono) {
    const d = mono.getChannelData(0);
    const n = d.length;
    const ab = new ArrayBuffer(44 + n * 2);
    const dv = new DataView(ab);
    const txt = (off, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(off + i, str.charCodeAt(i)); };
    txt(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE');
    txt(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, AUDIO_HZ, true); dv.setUint32(28, AUDIO_HZ * 2, true);
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
    txt(36, 'data'); dv.setUint32(40, n * 2, true);
    let o = 44;
    for (let i = 0; i < n; i++) {
      const v = Math.max(-1, Math.min(1, d[i]));
      dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
    return new Blob([ab], { type: 'audio/wav' });
  }

  /** Devolve o .wav da fala, ou null quando o vídeo é mudo ou não decodifica. */
  async function extrairAudio(arrayBuffer) {
    let ctx = null;
    try {
      ctx = new AudioContext();
      const audio = await ctx.decodeAudioData(arrayBuffer);
      const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * AUDIO_HZ)), AUDIO_HZ);
      const src = off.createBufferSource();
      src.buffer = audio;
      src.connect(off.destination);
      src.start();
      const mono = await off.startRendering();
      /* Criativo sem locução existe: não vale ocupar 2 MB do zip com silêncio. */
      const d = mono.getChannelData(0);
      let pico = 0;
      for (let i = 0; i < d.length; i += 997) pico = Math.max(pico, Math.abs(d[i]));
      if (pico < 0.01) return null;
      return wavDe(mono);
    } catch (_) {
      return null;
    } finally {
      if (ctx) ctx.close();
    }
  }

  /* O ajuste do usuário cobre um criativo curto. Passando de 30s, cada meio
     minuto extra pede mais um frame — senão sobram três imagens para um minuto
     inteiro de vídeo. Teto de 12 porque é o que os chats aceitam por mensagem. */
  function quantosFrames(base, duration) {
    const extra = Math.floor(Math.max(0, (duration || 0) - 30) / 20);
    return Math.max(4, Math.min(12, base + extra));
  }

  /** Frames de um vídeo, em ordem. */
  async function fromVideo(url, n, onStep) {
    const bytes = await (await fetch(url)).arrayBuffer();
    const objeto = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = objeto;
    try {
      await new Promise((resolve, reject) => {
        v.addEventListener('loadeddata', resolve, { once: true });
        v.addEventListener('error', () => reject(new Error('vídeo não pôde ser lido')), { once: true });
        setTimeout(() => reject(new Error('tempo esgotado ao abrir o vídeo')), 20000);
      });
      const duracao = isFinite(v.duration) ? v.duration : 0;
      const tempos = timeline(duracao, quantosFrames(n, duracao));
      const out = [];
      for (let i = 0; i < tempos.length; i++) {
        if (onStep) onStep(i + 1, tempos.length);
        await seek(v, tempos[i]);
        out.push({ dataUrl: draw(v, v.videoWidth, v.videoHeight), seconds: tempos[i],
          w: v.videoWidth, h: v.videoHeight });
      }
      /* decodeAudioData consome o buffer que recebe: manda uma cópia. */
      const audio = ALC.settings.referenceAudio === false
        ? null : await extrairAudio(bytes.slice(0));
      return { kind: 'video', durationSec: Math.round(duracao), shots: out, audio };
    } finally {
      URL.revokeObjectURL(objeto);
    }
  }

  /** As imagens do próprio anúncio, reduzidas. */
  async function fromImages(creatives, n, onStep) {
    const alvos = creatives.filter((c) => c.type === 'image').slice(0, n);
    const out = [];
    for (let i = 0; i < alvos.length; i++) {
      if (onStep) onStep(i + 1, alvos.length);
      const blob = await (await fetch(alvos[i].url)).blob();
      const bmp = await createImageBitmap(blob);
      const escala = Math.min(1, MAX_W / bmp.width);
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * escala);
      cv.height = Math.round(bmp.height * escala);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      bmp.close();
      out.push({ dataUrl: cv.toDataURL('image/jpeg', JPEG_Q), seconds: null, w: bmp.width, h: bmp.height });
    }
    return { kind: 'image', durationSec: 0, shots: out, audio: null };
  }

  /** Extrai do melhor criativo disponível: vídeo tem prioridade. */
  async function capture(ad, n, onStep) {
    const cs = ad.creatives || [];
    const video = cs.find((c) => c.type === 'video' && !/^blob:/.test(c.url) && !c.note);
    if (video) return fromVideo(video.url, n, onStep);
    if (cs.some((c) => c.type === 'image')) return fromImages(cs, n, onStep);
    throw new Error('este anúncio não tem criativo que dê para ler');
  }

  /* Proporção do molde, no vocabulário que quem anuncia usa. Serve para o prompt
     de imagem pedir o formato certo em vez de chutar. */
  function proporcao(pacote) {
    const s = (pacote.shots || [])[0];
    if (!s || !s.w || !s.h) return '';
    const r = s.w / s.h;
    const tabela = [
      { nome: '9:16 (vertical de stories, 1080x1920)', v: 0.5625 },
      { nome: '4:5 (vertical de feed, 1080x1350)', v: 0.8 },
      { nome: '1:1 (quadrado, 1080x1080)', v: 1 },
      { nome: '16:9 (deitado, 1920x1080)', v: 1.7778 }
    ];
    return tabela.reduce((a, b) => Math.abs(b.v - r) < Math.abs(a.v - r) ? b : a).nome;
  }

  /** Prefixo que identifica o anúncio: nome do .zip e da pasta dentro dele. */
  function prefixo(ad) {
    return ALC.dom.slug(ad.advertiserName) + '_' + ad.libraryId;
  }

  /* Dentro do zip os arquivos já estão numa pasta com o nome do anúncio, então
     o nome pode ser curto: o que importa é a ordem, que é o que o prompt cita. */
  function nomes(pacote) {
    return pacote.shots.map((s, i) => ({
      name: String(i + 1).padStart(2, '0') +
        (s.seconds == null ? '' : '_' + String(s.seconds).replace('.', 'p') + 's') + '.jpg',
      seconds: s.seconds
    }));
  }

  /* ==========================================================================
     PDF: um frame por página.

     Nenhum chat descompacta .zip, e mosaico de frames numa imagem só perde
     legibilidade — os modelos reduzem a imagem para ~1568px no maior lado, e a
     legenda queimada some. Em PDF cada página é processada por conta própria,
     então o frame chega inteiro. E PDF os três leem nativamente.

     Escrito à mão: o JPEG entra como XObject /DCTDecode, sem recodificar e sem
     biblioteca nova no projeto.
     ========================================================================== */
  function jpegBytes(dataUrl) {
    const bin = atob(String(dataUrl).split(',')[1]);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function tamanhoJpeg(bytes) {
    for (let i = 2; i < bytes.length - 9;) {
      if (bytes[i] !== 0xFF) { i++; continue; }
      const marca = bytes[i + 1];
      if (marca >= 0xC0 && marca <= 0xCF && marca !== 0xC4 && marca !== 0xC8 && marca !== 0xCC) {
        return { h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8] };
      }
      i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
    }
    return { w: 720, h: 1280 };
  }

  const semAcento = (t) => String(t)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')      // Helvetica base não tem acento
    .replace(/[()\\]/g, ' ').replace(/[^\x20-\x7E]/g, ' ');

  function pdfDe(pacote, legendas) {
    const enc = new TextEncoder();
    const partes = [];
    const offsets = [];
    let tamanho = 0;
    const push = (dados) => {
      const b = typeof dados === 'string' ? enc.encode(dados) : dados;
      partes.push(b);
      tamanho += b.length;
    };
    const obj = (num, corpo, fluxo) => {
      offsets[num] = tamanho;
      push(num + ' 0 obj\n' + corpo + '\n');
      if (fluxo) { push('stream\n'); push(fluxo); push('\nendstream\n'); }
      push('endobj\n');
    };

    const n = pacote.shots.length;
    const idPagina = (i) => 3 + i * 3;          // página, conteúdo, imagem
    const kids = [];
    for (let i = 0; i < n; i++) kids.push(idPagina(i) + ' 0 R');

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');

    for (let i = 0; i < n; i++) {
      const bytes = jpegBytes(pacote.shots[i].dataUrl);
      const dim = tamanhoJpeg(bytes);
      const rotulo = semAcento(legendas[i] || '');
      const alturaPagina = dim.h + 28;                    // faixa branca para o rótulo
      const conteudo =
        'q ' + dim.w + ' 0 0 ' + dim.h + ' 0 0 cm /Im0 Do Q\n' +
        'BT /F1 13 Tf 8 ' + (dim.h + 9) + ' Td (' + rotulo + ') Tj ET';
      obj(idPagina(i),
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + dim.w + ' ' + alturaPagina + ']' +
        ' /Resources << /XObject << /Im0 ' + (idPagina(i) + 2) + ' 0 R >>' +
        ' /Font << /F1 ' + (3 + n * 3) + ' 0 R >> >>' +
        ' /Contents ' + (idPagina(i) + 1) + ' 0 R >>');
      obj(idPagina(i) + 1, '<< /Length ' + conteudo.length + ' >>', enc.encode(conteudo));
      obj(idPagina(i) + 2,
        '<< /Type /XObject /Subtype /Image /Width ' + dim.w + ' /Height ' + dim.h +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        bytes.length + ' >>', bytes);
    }
    obj(3 + n * 3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

    const total = 3 + n * 3 + 1;
    const inicioXref = tamanho;
    let xref = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
    for (let i = 1; i < total; i++) {
      xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
    }
    push(xref);
    push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + inicioXref + '\n%%EOF\n');
    return new Blob(partes, { type: 'application/pdf' });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('não foi possível ler o zip'));
      fr.readAsDataURL(blob);
    });
  }

  /** O .wav em base64, do jeito que o service worker manda para o Gemini. */
  async function audioBase64(pacote) {
    if (!pacote || !pacote.audio) return '';
    const url = await blobToDataUrl(pacote.audio);
    return String(url).split(',')[1] || '';
  }

  /** O PDF é o que vai para o chat: um arquivo, uma página por frame. */
  async function baixarPdf(ad, pacote) {
    const nome = prefixo(ad);
    const legendas = pacote.shots.map((sh, i) => sh.seconds == null
      ? 'Pagina ' + (i + 1) + ' de ' + pacote.shots.length + '  ·  imagem do anuncio'
      : 'Pagina ' + (i + 1) + ' de ' + pacote.shots.length + '  ·  segundo ' + sh.seconds);
    const blob = pdfDe(pacote, legendas);
    const destino = (ALC.settings.downloadFolder || 'Biblioteca Extrema').replace(/[\\/]+$/, '') +
      '/referencias/' + nome + '.pdf';
    const res = await ALC.send(ALC.MSG.DOWNLOAD_DATA, {
      dataUrl: await blobToDataUrl(blob), filename: destino, overwrite: true
    });
    if (!res.ok) throw new Error(res.error || 'download recusado');
    return { filename: destino, paginas: pacote.shots.length, mb: +(blob.size / 1048576).toFixed(2) };
  }

  /* Um arquivo só, com a pasta dentro: quem baixa recebe as imagens e o prompt
     juntos, em vez de nove downloads soltos caindo na pasta de Downloads. */
  async function baixarZip(ad, pacote, prompt) {
    const pasta = prefixo(ad);
    const arquivos = nomes(pacote);
    const destino = (ALC.settings.downloadFolder || 'Biblioteca Extrema').replace(/[\\/]+$/, '') +
      '/referencias/' + pasta + '.zip';

    if (typeof JSZip === 'undefined') {                    // reserva: soltos mesmo
      for (let i = 0; i < pacote.shots.length; i++) {
        await ALC.send(ALC.MSG.DOWNLOAD_DATA, {
          dataUrl: pacote.shots[i].dataUrl, overwrite: true,
          filename: destino.replace(/\.zip$/, '') + '/' + arquivos[i].name
        });
      }
      return { filename: destino.replace(/\.zip$/, ''), folder: pasta, files: arquivos, zipped: false };
    }

    const zip = new JSZip();
    const dir = zip.folder(pasta);
    pacote.shots.forEach((s, i) => {
      dir.file(arquivos[i].name, String(s.dataUrl).split(',')[1], { base64: true });
    });
    if (pacote.audio) dir.file(AUDIO_NAME, pacote.audio);
    if (prompt) dir.file('prompt.txt', prompt);
    const blob = await zip.generateAsync({ type: 'blob' });
    const res = await ALC.send(ALC.MSG.DOWNLOAD_DATA, {
      dataUrl: await blobToDataUrl(blob), filename: destino, overwrite: true
    });
    if (!res.ok) throw new Error(res.error || 'download recusado');
    return { filename: destino, folder: pasta, files: arquivos, zipped: true };
  }

  return { capture, baixarZip, baixarPdf, pdfDe, audioBase64, nomes, prefixo, proporcao,
    timeline, quantosFrames, AUDIO_NAME };
})();
