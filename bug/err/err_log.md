INFO  🛠️ building image | #10 1.251    ▲ Next.js 15.5.18

INFO  🛠️ building image | #10 1.251 

INFO  🛠️ building image | #10 1.437    Creating an optimized production build ...

INFO  🛠️ building image | #10 39.22 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (131kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)

INFO  🛠️ building image | #10 55.96  ✓ Compiled successfully in 50s

INFO  🛠️ building image | #10 55.96    Linting and checking validity of types ...

INFO  🛠️ building image | #10 80.58 Failed to compile.

INFO  🛠️ building image | #10 80.58 

INFO  🛠️ building image | #10 80.58 ./src/app/llms.txt/route.ts:64:24

INFO  🛠️ building image | #10 80.58 Type error: Property 'title' does not exist on type 'Dungeon'.

INFO  🛠️ building image | #10 80.58 

INFO  🛠️ building image | #10 80.58   62 |   lines.push("");

INFO  🛠️ building image | #10 80.58   63 |   for (const d of DUNGEONS) {

INFO  🛠️ building image | #10 80.58 > 64 |     lines.push(`- [${d.title}](${SITE_URL}/courses/${d.slug})${d.subtitle ? ` — ${d.subtitle}` : ""}`);

INFO  🛠️ building image | #10 80.58      |                        ^

INFO  🛠️ building image | #10 80.58   65 |   }

INFO  🛠️ building image | #10 80.58   66 |   lines.push("");

INFO  🛠️ building image | #10 80.58   67 |

INFO  🛠️ building image | #10 80.68 Next.js build worker exited with code: 1 and signal: null

INFO  🛠️ building image | #10 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

INFO  🛠️ building image | ------

INFO  🛠️ building image |  > [6/6] RUN npm run build:

INFO  🛠️ building image | 80.58 Type error: Property 'title' does not exist on type 'Dungeon'.

INFO  🛠️ building image | 80.58 

INFO  🛠️ building image | 80.58   62 |   lines.push("");

INFO  🛠️ building image | 80.58   63 |   for (const d of DUNGEONS) {

INFO  🛠️ building image | 80.58 > 64 |     lines.push(`- [${d.title}](${SITE_URL}/courses/${d.slug})${d.subtitle ? ` — ${d.subtitle}` : ""}`);

INFO  🛠️ building image | 80.58      |                        ^

INFO  🛠️ building image | 80.58   65 |   }

INFO  🛠️ building image | 80.58   66 |   lines.push("");

INFO  🛠️ building image | 80.58   67 |

INFO  🛠️ building image | 80.68 Next.js build worker exited with code: 1 and signal: null

INFO  🛠️ building image | ------

ERROR 🔴 build failed err=build image: build failed: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1