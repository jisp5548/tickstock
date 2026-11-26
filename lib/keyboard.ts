/** True while the user is typing into a field, when single-key shortcuts must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** A bare key press (no ⌘/Ctrl/Alt) outside of text fields. */
export function isPlainShortcut(event: KeyboardEvent): boolean {
  return !isTypingTarget(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey;
}
