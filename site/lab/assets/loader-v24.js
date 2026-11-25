(async () => {
  'use strict';
  const status = window.DXX_DEPLOY_DIAGNOSTICS = {state: 'loading', checks: []};
  async function fetchAsset(url, format) {
    const response = await fetch(url);
    if (!response.ok) throw Error('解剖资源未加载 ' + url);
    return response[format]();
  }
  try {
    const [data, manifest, connective, supplement] = await Promise.all([
      fetchAsset('assets/app-data.json?v=76', 'json'),
      fetchAsset('../assembly/assets/geometry-manifest.json', 'json'),
      fetchAsset('assets/connective.json?v=76', 'json'),
      fetchAsset('assets/connective.bin?v=76', 'arrayBuffer')
    ]);
    if (supplement.byteLength !== connective.bytes) throw Error('结缔组织模型不完整');
    const raw = new Uint8Array(manifest.bytes + connective.bytes);
    await Promise.all(manifest.chunks.map(async chunk => {
      raw.set(new Uint8Array(await fetchAsset('../assembly/' + chunk.path, 'arrayBuffer')), chunk.offset);
    }));
    raw.set(new Uint8Array(supplement), manifest.bytes);
    for (const part of connective.parts) {
      for (const field of ['positions', 'normals', 'indices']) part[field] += manifest.bytes;
      data.anatomy.model.parts.push(part);
    }
    data.anatomy.raw = raw.buffer;
    data.native.raw = data.actor.raw = new ArrayBuffer(0);
    window.__DXX_DATA__ = data;
    window.DXX_ENABLE_CLASSROOM_SERVICE = false;
    for (const file of ['joint-landmarks-v30.js', 'joint-rig-v30.js', 'motion-muscles-v76.js', 'joint-surface.js', 'app.js']) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'assets/' + file + '?v=79.2';
        script.onload = resolve;
        script.onerror = () => reject(Error(file));
        document.body.append(script);
      });
    }
    if (!window.App) throw Error('实验运行程序未初始化');
    status.state = 'ready';
    status.checks.push('attributed geometry and connective tissue loaded');
    document.body.classList.remove('dxx-loading');
    document.getElementById('dxxBoot')?.remove();
    window.dispatchEvent(new Event('dxx:lab-ready'));
  } catch (error) {
    status.state = 'error';
    status.error = String(error);
    const message = document.getElementById('dxxBootError');
    message.hidden = false;
    message.textContent = '未能加载：' + error.message;
    document.getElementById('dxxBootRetry').hidden = false;
    document.getElementById('dxxBootRetry').onclick = () => location.reload();
    console.error(error);
  }
})();
