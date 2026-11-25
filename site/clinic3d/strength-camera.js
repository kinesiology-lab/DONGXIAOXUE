import {MathUtils, Spherical, Vector3} from 'three';

// Follow the examined foot. Once the learner orbits, only translate the pivot
// with the limb; never overwrite the learner's angle or zoom during the trial.
export function createStrengthCamera(camera, controls, canvas, toolbar) {
  const saved = {};
  for (const key of ['minDistance', 'maxDistance', 'minPolarAngle', 'maxPolarAngle', 'enableDamping', 'rotateSpeed']) {
    saved[key] = controls[key];
  }
  const manualOffset = new Vector3();
  const spherical = new Spherical();
  let view, manual = false;
  let currentAim;

  function startOrbit() {
    if (view === 'third' && controls.enabled) {
      manual = true;
      remember();
    }
  }
  function remember() {
    if (manual && view === 'third' && controls.enabled) {
      manualOffset.copy(camera.position).sub(controls.target);
    }
  }
  controls.addEventListener('start', startOrbit);
  controls.addEventListener('change', remember);

  function move(action) {
    if (view !== 'third' || !currentAim) return;
    if (action === 'reset') {
      manual = false;
      camera.position.copy(currentAim.eye);
    } else {
      remember();
      spherical.setFromVector3(camera.position.clone().sub(controls.target));
      const step = Math.PI / 6;
      if (action === 'left') spherical.theta -= step;
      if (action === 'right') spherical.theta += step;
      if (action === 'up') spherical.phi -= step / 2;
      if (action === 'down') spherical.phi += step / 2;
      spherical.phi = MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      manual = true;
      manualOffset.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(manualOffset);
    }
    controls.update();
  }
  function click(event) {
    const action = event.target.closest('[data-orbit]')?.dataset.orbit;
    if (action) move(action);
  }
  function keydown(event) {
    const action = {ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down', Home:'reset'}[event.key];
    if (view === 'third' && action) {
      event.preventDefault();
      move(action);
    }
  }
  toolbar.addEventListener('click', click);
  canvas.addEventListener('keydown', keydown);
  const dialogue = document.getElementById('conversation');
  function positionBar() {
    if (!canvas.offsetParent) return;
    const base = canvas.offsetTop + canvas.clientHeight;
    const dialogueTop = dialogue.getBoundingClientRect().top - canvas.offsetParent.getBoundingClientRect().top;
    toolbar.style.left = (canvas.offsetLeft + canvas.clientWidth / 2) + 'px';
    toolbar.style.top = (Math.min(base, dialogueTop > canvas.offsetTop && !dialogue.hidden ? dialogueTop : base) - 5) + 'px';
  }
  const resize = new ResizeObserver(positionBar);
  resize.observe(canvas);
  resize.observe(dialogue);

  return {
    aim(newView, aim) {
      const changed = newView !== view;
      view = newView;
      currentAim = aim;
      const third = view === 'third';
      toolbar.hidden = !third;
      canvas.classList.toggle('orbit-foot', third);
      controls.enabled = third;
      controls.enableDamping = false;
      controls.minDistance = .36;
      controls.maxDistance = 1.9;
      controls.minPolarAngle = .10;
      controls.maxPolarAngle = Math.PI * .53;
      controls.rotateSpeed = .68;
      controls.target.copy(aim.target);
      if (third && manual) camera.position.copy(aim.target).add(manualOffset);
      else camera.position.copy(aim.eye);
      if (third) controls.update();
      else camera.lookAt(aim.target);
      if (changed) positionBar();
    },
    close() {
      resize.disconnect();
      toolbar.hidden = true;
      canvas.classList.remove('orbit-foot');
      canvas.removeEventListener('keydown', keydown);
      toolbar.removeEventListener('click', click);
      controls.removeEventListener('start', startOrbit);
      controls.removeEventListener('change', remember);
      Object.assign(controls, saved);
    }
  };
}
