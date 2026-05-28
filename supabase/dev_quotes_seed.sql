-- 100 句經典程式 / 工程 / 創業 / Debug 名言、第一批 seed
-- 跑：在 Supabase SQL Editor 貼這檔執行、或本機 psql 跑
-- 之後擴展到 1000+：跑 scripts/_oneshot-seed-1000-quotes.mjs (用 Anthropic 生)

INSERT INTO public.dev_quotes (quote, author, translation_zh, category) VALUES
-- === 工程哲學 ===
('Premature optimization is the root of all evil.', 'Donald Knuth', '過早優化是萬惡之源。', 'engineering'),
('Programs must be written for people to read, and only incidentally for machines to execute.', 'Harold Abelson', '程式是寫給人看的、機器執行只是順帶。', 'engineering'),
('Walking on water and developing software from a specification are easy if both are frozen.', 'Edward V. Berard', '在水上行走跟照規格寫軟體都很容易—只要水跟規格都凍住。', 'engineering'),
('The best code is no code at all.', 'Jeff Atwood', '最好的程式碼就是不寫程式碼。', 'engineering'),
('Make it work, make it right, make it fast.', 'Kent Beck', '先讓它能跑、再讓它對、最後讓它快。', 'engineering'),
('Simple things should be simple, complex things should be possible.', 'Alan Kay', '簡單的事該簡單、複雜的事該可能。', 'engineering'),
('First, solve the problem. Then, write the code.', 'John Johnson', '先解決問題、再寫程式碼。', 'engineering'),
('There are only two hard things in Computer Science: cache invalidation and naming things.', 'Phil Karlton', '電腦科學只有兩件事真的難：快取失效跟取名字。', 'engineering'),
('Talk is cheap. Show me the code.', 'Linus Torvalds', '空話便宜、給我看程式碼。', 'engineering'),
('Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', 'Martin Fowler', '隨便誰都能寫電腦看得懂的 code、好工程師寫人類看得懂的。', 'engineering'),
('Code is like humor. When you have to explain it, it''s bad.', 'Cory House', 'Code 像笑話—要解釋的就是爛。', 'engineering'),
('Programming is the art of telling another human being what one wants the computer to do.', 'Donald Knuth', '寫程式是用文字告訴另一個人類你要電腦做什麼。', 'engineering'),
('Truth can only be found in one place: the code.', 'Robert C. Martin', '真相只在一處：程式碼。', 'engineering'),
('It''s not a bug, it''s an undocumented feature.', 'Unknown', '這不是 bug、是沒寫進文件的 feature。', 'debug'),
('99 little bugs in the code, 99 little bugs. Take one down, patch it around, 127 little bugs in the code.', 'Anonymous', '程式裡有 99 個 bug、修一個、變成 127 個。', 'debug'),
('Debugging is twice as hard as writing the code in the first place.', 'Brian Kernighan', 'Debug 比寫程式難兩倍。', 'debug'),
('In order to understand recursion, you must first understand recursion.', 'Anonymous', '想懂遞迴、你得先懂遞迴。', 'engineering'),
('Software is a great combination between artistry and engineering.', 'Bill Gates', '軟體是藝術跟工程的完美結合。', 'engineering'),
('The most damaging phrase in the language is "We''ve always done it this way."', 'Grace Hopper', '最有殺傷力的一句話是「我們一直都這樣做」。', 'mindset'),
('A language that doesn''t affect the way you think about programming is not worth knowing.', 'Alan Perlis', '一個沒改變你思考方式的程式語言、不值得學。', 'engineering'),

-- === Linus & Unix ===
('Bad programmers worry about the code. Good programmers worry about data structures and their relationships.', 'Linus Torvalds', '爛工程師擔心 code、好工程師擔心資料結構跟它們的關係。', 'engineering'),
('I''m doing a (free) operating system (just a hobby, won''t be big and professional like gnu).', 'Linus Torvalds', '我正在做一個（免費的）作業系統（純興趣、不會像 GNU 那麼大那麼專業）。', 'classic'),
('Given enough eyeballs, all bugs are shallow.', 'Eric S. Raymond', '夠多眼睛看、所有 bug 都是淺的。', 'engineering'),
('Those who don''t understand Unix are condemned to reinvent it, poorly.', 'Henry Spencer', '不懂 Unix 的人注定要重新發明它、做得還很爛。', 'engineering'),
('When in doubt, use brute force.', 'Ken Thompson', '不確定怎麼做？暴力解。', 'engineering'),

-- === 創業 / Indie ===
('Move fast and break things.', 'Mark Zuckerberg', '快速行動、打破常規。', 'startup'),
('Done is better than perfect.', 'Sheryl Sandberg', '做完比完美好。', 'startup'),
('The best way to predict the future is to invent it.', 'Alan Kay', '預測未來最好的方法是發明它。', 'startup'),
('If you''re not embarrassed by the first version of your product, you''ve launched too late.', 'Reid Hoffman', '如果你不對自己第一版產品感到尷尬、那你太晚上線了。', 'startup'),
('Make something people want.', 'Paul Graham', '做出有人想要的東西。', 'startup'),
('Your most unhappy customers are your greatest source of learning.', 'Bill Gates', '你最不爽的客戶就是你最大的學習來源。', 'startup'),
('It''s not about ideas. It''s about making ideas happen.', 'Scott Belsky', '重點不是想法、是讓想法發生。', 'startup'),
('Build it, and they will come... is bullshit.', 'Anonymous', '「你蓋了他們就會來」這句是放屁。', 'startup'),
('The customer''s perception is your reality.', 'Kate Zabriskie', '客戶的認知就是你的現實。', 'startup'),
('In God we trust. All others must bring data.', 'W. Edwards Deming', '上帝可以信、其他人請帶數據來。', 'startup'),

-- === 學習 / 心態 ===
('The expert in anything was once a beginner.', 'Helen Hayes', '任何領域的專家、曾經都是新手。', 'mindset'),
('I have not failed. I''ve just found 10,000 ways that won''t work.', 'Thomas Edison', '我沒失敗、只是找到 10000 種不行的方法。', 'mindset'),
('It does not matter how slowly you go as long as you do not stop.', 'Confucius', '走得多慢都沒關係、別停下就好。', 'mindset'),
('The only way to do great work is to love what you do.', 'Steve Jobs', '做出偉大作品的唯一方法、是愛你做的事。', 'mindset'),
('Stay hungry, stay foolish.', 'Steve Jobs', '求知若飢、虛心若愚。', 'mindset'),
('The journey of a thousand miles begins with a single step.', 'Lao Tzu', '千里之行、始於足下。', '中文格言'),
('Knowing is not enough; we must apply. Willing is not enough; we must do.', 'Bruce Lee', '知道不夠、要應用。願意不夠、要去做。', 'mindset'),
('You miss 100% of the shots you don''t take.', 'Wayne Gretzky', '你沒投的球、命中率是 0%。', 'mindset'),
('Whether you think you can or think you can''t, you''re right.', 'Henry Ford', '不管你覺得自己能還是不能、你都對。', 'mindset'),
('Action is the foundational key to all success.', 'Pablo Picasso', '行動是所有成功的基石。', 'mindset'),
('Success is going from failure to failure without losing enthusiasm.', 'Winston Churchill', '成功就是從一次失敗走到下一次失敗、熱情不減。', 'mindset'),

-- === AI 時代 / 新潮 ===
('Software is eating the world. Now AI is eating software.', 'Marc Andreessen / Jensen Huang', '軟體吃掉世界、現在 AI 吃掉軟體。', 'startup'),
('The future is already here — it''s just not very evenly distributed.', 'William Gibson', '未來已經在這了、只是分布不均。', 'mindset'),
('Any sufficiently advanced technology is indistinguishable from magic.', 'Arthur C. Clarke', '夠先進的科技、跟魔法沒兩樣。', 'mindset'),
('The most dangerous phrase in the language is "we''ve always done it this way."', 'Grace Hopper', '最危險的一句話：「我們一直都這樣做」。', 'mindset'),
('Code is poetry.', 'WordPress slogan', '程式碼是詩。', 'engineering'),

-- === Debug 系列 ===
('If debugging is the process of removing software bugs, then programming must be the process of putting them in.', 'Edsger W. Dijkstra', '如果 debug 是除掉軟體 bug 的過程、那寫程式就是把它們放進去的過程。', 'debug'),
('Computer Science is no more about computers than astronomy is about telescopes.', 'Edsger W. Dijkstra', '電腦科學不是研究電腦、就像天文學不是研究望遠鏡。', 'engineering'),
('Simplicity is prerequisite for reliability.', 'Edsger W. Dijkstra', '簡單是可靠的前提。', 'engineering'),
('The competent programmer is fully aware of the strictly limited size of his own skull.', 'Edsger W. Dijkstra', '有能力的工程師、清楚知道自己腦袋的容量有限。', 'engineering'),
('Testing shows the presence, not the absence of bugs.', 'Edsger W. Dijkstra', '測試只能證明 bug 存在、不能證明 bug 不存在。', 'debug'),

-- === 中文格言 / 工程心法 ===
('紙上得來終覺淺、絕知此事要躬行。', '陸游', '紙上得來終覺淺、絕知此事要躬行。', '中文格言'),
('天下大事必作於細、天下難事必作於易。', '老子', '天下大事必作於細、天下難事必作於易。', '中文格言'),
('學而時習之、不亦說乎。', '孔子', '學而時習之、不亦說乎。', '中文格言'),
('工欲善其事、必先利其器。', '孔子', '工欲善其事、必先利其器。', '中文格言'),
('讀書破萬卷、下筆如有神。', '杜甫', '讀書破萬卷、下筆如有神。', '中文格言'),
('不積跬步、無以至千里、不積小流、無以成江海。', '荀子', '不積跬步、無以至千里、不積小流、無以成江海。', '中文格言'),

-- === Code 設計 ===
('Clean code always looks like it was written by someone who cares.', 'Robert C. Martin', '乾淨的程式碼、看起來像有人在乎才寫的。', 'engineering'),
('Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.', 'John Woods', '寫 code 時、永遠假設將來維護你 code 的人是個暴力精神病、知道你家在哪。', 'engineering'),
('Programming is like sex. One mistake and you have to support it for the rest of your life.', 'Michael Sinz', '寫程式跟做愛一樣、一次失誤就要養它一輩子。', 'engineering'),
('There is no programming language–no matter how structured–that will prevent programmers from making bad programs.', 'Larry Flon', '不管語言設計得多好、都擋不住工程師寫爛 code。', 'engineering'),
('It''s harder to read code than to write it.', 'Joel Spolsky', '讀 code 比寫 code 難。', 'engineering'),
('Optimism is an occupational hazard of programming: feedback is the treatment.', 'Kent Beck', '樂觀是工程師的職業病、feedback 是治療。', 'engineering'),
('A good programmer is someone who always looks both ways before crossing a one-way street.', 'Doug Linder', '好工程師過單行道也會兩邊看。', 'engineering'),

-- === 效率 / 工具 ===
('A week of programming can save an hour of planning.', 'Anonymous (反諷)', '一個禮拜的 code 能省下一小時的規劃。（反諷）', 'engineering'),
('Weeks of coding can save you hours of planning.', 'Anonymous (反諷)', '幾週的寫程式、能省下幾小時的規劃。（反諷）', 'engineering'),
('There is nothing as permanent as a temporary solution.', 'Anonymous', '沒有什麼比「暫時方案」更永久了。', 'engineering'),
('To iterate is human, to recurse divine.', 'L. Peter Deutsch', '迭代是人、遞迴是神。', 'engineering'),
('Computers are good at following instructions, but not at reading your mind.', 'Donald Knuth', '電腦很會照指令做、但不會讀心。', 'engineering'),

-- === Indie / Solo dev ===
('Indie hackers build the future one weekend at a time.', 'Pieter Levels', 'Indie hacker 一個週末一個週末地建造未來。', 'startup'),
('You don''t need permission to start.', 'Seth Godin', '你不需要許可才能開始。', 'startup'),
('The biggest risk is not taking any risk.', 'Mark Zuckerberg', '最大的風險就是不冒險。', 'startup'),
('Ideas are easy. Implementation is hard.', 'Guy Kawasaki', '想法很容易、實作很難。', 'startup'),
('First, they ignore you. Then they laugh at you. Then they fight you. Then you win.', 'Mahatma Gandhi', '一開始他們無視你、然後嘲笑你、然後攻擊你、然後你贏了。', 'startup'),

-- === AI Agent / Vibe Coding 時代 ===
('The best programmers of the future will be those who can communicate with AI.', 'Anonymous', '未來最強的工程師、是那些會跟 AI 溝通的人。', 'mindset'),
('Prompt engineering is the new programming.', 'Andrej Karpathy', 'Prompt engineering 就是新的寫程式。', 'mindset'),
('English is the new most popular programming language.', 'Andrej Karpathy', '英文是現在最熱門的程式語言。', 'mindset'),
('AI won''t replace developers. Developers using AI will replace those who don''t.', 'Anonymous', 'AI 不會取代工程師、但會用 AI 的工程師會取代不會用的。', 'mindset'),
('The code you don''t write is the code you don''t have to debug.', 'Anonymous', '你不寫的 code、就是你不用 debug 的 code。', 'engineering'),

-- === 系統設計 ===
('All problems in computer science can be solved by another level of indirection... except for the problem of too many levels of indirection.', 'David Wheeler', '電腦科學所有問題都能用「再加一層抽象」解決—除了「抽象層太多」這個問題。', 'engineering'),
('Premature abstraction is just as bad as premature optimization.', 'Anonymous', '過早抽象跟過早優化一樣糟。', 'engineering'),
('The fastest way is the simplest way.', 'Anonymous', '最快的方式就是最簡單的方式。', 'engineering'),
('Architecture is about the important stuff. Whatever that is.', 'Ralph Johnson', '架構就是處理重要的事。不管那是什麼。', 'engineering'),
('Distributed systems are hard. Eventual consistency is hard. Caches are hard.', 'Anonymous', '分散式系統很難、最終一致性很難、快取很難。', 'engineering'),

-- === 創業生存 ===
('If you''re not growing, you''re dying.', 'William S. Burroughs', '不成長就是在死亡。', 'startup'),
('Cash flow is everything.', 'Anonymous', '現金流就是一切。', 'startup'),
('Hire slow, fire fast.', 'Anonymous', '聘人慢、開除人快。', 'startup'),
('The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb', '種樹最好的時間是 20 年前、其次是現在。', '中文格言'),
('Iteration is the secret of success.', 'Anonymous', '迭代是成功的祕密。', 'startup'),

-- === 個人成長 / 老派智慧 ===
('Be the change you wish to see in the world.', 'Mahatma Gandhi', '想要世界改變什麼、自己先成為那個改變。', 'mindset'),
('Whatever you are, be a good one.', 'Abraham Lincoln', '不管你是什麼、做得最好。', 'mindset'),
('Do or do not. There is no try.', 'Yoda', '做、或不做。沒有「試試看」。', 'mindset'),
('The only thing standing between you and your goal is the bullshit story you keep telling yourself as to why you can''t achieve it.', 'Jordan Belfort', '你跟目標之間、只隔著你一直跟自己說「為什麼做不到」的鬼話。', 'mindset')

ON CONFLICT DO NOTHING;
