import '@testing-library/jest-dom/vitest';

// jsdom does not implement layout, so every getBoundingClientRect() reports a 0x0 box.
// react-chessboard@5 animates piece movement on a position change and throws
// "Square width not found" when the measured square width is 0. Reporting a nonzero
// width makes jsdom behave enough like a browser for that animation effect. This is an
// environment shim (jsdom lacks layout), not a mock of our own code.
if (!HTMLElement.prototype.getBoundingClientRect.toString().includes('SHIMMED')) {
  HTMLElement.prototype.getBoundingClientRect = function SHIMMED(): DOMRect {
    return {
      width: 360,
      height: 360,
      top: 0,
      left: 0,
      right: 360,
      bottom: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };
}
