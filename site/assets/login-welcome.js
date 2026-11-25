(() => {
  const audio = new Audio('assets/welcome-zh.mp3');
  audio.preload = 'auto';
  let onLogin = false, playing = false, pending = false, generation = 0;
  async function play() {
    if (!onLogin || playing || pending || document.hidden) return;
    const current = generation;
    pending = true;
    try {
      await audio.play();
      if (current === generation) playing = true;
    } catch {
      // A restricted browser can unlock sound during ordinary form interaction.
    } finally {
      if (current === generation) pending = false;
    }
  }
  function enter(view) {
    if (onLogin === (view === 'login')) return;
    onLogin = view === 'login';
    generation++;
    pending = playing = false;
    if (onLogin) play();
    else { audio.pause(); audio.currentTime = 0; }
  }
  window.addEventListener('dxx:hubview', e => enter(e.detail.view));
  document.addEventListener('visibilitychange', play);
  for (const type of ['click','keydown','touchend']) {
    document.addEventListener(type, event => { if (event.isTrusted) play(); }, true);
  }
  window.addEventListener('pageshow', () => enter(document.body.dataset.hubView));
  window.addEventListener('pagehide', () => enter(''));
  enter(document.body.dataset.hubView);
})();