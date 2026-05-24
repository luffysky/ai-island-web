INFO  🛠️ building image | #10 1.642    ▲ Next.js 15.5.18

INFO  🛠️ building image | #10 1.642 

INFO  🛠️ building image | #10 1.844    Creating an optimized production build ...

INFO  🛠️ building image | #10 44.28 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (131kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)

INFO  🛠️ building image | #10 61.77  ✓ Compiled successfully in 55s

INFO  🛠️ building image | #10 61.78    Linting and checking validity of types ...

INFO  🛠️ building image | #10 87.97 Failed to compile.

INFO  🛠️ building image | #10 87.97 

INFO  🛠️ building image | #10 87.97 ./src/app/api/line-webhook-user/route.ts:183:12

INFO  🛠️ building image | #10 87.97 Type error: Property 'catch' does not exist on type 'PostgrestFilterBuilder<any, any, any, null, "error_logs", unknown, "POST">'. Did you mean 'match'?

INFO  🛠️ building image | #10 87.97 

INFO  🛠️ building image | #10 87.97   181 |           message: `ticket insert failed: ${ticketErr.message}`,

INFO  🛠️ building image | #10 87.97   182 |           meta: { line_user_id: userId, text: text.slice(0, 200) },

INFO  🛠️ building image | #10 87.97 > 183 |         }).catch(() => {});

INFO  🛠️ building image | #10 87.97       |            ^

INFO  🛠️ building image | #10 87.97   184 |       }

INFO  🛠️ building image | #10 87.97   185 |

INFO  🛠️ building image | #10 87.97   186 |       // ticket_messages 寫一筆

INFO  🛠️ building image | #10 88.08 Next.js build worker exited with code: 1 and signal: null

INFO  🛠️ building image | #10 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1

INFO  🛠️ building image | ------

INFO  🛠️ building image |  > [6/6] RUN npm run build:

INFO  🛠️ building image | 87.97 Type error: Property 'catch' does not exist on type 'PostgrestFilterBuilder<any, any, any, null, "error_logs", unknown, "POST">'. Did you mean 'match'?

INFO  🛠️ building image | 87.97 

INFO  🛠️ building image | 87.97   181 |           message: `ticket insert failed: ${ticketErr.message}`,

INFO  🛠️ building image | 87.97   182 |           meta: { line_user_id: userId, text: text.slice(0, 200) },

INFO  🛠️ building image | 87.97 > 183 |         }).catch(() => {});

INFO  🛠️ building image | 87.97       |            ^

INFO  🛠️ building image | 87.97   184 |       }

INFO  🛠️ building image | 87.97   185 |

INFO  🛠️ building image | 87.97   186 |       // ticket_messages 寫一筆

INFO  🛠️ building image | 88.08 Next.js build worker exited with code: 1 and signal: null

INFO  🛠️ building image | ------

ERROR 🔴 build failed err=build image: build failed: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1