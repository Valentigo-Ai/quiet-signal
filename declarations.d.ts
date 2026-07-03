// Ambient module declarations for static image assets so TypeScript doesn't
// complain about `require("*.jpg")` calls (e.g. in ScreenBackground usage).
// Metro/Babel handle these at bundle time regardless of TS - this file only
// satisfies the type checker.
declare module "*.png" {
  const value: number;
  export default value;
}
declare module "*.jpg" {
  const value: number;
  export default value;
}
declare module "*.jpeg" {
  const value: number;
  export default value;
}
