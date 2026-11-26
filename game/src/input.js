// Keyboard and mouse state, kept as one plain object the world reads each step.
// Arrow keys / WASD pitch and bank, Shift throttles up, Ctrl or S throttles down,
// Space is the airbrake, P pauses, R restarts, Enter starts. The mouse steers too:
// pointer height sets target pitch, pointer left/right sets bank.
export const KEYS = {
  pitchUp: ['ArrowUp', 'KeyW'],
  pitchDown: ['ArrowDown', 'KeyS'],
  bankLeft: ['ArrowLeft', 'KeyA'],
  bankRight: ['ArrowRight', 'KeyD'],
  throttleUp: ['ShiftLeft', 'ShiftRight'],
  throttleDown: ['ControlLeft', 'ControlRight'],
  brake: ['Space'],
  pause: ['KeyP'],
  restart: ['KeyR'],
  start: ['Enter'],
  mute: ['KeyM'],
};

export function createInput() {
  return {
    held: new Set(),
    mouseX: 0.5,
    mouseY: 0.5,
    mouseActive: false,
    pressed: new Set(),
    clicked: false,
  };
}

export function attachInput(input, element) {
  const down = (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    input.held.add(event.code);
    input.pressed.add(event.code);
  };
  const up = (event) => input.held.delete(event.code);
  const blur = () => input.held.clear();
  const move = (event) => {
    const rect = element.getBoundingClientRect();
    input.mouseX = (event.clientX - rect.left) / rect.width;
    input.mouseY = (event.clientY - rect.top) / rect.height;
    input.mouseActive = true;
  };
  const click = () => {
    input.clicked = true;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerdown', click);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', blur);
    element.removeEventListener('pointermove', move);
    element.removeEventListener('pointerdown', click);
  };
}

export function isHeld(input, action) {
  return KEYS[action].some((code) => input.held.has(code));
}

export function wasPressed(input, action) {
  return KEYS[action].some((code) => input.pressed.has(code));
}

export function endFrame(input) {
  input.pressed.clear();
  input.clicked = false;
}
