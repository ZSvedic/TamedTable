// Image imports resolve to a URL string under both bundlers this package is
// built with (bun build for the demo page, vite for the web app).
declare module '*.png' {
  const url: string;
  export default url;
}
