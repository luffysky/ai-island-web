import type { Chapter } from "@/lib/types";

import ch01 from "./chapters/ch01.json";
import ch02 from "./chapters/ch02.json";
import ch03 from "./chapters/ch03.json";
import ch04 from "./chapters/ch04.json";
import ch05 from "./chapters/ch05.json";
import ch06 from "./chapters/ch06.json";
import ch07 from "./chapters/ch07.json";
import ch08 from "./chapters/ch08.json";
import ch09 from "./chapters/ch09.json";
import ch10 from "./chapters/ch10.json";
import ch11 from "./chapters/ch11.json";
import ch12 from "./chapters/ch12.json";
import ch13 from "./chapters/ch13.json";
import ch14 from "./chapters/ch14.json";
import ch15 from "./chapters/ch15.json";
import ch16 from "./chapters/ch16.json";
import ch17 from "./chapters/ch17.json";
import ch18 from "./chapters/ch18.json";
import ch19 from "./chapters/ch19.json";
import ch20 from "./chapters/ch20.json";
import ch21 from "./chapters/ch21.json";
import ch22 from "./chapters/ch22.json";
import ch23 from "./chapters/ch23.json";
import ch24 from "./chapters/ch24.json";
import ch25 from "./chapters/ch25.json";
import ch26 from "./chapters/ch26.json";
import ch27 from "./chapters/ch27.json";
import ch28 from "./chapters/ch28.json";
import ch29 from "./chapters/ch29.json";
import ch30 from "./chapters/ch30.json";
import ch31 from "./chapters/ch31.json";
import ch32 from "./chapters/ch32.json";
import ch33 from "./chapters/ch33.json";
import ch34 from "./chapters/ch34.json";
import ch35 from "./chapters/ch35.json";
import ch36 from "./chapters/ch36.json";
import ch37 from "./chapters/ch37.json";
import ch38 from "./chapters/ch38.json";
import ch39 from "./chapters/ch39.json";
import ch40 from "./chapters/ch40.json";
import ch41 from "./chapters/ch41.json";
import ch42 from "./chapters/ch42.json";
import ch43 from "./chapters/ch43.json";
import ch44 from "./chapters/ch44.json";
import ch45 from "./chapters/ch45.json";
import ch46 from "./chapters/ch46.json";
import ch47 from "./chapters/ch47.json";
import ch48 from "./chapters/ch48.json";
import ch49 from "./chapters/ch49.json";
import ch50 from "./chapters/ch50.json";
import ch51 from "./chapters/ch51.json";
import ch52 from "./chapters/ch52.json";
import ch53 from "./chapters/ch53.json";
import ch54 from "./chapters/ch54.json";
import ch55 from "./chapters/ch55.json";
import ch56 from "./chapters/ch56.json";
import ch57 from "./chapters/ch57.json";
import ch58 from "./chapters/ch58.json";
import ch59 from "./chapters/ch59.json";
import ch60 from "./chapters/ch60.json";
import ch61 from "./chapters/ch61.json";
import ch62 from "./chapters/ch62.json";
import ch63 from "./chapters/ch63.json";
import ch64 from "./chapters/ch64.json";
import ch65 from "./chapters/ch65.json";
import ch66 from "./chapters/ch66.json";
import ch67 from "./chapters/ch67.json";
import ch68 from "./chapters/ch68.json";
import ch69 from "./chapters/ch69.json";
import ch70 from "./chapters/ch70.json";

export const chapters: Chapter[] = [
  ch01 as unknown as Chapter,
  ch02 as unknown as Chapter,
  ch03 as unknown as Chapter,
  ch04 as unknown as Chapter,
  ch05 as unknown as Chapter,
  ch06 as unknown as Chapter,
  ch07 as unknown as Chapter,
  ch08 as unknown as Chapter,
  ch09 as unknown as Chapter,
  ch10 as unknown as Chapter,
  ch11 as unknown as Chapter,
  ch12 as unknown as Chapter,
  ch13 as unknown as Chapter,
  ch14 as unknown as Chapter,
  ch15 as unknown as Chapter,
  ch16 as unknown as Chapter,
  ch17 as unknown as Chapter,
  ch18 as unknown as Chapter,
  ch19 as unknown as Chapter,
  ch20 as unknown as Chapter,
  ch21 as unknown as Chapter,
  ch22 as unknown as Chapter,
  ch23 as unknown as Chapter,
  ch24 as unknown as Chapter,
  ch25 as unknown as Chapter,
  ch26 as unknown as Chapter,
  ch27 as unknown as Chapter,
  ch28 as unknown as Chapter,
  ch29 as unknown as Chapter,
  ch30 as unknown as Chapter,
  ch31 as unknown as Chapter,
  ch32 as unknown as Chapter,
  ch33 as unknown as Chapter,
  ch34 as unknown as Chapter,
  ch35 as unknown as Chapter,
  ch36 as unknown as Chapter,
  ch37 as unknown as Chapter,
  ch38 as unknown as Chapter,
  ch39 as unknown as Chapter,
  ch40 as unknown as Chapter,
  ch41 as unknown as Chapter,
  ch42 as unknown as Chapter,
  ch43 as unknown as Chapter,
  ch44 as unknown as Chapter,
  ch45 as unknown as Chapter,
  ch46 as unknown as Chapter,
  ch47 as unknown as Chapter,
  ch48 as unknown as Chapter,
  ch49 as unknown as Chapter,
  ch50 as unknown as Chapter,
  ch51 as unknown as Chapter,
  ch52 as unknown as Chapter,
  ch53 as unknown as Chapter,
  ch54 as unknown as Chapter,
  ch55 as unknown as Chapter,
  ch56 as unknown as Chapter,
  ch57 as unknown as Chapter,
  ch58 as unknown as Chapter,
  ch59 as unknown as Chapter,
  ch60 as unknown as Chapter,
  ch61 as unknown as Chapter,
  ch62 as unknown as Chapter,
  ch63 as unknown as Chapter,
  ch64 as unknown as Chapter,
  ch65 as unknown as Chapter,
  ch66 as unknown as Chapter,
  ch67 as unknown as Chapter,
  ch68 as unknown as Chapter,
  ch69 as unknown as Chapter,
  ch70 as unknown as Chapter,
];

export function getChapter(id: number): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}