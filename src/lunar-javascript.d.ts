// lunar-javascript 無官方型別；以 any 宣告（八字排盤用，見 src/lib/bazi.ts）。
declare module "lunar-javascript" {
  const lib: any;
  export default lib;
  export const Solar: any;
  export const Lunar: any;
}
