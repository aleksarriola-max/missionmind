// Spread onto a non-button element that behaves like a button so keyboard
// users can activate it (Enter/Space) and assistive tech announces it as a
// control. Use for clickable <div> cards/rows/cells where a real <button>
// would fight the surrounding layout/styling.
export function clickable(onActivate) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate(e);
      }
    },
  };
}
