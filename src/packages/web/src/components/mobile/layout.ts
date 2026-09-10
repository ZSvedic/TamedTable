// #MobileShell: the fixed-chrome dimensions the document-scroll layout
// shares: the shell pads its flowing content by these, the app bar and dock
// are sized by them, and the table's sticky header offsets below the app bar.
export const APPBAR_H = 46;
export const DOCK_H = 80;

/** Height of the fixed app bar including the iOS notch: the offset sticky
 *  headers and the content's top padding must clear. */
export const APPBAR_OFFSET = `calc(${APPBAR_H}px + env(safe-area-inset-top))`;

/** Bottom padding that keeps the last table row clear of the fixed dock. */
export const DOCK_OFFSET = `calc(${DOCK_H}px + env(safe-area-inset-bottom))`;

/** #LoadSuggestions: the chip strip above the dock, one scrolling row, tall
 *  enough that a chip is not pinned against the table edge above it. The
 *  shell pads its content by this too while the strip shows. */
export const SUGGEST_STRIP_H = 54;
