// #GherkinTour
// `./ui` does a side-effect import of `driver.js/dist/driver.css` so the
// spotlight is styled when bundled (bun build emits it as a CSS asset). The web
// app gets this declaration from `vite/client`; the package compiles under the
// repo-root tsconfig, which has no bundler client types, so declare it here.
declare module '*.css';
