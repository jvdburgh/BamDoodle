/**
 * A story's `beforeEach`: links don't navigate away from the story (a logo that didn't ask before leaving would take
 * the test run with it). Returns the cleanup.
 */
export function stayOnTheStory(): () => void {
  const stay = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
  };
  document.addEventListener("click", stay, true);
  return () => document.removeEventListener("click", stay, true);
}
