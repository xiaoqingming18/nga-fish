// ==UserScript==
// @name         NGA 摸鱼优化
// @namespace    https://github.com/xiaoqingming18/nga-fish
// @version      0.10.0
// @description  将 NGA 分区话题列表页与话题页伪装成 Claude Code CLI 界面：只保留话题列表 / 帖子内容，表情原样显示，图片以 [image] 占位，并穿插模拟的 tool use 输出
// @author       xiaoqingming18
// @homepage     https://github.com/xiaoqingming18/nga-fish
// @supportURL   https://github.com/xiaoqingming18/nga-fish/issues
// @updateURL    https://raw.githubusercontent.com/xiaoqingming18/nga-fish/main/nga-fish.user.js
// @downloadURL  https://raw.githubusercontent.com/xiaoqingming18/nga-fish/main/nga-fish.user.js
// @match        *://bbs.nga.cn/thread.php*
// @match        *://bbs.nga.cn/read.php*
// @match        *://ngabbs.com/thread.php*
// @match        *://ngabbs.com/read.php*
// @match        *://www.ngabbs.com/thread.php*
// @match        *://www.ngabbs.com/read.php*
// @match        *://nga.178.com/thread.php*
// @match        *://nga.178.com/read.php*
// @match        *://g.nga.cn/thread.php*
// @match        *://g.nga.cn/read.php*
// @match        *://bbs.nga.cn/misc/adpage_insert_*
// @match        *://ngabbs.com/misc/adpage_insert_*
// @match        *://www.ngabbs.com/misc/adpage_insert_*
// @match        *://nga.178.com/misc/adpage_insert_*
// @match        *://g.nga.cn/misc/adpage_insert_*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // 广告页拦截：自动跳过 NGA 翻页广告
  if (location.href.includes('/misc/adpage_insert_')) {
    const match = location.href.match(/adpage_insert[^?]*\?(.+)/);
    if (match) {
      const targetUrl = match[1];
      // 验证目标 URL 是否是 NGA 官方域名
      if (targetUrl.match(/^https?:\/\/([a-z0-9]+\.)?(bbs\.nga\.cn|ngabbs\.com|nga\.178\.com|g\.nga\.cn)/)) {
        location.replace(targetUrl);
        throw new Error('Redirecting from ad page'); // 终止脚本执行
      }
    }
  }

  const TAG = '[NGA 摸鱼优化]';
  const BYPASS_KEY = 'nga-fish-bypass';
  const gmGet = (k, d) => (typeof GM_getValue === 'function' ? GM_getValue(k, d) : d);
  const gmSet = (k, v) => { if (typeof GM_setValue === 'function') GM_setValue(k, v); };

  // 图片缩放档位默认配置（视口宽度百分比）
  const DEFAULT_ZOOM_CONFIG = { zoom0: 30, zoom1: 50, zoom2: 85 };
  
  // 视频预览默认配置（相对于原视频的百分比）
  const DEFAULT_VIDEO_CONFIG = { 
    posterScale: 40,  // 封面：原尺寸的 40%
    videoScale: 80,   // 播放：原尺寸的 80%
    autoMute: true    // 默认静音播放
  };

  const enabled = gmGet('enabled', true);
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand(enabled ? '关闭摸鱼模式' : '开启摸鱼模式', () => {
      gmSet('enabled', !enabled);
      location.reload();
    });

    // 自定义图片缩放档位菜单
    GM_registerMenuCommand('自定义图片缩放档位', () => {
      const current = gmGet('zoomConfig', DEFAULT_ZOOM_CONFIG);
      const hint = `当前档位: ${current.zoom0}%, ${current.zoom1}%, ${current.zoom2}%\n\n` +
                   `请输入新的三档缩放比例（相对于视口宽度）\n` +
                   `用逗号或空格分隔，例如：30,50,85 或 20 40 80\n` +
                   `要求：1-100的整数，且递增`;
      const input = prompt(hint, `${current.zoom0},${current.zoom1},${current.zoom2}`);

      if (!input) return; // 用户取消

      const nums = input.split(/[,\s]+/).map(s => parseInt(s.trim(), 10));
      
      // 校验：必须是三个 1-100 的整数，且递增
      if (nums.length !== 3 || nums.some(n => isNaN(n) || n < 1 || n > 100)) {
        alert('输入格式错误！需要三个 1-100 的整数。');
        return;
      }
      if (nums[0] >= nums[1] || nums[1] >= nums[2]) {
        alert('三个档位必须递增！例如：20,50,80');
        return;
      }

      gmSet('zoomConfig', { zoom0: nums[0], zoom1: nums[1], zoom2: nums[2] });
      alert(`设置已保存：${nums[0]}%, ${nums[1]}%, ${nums[2]}%\n\n刷新页面后生效。`);
      location.reload();
    });
    
    // 自定义视频预览设置菜单
    GM_registerMenuCommand('自定义视频预览设置', () => {
      const current = gmGet('videoConfig', DEFAULT_VIDEO_CONFIG);
      const muteText = current.autoMute ? '是' : '否';
      const hint = `当前配置: 封面 ${current.posterScale}%, 播放 ${current.videoScale}%, 静音: ${muteText}\n\n` +
                   `请输入新的配置（相对于原视频尺寸的百分比）\n` +
                   `格式：封面比例,播放比例,是否静音\n` +
                   `例如：40,80,是  或  30,70,否\n` +
                   `要求：比例为 1-100 的整数`;
      const input = prompt(hint, `${current.posterScale},${current.videoScale},${muteText}`);
      
      if (!input) return;
      
      const parts = input.split(/[,，\s]+/).map(s => s.trim());
      if (parts.length !== 3) {
        alert('输入格式错误！需要三个值：封面比例,播放比例,是否静音');
        return;
      }
      
      const [poster, video, mute] = parts;
      const nums = [poster, video].map(s => parseInt(s, 10));
      
      if (nums.some(n => isNaN(n) || n < 1 || n > 100)) {
        alert('比例必须是 1-100 的整数！');
        return;
      }
      
      const muteMap = { '是': true, '否': false, '1': true, '0': false, 'true': true, 'false': false };
      const autoMute = muteMap[mute.toLowerCase()];
      
      if (autoMute === undefined) {
        alert('静音设置必须是：是/否 或 1/0');
        return;
      }
      
      gmSet('videoConfig', {
        posterScale: nums[0],
        videoScale: nums[1],
        autoMute
      });
      
      alert(`设置已保存：\n封面 ${nums[0]}%\n播放 ${nums[1]}%\n静音: ${autoMute ? '是' : '否'}\n\n刷新页面后生效。`);
      location.reload();
    });

    // 固定底部输入框菜单
    const fixedInput = gmGet('fixedInput', false);
    GM_registerMenuCommand(`${fixedInput ? '✓' : '○'} 固定底部输入框`, () => {
      const newValue = !gmGet('fixedInput', false);
      gmSet('fixedInput', newValue);
      alert(`已${newValue ? '开启' : '关闭'}固定底部输入框，刷新页面后生效。`);
      location.reload();
    });
  }
  if (!enabled) return;
  if (sessionStorage.getItem(BYPASS_KEY)) {
    sessionStorage.removeItem(BYPASS_KEY);
    return;
  }

  // document-start 阶段先把原页面藏起来，避免闪出 NGA 原始界面
  const cloak = document.createElement('style');
  cloak.textContent = 'html{background:#1a1a1a!important}body{visibility:hidden!important}';
  (document.head || document.documentElement).appendChild(cloak);

  /* ------------------------------------------------------------------ */
  /* 需要移除的区域                                                       */
  /* ------------------------------------------------------------------ */

  const REMOVE = [
    '#minWidthSpacer', '#mmc', '#custombg', '#mc', // 布局壳
    '#mainmenu', '#menusearchinput',               // 顶部主菜单与站内搜索
    '#m_nav',                                      // 面包屑
    '#m_pbtntop',                                  // 顶部分页条
    '#toptopics',                                  // 置顶与版规
    '#m_pbtnbtm',                                  // 底部分页条（翻页改由命令完成）
    '#m_fopts',                                    // 筛选/排序
    '#b_nav',                                      // 底部版块导航
    '#fast_post_c',                                // 快速发帖
    '#footer',                                     // 页脚
    // 话题页
    '#postbtop', '#postbbtm',                      // 话题页上下分页条
    '#m_postfopts',                                // 话题页操作栏
    '[id^="ad"]', '.adsc', '[id*="_ad_"]',         // 广告位
    'iframe',                                      // 嵌入广告 / 统计
  ];

  // 话题页帖子容器内与正文无关的部分：签名、操作按钮、头像、等级、贴条、评分等
  const READ_STRIP = [
    'script', 'style', 'iframe', '.adsc', '[id^="ad"]',
    '.sign', '[id^="postsign"]', '.postInfo', '.postBtnPos', '[id^="postBtnPos"]',
    '.postinfob', '.recommendvalue', '.white', '.posterinfo', '.avatar', '[id^="posteravatar"]',
    '.comment_c', '[id^="comment_for"]',
  ].join(', ');

  /* ------------------------------------------------------------------ */
  /* 工具函数                                                            */
  /* ------------------------------------------------------------------ */

  const VS = '\uFE0E'; // 强制文本字形，避免 ⏺ ⏸ 等被渲染成 emoji

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : String(kid));
    }
    return el;
  }

  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  // 行内 `code` 渲染成 Claude Code 的蓝紫色
  const md = (s) => s.split(/(`[^`]+`)/).map((p) =>
    p.length > 2 && p.startsWith('`') && p.endsWith('`') ? h('span', { class: 'cc-code' }, p.slice(1, -1)) : p);

  function hashStr(str) {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) {
      x ^= str.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function waitFor(sel, timeout) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(sel);
      if (found) return resolve(found);
      const mo = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (el) {
          mo.disconnect();
          clearTimeout(timer);
          resolve(el);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        mo.disconnect();
        reject(new Error('timeout'));
      }, timeout);
    });
  }

  /* ------------------------------------------------------------------ */
  /* 数据提取                                                            */
  /* ------------------------------------------------------------------ */

  function userName(el) {
    if (!el) return '';
    const b = el.querySelector('b.block_txt[title]');
    const full = b && b.getAttribute('title').trim();
    return full || text(el).replace(/…$/, '');
  }

  function parseRows(table) {
    return [...table.querySelectorAll('tr.topicrow')].map((tr) => {
      const titleA = tr.querySelector('a[id^="t_tt"]') || tr.querySelector('td.c2 a.topic');
      if (!titleA) return null;

      const tags = [...titleA.querySelectorAll('span.silver')].map(text).filter(Boolean);
      const bare = titleA.cloneNode(true);
      bare.querySelectorAll('span.silver').forEach((s) => s.remove());

      const repliesA = tr.querySelector('a[id^="t_rc"]') || tr.querySelector('td.c1 a');
      const authorA = tr.querySelector('a[id^="t_ta"]') || tr.querySelector('td.c3 a.author');
      const postEl = tr.querySelector('[id^="t_pt"]');
      const replyA = tr.querySelector('[id^="t_rt"]');
      const replyerEl = tr.querySelector('[id^="t_tr"]');

      let pages = 0;
      let lastPageHref = '';
      tr.querySelectorAll('[id^="t_pc"] a').forEach((a) => {
        const n = parseInt(text(a), 10);
        if (n > pages) {
          pages = n;
          lastPageHref = a.href;
        }
      });

      return {
        url: titleA.href,
        title: text(bare) || text(titleA),
        fullTitle: text(titleA),
        tags,
        hot: titleA.classList.contains('red'),
        bold: titleA.classList.contains('b'),
        replies: parseInt(text(repliesA), 10) || 0,
        author: userName(authorA),
        postDate: text(postEl),
        postDateFull: (postEl && postEl.getAttribute('title')) || '',
        replyDate: text(replyA),
        replyDateFull: (replyA && replyA.getAttribute('title')) || '',
        replyHref: replyA && replyA.href,
        replyer: userName(replyerEl),
        pages,
        lastPageHref,
      };
    }).filter(Boolean);
  }

  function parsePaging() {
    const m = /[?&]page=(\d+)/.exec(location.search);
    const cur = m ? parseInt(m[1], 10) : 1;
    let max = cur;
    try {
      const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      const P = w.__PAGE;
      if (P && +P[1] > 0) max = Math.max(max, +P[1]);
    } catch (e) { /* 页面变量不可用时忽略 */ }
    document.querySelectorAll('#pagebtop a, #pagebbtm a').forEach((a) => {
      const pm = /[?&]page=(\d+)/.exec(a.getAttribute('href') || '');
      if (pm) max = Math.max(max, parseInt(pm[1], 10));
    });
    return { cur, max };
  }

  // 不用 URLSearchParams：NGA 的 key= 参数是 GBK 百分号编码，重新序列化会被破坏
  function pageUrl(n, drop) {
    const skip = new Set(['page', ...(drop || [])]);
    const q = location.search.replace(/^\?/, '').split('&').filter((p) => p && !skip.has(p.split('=')[0]));
    if (n > 1) q.push('page=' + n);
    return location.origin + location.pathname + (q.length ? '?' + q.join('&') : '');
  }

  // 原站「只看作者」：read.php?tid=&authorid=<uid>
  function authorFilterUrl(uid) {
    const q = location.search.replace(/^\?/, '').split('&')
      .filter((p) => p && !/^(?:page|authorid)=/.test(p));
    q.push('authorid=' + uid);
    return location.origin + location.pathname + '?' + q.join('&');
  }

  /* ------------------------------------------------------------------ */
  /* 伪装素材                                                            */
  /* ------------------------------------------------------------------ */

  const PROJECTS = ['ledger-api', 'web-console', 'atlas-dashboard', 'order-service', 'pipeline-core', 'admin-portal', 'search-indexer', 'billing-gateway'];

  const USER_PROMPTS = [
    '帮我排查一下列表分页的问题：翻到第二页后数据没有刷新，顺便看看缓存',
    '把 TopicList 重构一下，key 改用 tid，再补上分页相关的单元测试',
    'threads 接口返回的时间戳单位好像不对，帮我核对一下数据然后修掉',
  ];

  const INTROS = [
    '我先拉取一批数据看看当前的返回结构，再定位问题。',
    '先确认一下接口实际返回的数据，再看分页和缓存的实现。',
  ];

  const TODO_POOL = ['拉取并核对列表数据', '修复分页起始页码', '修正时间戳单位', '为缓存增加过期判断', '补充分页单元测试', '运行类型检查与测试'];

  const TEXTS = [
    '问题在这里：`page` 从 0 开始计数，但接口要求从 1 开始。',
    '这批数据的 `replies` 和 `lastReplyAt` 都正常，排序也符合预期。',
    '缓存缺少过期判断，翻页后仍然会读到旧数据，修一下。',
    '`TopicRow` 用 `title` 当 key，遇到重名话题会复用错误的节点，改成 `tid`。',
    '类型检查通过了，继续拉下一批数据核对字段。',
    '接口返回结构没问题，接下来修正 `formatRelative` 的时间戳单位。',
    '我来补一个边界用例，确保页码越界时会被截断。',
    '这里的错误被吞掉了，调用方拿不到状态码，补上 `ApiError`。',
    '数据看起来是对的，问题应该出在渲染层，我看一下组件。',
  ];

  const DIFFS = [
    { file: 'src/hooks/usePagination.ts', start: 8, lines: [
      ' export function usePagination(total: number, size = 20) {',
      '-  const [page, setPage] = useState(0);',
      '+  const [page, setPage] = useState(1);',
      '+  const pages = Math.max(1, Math.ceil(total / size));',
      '   const next = () => setPage(p => Math.min(p + 1, pages));',
    ] },
    { file: 'src/api/client.ts', start: 21, lines: [
      '   const res = await fetch(url, { signal });',
      '-  return res.json();',
      '+  if (!res.ok) {',
      '+    throw new ApiError(res.status, await res.text());',
      '+  }',
      '+  return (await res.json()) as T;',
      ' }',
    ] },
    { file: 'src/utils/format.ts', start: 3, lines: [
      ' export function formatRelative(ts: number) {',
      '-  const diff = Date.now() - ts;',
      '+  const diff = Date.now() - ts * 1000;',
      "   if (diff < 60_000) return '刚才';",
    ] },
    { file: 'src/components/TopicList.tsx', start: 42, lines: [
      '     <ul className="topic-list">',
      '-      {topics.map(t => <TopicRow key={t.title} topic={t} />)}',
      '+      {topics.map(t => (',
      '+        <TopicRow key={t.tid} topic={t} onOpen={handleOpen} />',
      '+      ))}',
      '     </ul>',
    ] },
    { file: 'src/store/threadSlice.ts', start: 27, lines: [
      "     case 'threads/loaded':",
      '-      return { ...state, items: action.payload };',
      '+      return {',
      '+        ...state,',
      "+        items: dedupeBy(action.payload, 'tid'),",
      '+        loadedAt: Date.now(),',
      '+      };',
    ] },
    { file: 'src/lib/cache.ts', start: 1, lines: [
      '-const TTL = 60 * 1000;',
      '+const TTL = 5 * 60 * 1000; // 5 min',
      ' ',
      ' export function getCached<T>(key: string): T | undefined {',
      '   const hit = store.get(key);',
      '-  if (!hit) return undefined;',
      '+  if (!hit || hit.expires < Date.now()) return undefined;',
    ] },
    { file: 'tests/pagination.test.ts', start: 34, lines: [
      '   });',
      ' ',
      "+  it('clamps page to total pages', () => {",
      '+    const { result } = renderHook(() => usePagination(45, 20));',
      '+    act(() => result.current.goto(99));',
      '+    expect(result.current.page).toBe(3);',
      '+  });',
    ] },
    { file: 'src/server/routes/thread.ts', start: 12, lines: [
      " router.get('/threads', async (req, res) => {",
      '-  const page = Number(req.query.page);',
      '+  const page = Math.max(1, Number(req.query.page) || 1);',
      '   const rows = await db.threads.list({ fid: req.query.fid, page });',
    ] },
  ];

  const READS = [
    ['src/components/TopicList.tsx', 182], ['src/hooks/usePagination.ts', 64], ['src/api/client.ts', 97],
    ['src/store/threadSlice.ts', 131], ['src/lib/cache.ts', 48], ['src/server/routes/thread.ts', 76],
    ['package.json', 41], ['tsconfig.json', 28],
  ];

  const SEARCHES = [
    ['usePagination', 'src', 6], ['formatRelative', 'src', 4], ['getCached\\(', 'src', 9], ['TODO|FIXME', 'src', 13], ['key=\\{t\\.title\\}', 'src', 2],
  ];

  const BASHES = [
    { cmd: 'npx tsc --noEmit', out: ['(No content)'] },
    { cmd: 'npm test -- --run src/hooks', out: [
      ' ✓ src/hooks/usePagination.test.ts (6 tests) 14ms',
      '',
      ' Test Files  1 passed (1)',
      '      Tests  6 passed (6)',
      '   Duration  812ms',
    ] },
    { cmd: 'git status --short', out: [' M src/api/client.ts', ' M src/hooks/usePagination.ts', ' M src/lib/cache.ts', '?? tests/pagination.test.ts'] },
    { cmd: 'npm run lint -- --quiet', out: ['> lint', '> eslint . --ext .ts,.tsx --quiet', '', '(No content)'] },
    { cmd: 'npm test -- --run tests/pagination.test.ts', out: [
      ' ✓ tests/pagination.test.ts (9 tests) 21ms',
      '',
      ' Test Files  1 passed (1)',
      '      Tests  9 passed (9)',
    ] },
  ];

  const FETCH_CMDS = [
    (o, n, p) => `curl -s "localhost:3000/api/threads?page=${p}&offset=${o}&limit=${n}" | jq -r '.[] | [.replies, .title, .author] | @tsv'`,
    (o, n, p) => `node scripts/dump-threads.js --page ${p} --offset ${o} --limit ${n}`,
    (o, n) => `sqlite3 dev.db "SELECT replies, title, author, last_reply FROM threads LIMIT ${n} OFFSET ${o}"`,
    (o, n, p) => `sed -n '${o + 1},${o + n}p' fixtures/threads.page${p}.tsv`,
  ];

  const REPLIES = ['好的，我按这个思路继续处理。', '明白，先把当前这批数据核对完再改。', '收到，我会在下一步一起处理。'];

  const VERBS = ['Pondering', 'Cogitating', 'Percolating', 'Noodling', 'Tinkering', 'Simmering', 'Wrangling', 'Mulling', 'Brewing', 'Computing', 'Reticulating', 'Schlepping', 'Clauding'];
  const STAR_FRAMES = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];

  /* ------------------------------------------------------------------ */
  /* 样式                                                                */
  /* ------------------------------------------------------------------ */

  const zoomConfig = gmGet('zoomConfig', DEFAULT_ZOOM_CONFIG);
  const CSS = `
html.cc-on, html.cc-on body {
  background: #1a1a1a !important; margin: 0 !important; padding: 0 !important;
  min-width: 0 !important; height: auto !important; color-scheme: dark;
}
html.cc-on { scrollbar-color: #444 #1a1a1a; }
html.cc-on body > :not(#cc-root) { display: none !important; }

#cc-root {
  --bg: #1a1a1a; --fg: #e8e8e8; --dim: #999999; --meta: #707070;
  --claude: rgb(215,119,87); --green: rgb(78,186,101); --red: rgb(255,107,128);
  --code: rgb(177,185,249); --border: rgb(136,136,136); --bash: rgb(253,93,177);
  --accept: rgb(175,135,255); --plan: rgb(72,150,140); --warn: rgb(255,193,7);
  --add: rgb(34,92,43); --del: rgb(122,41,54);
  --line: 18px;
  display: block; min-height: 100vh; background: var(--bg); color: var(--fg);
  font-family: "JetBrains Mono", "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas, "Liberation Mono",
    "Sarasa Mono SC", "Noto Sans Mono CJK SC", "PingFang SC", "Microsoft YaHei", monospace;
  font-size: 14px; line-height: var(--line); font-weight: 400;
  font-variant-ligatures: none; font-variant-emoji: text; tab-size: 2;
  padding: 10px 16px 28px; text-align: left;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
#cc-root * {
  box-sizing: border-box; margin: 0; padding: 0; border: 0; background: transparent;
  font: inherit; color: inherit; line-height: inherit; letter-spacing: normal;
  text-decoration: none; text-align: inherit; float: none; vertical-align: baseline;
  box-shadow: none; text-shadow: none;
}
#cc-root ::selection { background: rgba(255,255,255,.22); }

#cc-root .cc-b { font-weight: 700; }
#cc-root .cc-i { font-style: italic; }
#cc-root .cc-dim { color: var(--dim); }
#cc-root .cc-fg { color: var(--fg); }
#cc-root .cc-claude { color: var(--claude); }
#cc-root .cc-green { color: var(--green); }
#cc-root .cc-red { color: var(--red); }
#cc-root .cc-code { color: var(--code); }
#cc-root .cc-strike { text-decoration: line-through; }

#cc-root .cc-block { margin-top: var(--line); }
#cc-root .cc-line { white-space: pre; min-height: var(--line); }
#cc-root .cc-row { display: grid; grid-template-columns: 2ch minmax(0, 1fr); }
#cc-root .cc-res { display: grid; grid-template-columns: 5ch minmax(0, 1fr); }
#cc-root .cc-gut { white-space: pre; }
#cc-root .cc-body { white-space: pre-wrap; overflow-wrap: anywhere; min-height: var(--line); }

#cc-root .cc-welcome {
  display: inline-block; border: 1px solid var(--claude); border-radius: 6px;
  padding: 8px 3ch 8px 1ch; margin-top: 0;
}

#cc-root .cc-tl { display: grid; grid-template-columns: 6ch minmax(0, 1fr); }
#cc-root .cc-rc { white-space: pre; }
#cc-root .cc-item { cursor: default; }
#cc-root .cc-item:hover { background: rgba(255,255,255,.04); }
#cc-root .cc-item.cc-sel { background: rgba(177,185,249,.14); }
#cc-root .cc-u { text-decoration: underline; }
#cc-root .cc-postres + .cc-postres > .cc-body { padding-top: var(--line); }
#cc-root .cc-post-c { white-space: pre-wrap; overflow-wrap: anywhere; }
#cc-root .cc-smile {
  display: inline-block; height: 1.15em; width: auto; max-width: 8em;
  vertical-align: -0.2em; margin: 0 1px;
}
#cc-root .cc-quote {
  display: block; margin: 2px 0; padding-left: 1ch;
  border-left: 2px solid var(--meta); color: var(--dim); white-space: pre-wrap;
}
#cc-root a.cc-link { color: var(--code); text-decoration: underline; }
#cc-root a.cc-img { color: var(--code); cursor: zoom-in; }
#cc-root a.cc-img:hover { background: rgba(177,185,249,.18); }
#cc-root a.cc-video { color: var(--bash); cursor: pointer; }
#cc-root a.cc-video:hover { background: rgba(253,93,177,.18); }
#cc-root .cc-preview {
  position: fixed; z-index: 2147483647; pointer-events: none;
  padding: 4px; background: #222 !important; border: 1px solid var(--border); border-radius: 6px;
}
#cc-root .cc-preview[hidden] { display: none; }
#cc-root .cc-preview img {
  display: block; width: auto; height: auto;
  transition: max-width 0.2s ease, max-height 0.2s ease;
}
#cc-root .cc-preview.cc-zoom-0 img { max-width: ${zoomConfig.zoom0}vw; max-height: ${Math.round(zoomConfig.zoom0 * 1.33)}vh; }
#cc-root .cc-preview.cc-zoom-1 img { max-width: ${zoomConfig.zoom1}vw; max-height: ${Math.round(zoomConfig.zoom1 * 1.2)}vh; }
#cc-root .cc-preview.cc-zoom-2 img { max-width: ${zoomConfig.zoom2}vw; max-height: ${zoomConfig.zoom2}vh; }
#cc-root .cc-preview img[hidden] { display: none; }
#cc-root .cc-zoom-indicator {
  position: absolute; bottom: 8px; right: 8px; padding: 2px 6px;
  background: rgba(0,0,0,0.7); color: var(--dim); font-size: 11px;
  border-radius: 3px; pointer-events: none;
}
#cc-root .cc-video-preview {
  position: fixed; z-index: 2147483647; pointer-events: auto;
  padding: 4px; background: #222 !important; border: 1px solid var(--border); border-radius: 6px;
}
#cc-root .cc-video-preview[hidden] { display: none; }
#cc-root .cc-video-preview img {
  display: block; width: auto; height: auto; cursor: pointer;
}
#cc-root .cc-video-preview img[hidden] { display: none; }
#cc-root .cc-video-preview video {
  display: block; width: auto; height: auto; background: #000;
}
#cc-root .cc-video-preview video[hidden] { display: none; }
#cc-root .cc-video-indicator {
  position: absolute; bottom: 8px; right: 8px; padding: 2px 6px;
  background: rgba(0,0,0,0.7); color: var(--dim); font-size: 11px;
  border-radius: 3px; pointer-events: none;
}
#cc-root a { cursor: pointer; }
#cc-root a.cc-tt { color: var(--fg); }
#cc-root a.cc-tt.cc-hot { color: var(--claude); }
#cc-root a.cc-tt:visited { color: var(--dim); }
#cc-root a.cc-tt:hover, #cc-root .cc-meta a:hover, #cc-root a.cc-pg:hover { text-decoration: underline; }
#cc-root .cc-tag { color: var(--dim); }
#cc-root .cc-meta, #cc-root a.cc-pg { color: var(--meta); }

#cc-root .cc-diff { display: flex; white-space: pre; }
#cc-root .cc-diff .cc-ln { flex: none; color: var(--dim); }
#cc-root .cc-diff.cc-add .cc-ln, #cc-root .cc-diff.cc-del .cc-ln { color: var(--fg); }
#cc-root .cc-diff .cc-sign { flex: none; width: 2ch; }
#cc-root .cc-diff .cc-src { flex: 1; min-width: 0; white-space: pre-wrap; word-break: break-all; }
#cc-root .cc-diff.cc-add { background: var(--add); }
#cc-root .cc-diff.cc-del { background: var(--del); }
#cc-root .cc-hl-kw { color: rgb(198,120,221); }
#cc-root .cc-hl-str { color: rgb(152,195,121); }
#cc-root .cc-hl-num { color: rgb(209,154,102); }
#cc-root .cc-hl-fn { color: rgb(97,175,239); }
#cc-root .cc-hl-type { color: rgb(229,192,123); }
#cc-root .cc-hl-cm { color: rgb(127,132,142); font-style: italic; }

#cc-root.cc-quiet .cc-noise { display: none; }

#cc-root .cc-spin { margin-top: var(--line); white-space: pre; color: var(--claude); }
#cc-root .cc-spin .cc-star { display: inline-block; width: 2ch; }
#cc-root .cc-input {
  display: flex; align-items: center; margin-top: 4px;
  border: 1px solid var(--border); border-radius: 6px; padding: 4px 1ch;
}
#cc-root .cc-input.cc-bashmode { border-color: var(--bash); }
#cc-root .cc-input.cc-bashmode .cc-prompt { color: var(--bash); }
#cc-root .cc-prompt { flex: none; width: 2ch; white-space: pre; }
#cc-root .cc-input input {
  flex: 1; min-width: 0; height: var(--line); outline: none; appearance: none;
  caret-color: var(--fg); color: var(--fg);
}
#cc-root .cc-input input::placeholder { color: var(--dim); opacity: 1; }
#cc-root .cc-hints { display: flex; justify-content: space-between; padding: 0 2ch; white-space: pre; color: var(--dim); }
#cc-root .cc-hints .cc-mode-accept { color: var(--accept); }
#cc-root .cc-hints .cc-mode-plan { color: var(--plan); }
#cc-root .cc-shortcuts {
  display: grid; grid-template-columns: repeat(3, max-content); column-gap: 4ch;
  padding: 0 2ch; color: var(--dim); white-space: pre;
}
#cc-root .cc-shortcuts[hidden] { display: none; }

/* 固定底部输入框样式 */
#cc-root.cc-fixed-input {
  padding-bottom: 140px;
}
#cc-root.cc-fixed-input .cc-input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg);
  border-top: 1px solid var(--border);
  padding: 8px 16px 16px;
  z-index: 1000;
}
/* 快捷键展开时增加底部间距 */
#cc-root.cc-fixed-input .cc-shortcuts:not([hidden]) ~ * {
  margin-bottom: 0;
}
`;

  /* ------------------------------------------------------------------ */
  /* 渲染组件                                                            */
  /* ------------------------------------------------------------------ */

  const block = (cls, ...kids) => h('div', { class: 'cc-block' + (cls ? ' ' + cls : '') }, kids);

  const dotRow = (dotCls, ...content) =>
    h('div', { class: 'cc-row' }, h('span', { class: 'cc-gut ' + dotCls }, '⏺' + VS), h('div', { class: 'cc-body' }, content));

  const results = (lines) => lines.map((ln, i) =>
    h('div', { class: 'cc-res' }, h('span', { class: 'cc-gut cc-dim' }, i === 0 ? '  ⎿  ' : ''), h('div', { class: 'cc-body' }, ln)));

  const tool = (cls, name, arg, lines, status = 'ok') => block(cls,
    dotRow(status === 'ok' ? 'cc-green' : status === 'err' ? 'cc-red' : 'cc-fg',
      h('span', { class: 'cc-b' }, name), arg != null ? ['(', arg, ')'] : null),
    results(lines));

  const textBlock = (s, cls = '') => block(cls, dotRow('cc-fg', md(s)));

  const userBlock = (s) => block('', h('div', { class: 'cc-row cc-dim' }, h('span', { class: 'cc-gut' }, '>'), h('div', { class: 'cc-body' }, s)));

  const thinkingBlock = () => block('cc-noise',
    h('div', { class: 'cc-row cc-dim cc-i' }, h('span', { class: 'cc-gut' }, '✻'), h('div', { class: 'cc-body' }, 'Thinking…')));

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const KW = /^(?:const|let|var|return|export|import|from|function|if|else|await|async|new|throw|type|interface|case|default|switch|for|of|in|as|true|false|null|undefined)$/;

  function highlight(code) {
    const out = [];
    const re = /(\/\/.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d[\d_]*\b)|([A-Za-z_$][\w$]*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(code))) {
      if (m.index > last) out.push(code.slice(last, m.index));
      const [tok, cm, str, num, id] = m;
      let cls = null;
      if (cm) cls = 'cc-hl-cm';
      else if (str) cls = 'cc-hl-str';
      else if (num) cls = 'cc-hl-num';
      else if (KW.test(id)) cls = 'cc-hl-kw';
      else if (code[re.lastIndex] === '(') cls = 'cc-hl-fn';
      else if (/^[A-Z]/.test(id)) cls = 'cc-hl-type';
      out.push(cls ? h('span', { class: cls }, tok) : tok);
      last = re.lastIndex;
    }
    if (last < code.length) out.push(code.slice(last));
    return out;
  }

  function diffBlock(sn) {
    let oldN = sn.start;
    let newN = sn.start;
    let adds = 0;
    let dels = 0;
    const rows = sn.lines.map((raw) => {
      const sign = raw[0];
      const code = raw.slice(1);
      let num;
      let kind;
      if (sign === '-') { num = oldN++; kind = 'del'; dels++; }
      else if (sign === '+') { num = newN++; kind = 'add'; adds++; }
      else { num = newN; oldN++; newN++; kind = 'ctx'; }
      return h('div', { class: 'cc-diff cc-' + kind },
        h('span', { class: 'cc-ln' }, String(num).padStart(5) + ' '),
        h('span', { class: 'cc-sign' }, sign === ' ' ? ' ' : sign),
        h('span', { class: 'cc-src' }, highlight(code)));
    });
    const summary = ['Updated ', h('span', { class: 'cc-b' }, sn.file), ' with ', plural(adds, 'addition')];
    if (dels) summary.push(' and ', plural(dels, 'removal'));
    return tool('cc-noise', 'Update', sn.file, [summary, ...rows]);
  }

  function todosBlock(items, done) {
    return tool('cc-noise', 'Update Todos', null, items.map((t, i) =>
      i < done ? h('span', { class: 'cc-dim cc-strike' }, '☒ ' + t)
        : i === done ? h('span', { class: 'cc-b' }, '☐ ' + t)
          : '☐ ' + t));
  }

  function heat(n) {
    if (n >= 200) return 'cc-red';
    if (n >= 50) return 'cc-claude';
    if (n >= 10) return 'cc-fg';
    return 'cc-dim';
  }

  function topicLine(t) {
    const title = h('a', {
      class: 'cc-tt' + (t.hot ? ' cc-hot' : '') + (t.bold ? ' cc-b' : ''),
      href: t.url,
      title: t.fullTitle,
    }, t.tags.map((g) => h('span', { class: 'cc-tag' }, g)), t.title);

    const pager = t.pages > 1
      ? h('a', { class: 'cc-pg', href: t.lastPageHref, title: `共 ${t.pages} 页，跳到最后一页` }, ` +${t.pages}p`)
      : null;

    const meta = h('span', { class: 'cc-meta' },
      t.author ? h('span', { title: t.postDateFull }, `  ${t.author}`, t.postDate ? ` · ${t.postDate}` : '') : '',
      t.replyDate ? [' · ↻ ', h('a', { href: t.replyHref, title: t.replyDateFull || '最后回复' }, t.replyDate),
        t.replyer ? ` ${t.replyer}` : ''] : '');

    return h('div', { class: 'cc-tl' },
      h('span', { class: 'cc-rc ' + heat(t.replies) }, String(t.replies).padStart(4) + '  '),
      h('span', null, title, pager, meta));
  }

  /* ------------------------------------------------------------------ */
  /* 话题页：帖子提取与正文转换                                            */
  /* ------------------------------------------------------------------ */

  const IMG_BASE = 'https://img.nga.178.com/attachments/';

  function resolveImg(v) {
    v = (v || '').trim();
    if (!v || /^(?:about|data|javascript):/i.test(v)) return '';
    if (v.startsWith('./')) v = IMG_BASE + v.slice(2);
    else if (/^mon_\d/.test(v)) v = IMG_BASE + v;
    try {
      // 正文里默认是 xxx.jpg.medium.jpg / xxx.jpg.thumb.jpg 缩略图，去掉后缀即为原图
      return new URL(v, location.href).href
        .replace(/(\.(?:jpe?g|png|gif|webp|bmp))\.(?:medium|thumb(?:_s{1,2})?)\.jpg$/i, '$1');
    } catch (e) {
      return '';
    }
  }

  function imgSource(img) {
    for (const k of ['data-srcorg', 'data-srclazy', 'data-src', 'src']) {
      const v = (img.getAttribute(k) || '').trim();
      if (!v || /(?:^|\/)(?:loading|blank|none)\.gif$/i.test(v)) continue;
      const u = resolveImg(v);
      if (u) return u;
    }
    return '';
  }

  const imgPlaceholder = (src) => h('a', {
    class: 'cc-img',
    href: src || null,
    target: src ? '_blank' : null,
    rel: 'noopener',
    'data-src': src || null,
  }, '[image]');

  // NGA 表情由 [s:包名:名字] 渲染成 <img class="smile_包名">，地址固定在 /post/smile/。
  // 勋章（medalimg）和 copyChk 用的 about:blank 隐藏图不是正文内容。
  function isSmile(img) {
    const cls = img.className || '';
    if (/(?:^|\s)smile(?:_|\s|$)/.test(cls)) return true;
    const src = [img.getAttribute('src'), img.getAttribute('data-src'), img.getAttribute('data-srcorg'), img.getAttribute('data-srclazy')]
      .filter(Boolean).join(' ');
    return /\/post\/smile\//i.test(src);
  }

  function smileNode(img) {
    const src = imgSource(img) || (img.getAttribute('src') || '').trim();
    const name = (img.getAttribute('alt') || img.getAttribute('title') || '').trim();
    return h('img', {
      class: 'cc-smile',
      src: src || null,
      alt: name,
      title: name || null,
      referrerpolicy: 'no-referrer-when-downgrade',
    });
  }

  // 页面脚本没来得及把 UBB 渲染成 HTML 时的兜底
  const UBB_TOKEN = /\[img\]\s*([^[\]\s]+?)\s*\[\/img\]|\[s:([^\]]+)\]/gi;
  const UBB_TAG = /\[\/?(?:b|i|u|del|color|size|font|align|url|quote|collapse|h|list|\*|table|tr|td|pid|uid|tid)(?:=[^\]]*)?\]/gi;

  function appendText(out, raw) {
    const s = raw.replace(/[\t ]*[\r\n]+[\t ]*/g, '');
    if (!s) return;
    if (s.indexOf('[') < 0) {
      out.append(s);
      return;
    }
    let last = 0;
    let m;
    UBB_TOKEN.lastIndex = 0;
    while ((m = UBB_TOKEN.exec(s))) {
      if (m.index > last) out.append(s.slice(last, m.index).replace(UBB_TAG, ''));
      if (m[1]) out.append(imgPlaceholder(resolveImg(m[1])));
      else {
        const parts = m[2].split(':');
        const name = (parts.length > 1 ? parts.slice(1).join(':') : parts[0]).trim();
        out.append(h('span', { class: 'cc-dim' }, `[${name || '表情'}]`));
      }
      last = UBB_TOKEN.lastIndex;
    }
    if (last < s.length) out.append(s.slice(last).replace(UBB_TAG, ''));
  }

  const SKIP_SEL = 'script, style, noscript, iframe, object, embed, button, .comment_c, [id^="comment"], .adsc';
  const BLOCK_TAGS = /^(?:DIV|P|UL|OL|LI|TABLE|TR|HR|H[1-6]|PRE|CENTER|DL|DT|DD)$/;
  const INLINE_CLS = { B: 'cc-b', STRONG: 'cc-b', I: 'cc-i', EM: 'cc-i', DEL: 'cc-strike', S: 'cc-strike', STRIKE: 'cc-strike', U: 'cc-u' };

  const isBlock = (n) => !!n && n.nodeType === 1 && n.tagName === 'DIV';

  function nl(out) {
    const t = out.lastChild;
    if (!t || isBlock(t) || (t.nodeType === 3 && /\n$/.test(t.nodeValue))) return;
    out.append('\n');
  }

  function walk(src, out) {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) {
        appendText(out, n.nodeValue);
        continue;
      }
      if (n.nodeType !== 1 || n.matches(SKIP_SEL)) continue;
      const tag = n.tagName;

      if (tag === 'BR') {
        out.append('\n');
      } else if (tag === 'IMG') {
        if (n.classList.contains('medalimg')) continue;
        if (isSmile(n)) out.append(smileNode(n));
        else {
          const src = imgSource(n);
          if (src) out.append(imgPlaceholder(src));
        }
      } else if (tag === 'VIDEO' || tag === 'AUDIO') {
        if (tag === 'VIDEO') {
          const src = n.src || n.getAttribute('src');
          const poster = n.poster || n.getAttribute('poster') || (src ? src + '.medium.jpg' : '');
          out.append(h('a', {
            class: 'cc-video',
            href: src || null,
            target: src ? '_blank' : null,
            rel: 'noopener',
            'data-video-src': src || null,
            'data-video-poster': poster || null
          }, '[video]'));
        } else {
          const s = n.matches('[src]') ? n : n.querySelector('[src]');
          const u = s ? resolveImg(s.getAttribute('src')) : '';
          out.append(h('a', { class: 'cc-link', href: u || null, target: u ? '_blank' : null, rel: 'noopener' }, '[audio]'));
        }
      } else if (n.classList.contains('quote') || tag === 'BLOCKQUOTE') {
        const q = h('div', { class: 'cc-quote' });
        walk(n, q);
        tidy(q);
        if (q.childNodes.length) out.append(q);
      } else if (n.classList.contains('collapse_btn')) {
        // 渲染折叠标题
        const c = n.cloneNode(true);
        c.querySelectorAll('button').forEach((b) => b.remove());
        nl(out);
        out.append(h('span', { class: 'cc-dim' }, '▾ ' + (text(c) || '折叠内容')), '\n');
        
        // 查找折叠内容：根据实际调研，collapse_content 是 collapse_btn 的紧邻兄弟元素
        const collapseContent = n.nextElementSibling;
        if (collapseContent && collapseContent.classList.contains('collapse_content')) {
          // 克隆内容，移除可能阻止渲染的隐藏属性
          const contentClone = collapseContent.cloneNode(true);
          contentClone.style.display = '';
          contentClone.removeAttribute('hidden');
          
          // 渲染折叠内容
          walk(contentClone, out);
          nl(out);
        }
      } else if (tag === 'A') {
        if (n.querySelector('img, video, audio')) {
          walk(n, out);
          continue;
        }
        const href = /^https?:/i.test(n.href || '') ? n.href : null;
        const a = h('a', { class: 'cc-link', href, target: href ? '_blank' : null, rel: 'noopener' });
        walk(n, a);
        if (a.childNodes.length) out.append(a);
      } else {
        const blk = BLOCK_TAGS.test(tag);
        if (blk) nl(out);
        if (tag === 'HR') {
          out.append(h('span', { class: 'cc-dim' }, '─'.repeat(24)));
        } else if (tag === 'LI') {
          out.append('• ');
          walk(n, out);
        } else if (tag === 'TABLE') {
          // 表格边框（CLI 风格）
          nl(out);
          out.append(h('span', { class: 'cc-dim' }, '┌' + '─'.repeat(60) + '┐'), '\n');
          walk(n, out);
          nl(out);
          out.append(h('span', { class: 'cc-dim' }, '└' + '─'.repeat(60) + '┘'));
        } else if (tag === 'TR') {
          // 表格行前缀
          nl(out);
          out.append(h('span', { class: 'cc-dim' }, '│ '));
          walk(n, out);
        } else if (tag === 'TD' || tag === 'TH') {
          if (n.previousElementSibling) out.append(h('span', { class: 'cc-dim' }, ' │ '));
          walk(n, out);
        } else {
          const cls = /^H[1-6]$/.test(tag) ? 'cc-b' : INLINE_CLS[tag];
          if (cls) {
            const w = h('span', { class: cls });
            walk(n, w);
            if (w.childNodes.length) out.append(w);
          } else {
            walk(n, out);
          }
        }
        if (blk) nl(out);
      }
    }
  }

  // 去掉首尾空行、块元素两侧多余换行，连续空行最多保留一行
  function tidy(el) {
    el.normalize();
    const nodes = [...el.childNodes];
    nodes.forEach((n, i) => {
      if (n.nodeType !== 3) return;
      let s = n.nodeValue.replace(/\n{3,}/g, '\n\n');
      const prev = nodes[i - 1];
      const next = nodes[i + 1];
      if (!prev) s = s.replace(/^\s+/, '');
      else if (isBlock(prev)) s = s.replace(/^\n+/, '');
      if (!next) s = s.replace(/\s+$/, '');
      else if (isBlock(next)) s = s.replace(/\n+$/, '');
      if (s) n.nodeValue = s;
      else n.remove();
    });
  }

  function renderContent(el) {
    const out = h('div', { class: 'cc-post-c' });
    walk(el, out);
    tidy(out);
    if (!out.textContent.trim() && !out.querySelector('.cc-img, .cc-smile')) {
      out.textContent = '';
      out.append(h('span', { class: 'cc-dim' }, '(No content)'));
    }
    return out;
  }

  function parsePosts(root) {
    const seen = new Set();
    return [...root.querySelectorAll('[id^="postcontent"]')].map((el) => {
      const m = /^postcontent(\d+)$/.exec(el.id);
      if (!m || seen.has(m[1])) return null;
      seen.add(m[1]);
      const byId = (p) => document.getElementById(p + m[1]);
      const row = el.closest('tr') || el.parentElement;
      const anchor = [...row.querySelectorAll('a[name]')].find((a) => /^l\d+$/.test(a.getAttribute('name')));
      const dateEl = byId('postdate');
      return {
        floor: anchor ? parseInt(anchor.getAttribute('name').slice(1), 10) : parseInt(m[1], 10),
        author: userName(byId('postauthor')),
        date: text(dateEl),
        dateFull: (dateEl && dateEl.getAttribute('title')) || '',
        subject: text(byId('postsubject')),
        content: renderContent(el),
      };
    }).filter(Boolean);
  }

  function topicTitle() {
    const sub = text(document.getElementById('postsubject0'));
    if (sub) return sub;
    const nav = [...document.querySelectorAll('#m_nav a[href*="tid="]')].pop();
    if (nav && text(nav)) return text(nav);
    return document.title.replace(/\s*NGA玩家社区\s*$/, '').trim();
  }

  function postLine(p) {
    return h('div', null,
      h('div', null,
        h('span', { class: 'cc-dim' }, `#${p.floor}`), '  ',
        h('span', { class: 'cc-code' }, p.author || 'anonymous'),
        p.date ? h('span', { class: 'cc-meta', title: p.dateFull || null }, `  ${p.date}`) : null),
      p.subject ? h('div', { class: 'cc-b' }, p.subject) : null,
      p.content);
  }

  const kv = (k, v) => [h('span', { class: 'cc-dim' }, (k + ':').padEnd(10)), v];

  /* ------------------------------------------------------------------ */
  /* 话题页素材                                                          */
  /* ------------------------------------------------------------------ */

  const ORG = 'acme';

  const READ_PROMPTS = [
    '看下 issue #{tid} 下面的讨论，总结一下大家反馈的问题，再确认要不要改',
    '#{tid} 这个 issue 评论有点多，帮我过一遍，挑出需要跟进的点',
    '把 issue #{tid} 的讨论整理一下，顺便看看和分页那个 bug 有没有关系',
  ];

  const READ_INTROS = [
    '我先把 issue 和评论拉下来逐条看一遍，再给结论。',
    '先拉取 issue 内容和评论，确认复现条件后再定位代码。',
  ];

  const READ_TODOS = ['拉取 issue 与评论', '整理复现步骤', '定位相关代码', '修复并补充测试', '回复 issue 并关联 PR'];

  const COMMENT_CMDS = [
    (repo, tid, o, n) => `gh issue view ${tid} --repo ${repo} --comments | sed -n '${o + 1},${o + n}p'`,
    (repo, tid, o, n, p) => `gh api "repos/${repo}/issues/${tid}/comments?page=${p}&per_page=${n}" --jq '.[] | .user.login + ": " + .body'`,
    (repo, tid, o, n, p) => `node scripts/export-comments.js --issue ${tid} --page ${p} --offset ${o} --limit ${n}`,
  ];

  /* ------------------------------------------------------------------ */
  /* 公共外壳                                                            */
  /* ------------------------------------------------------------------ */

  function getFid() {
    const m = /[?&]fid=(-?\d+)/.exec(location.search);
    if (m) return m[1];
    try {
      const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
      if (w.__CURRENT_FID) return String(w.__CURRENT_FID);
    } catch (e) { /* 页面变量不可用时忽略 */ }
    const links = [...document.querySelectorAll('#m_nav a[href*="fid="]')].reverse();
    for (const a of links) {
      const lm = /[?&]fid=(-?\d+)/.exec(a.getAttribute('href'));
      if (lm) return lm[1];
    }
    return '';
  }

  // 只保留主容器（隐藏作为数据源），其它区域全部移除，并注入伪装样式
  function prepare(container) {
    document.body.appendChild(container);
    REMOVE.forEach((sel) => document.querySelectorAll(sel).forEach((el) => {
      if (!el.contains(container)) el.remove();
    }));

    document.title = '✳ Claude Code';
    document.querySelectorAll('link[rel~="icon"]').forEach((l) => l.remove());
    const icon = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#d77757'/><path d='M16 7v18M7 16h18M9.6 9.6l12.8 12.8M22.4 9.6L9.6 22.4' stroke='#fff' stroke-width='3' stroke-linecap='round'/></svg>";
    document.head.append(h('link', { rel: 'icon', href: 'data:image/svg+xml,' + encodeURIComponent(icon) }));
    document.head.append(h('style', { id: 'cc-style' }, CSS));
    document.documentElement.classList.add('cc-on');
  }

  // 欢迎框、Tips 和穿插用的伪装输出
  function createSession(seed, fid) {
    const rng = mulberry32(hashStr(seed));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const deck = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      let k = 0;
      return () => a[k++ % a.length];
    };

    const project = PROJECTS[hashStr(fid || '0') % PROJECTS.length];
    const isWin = /Windows/i.test(navigator.userAgent);
    const cwd = isWin ? `C:\\Users\\dev\\code\\${project}` : `/Users/dev/code/${project}`;

    const transcript = h('div', { class: 'cc-transcript' });
    const add = (...nodes) => transcript.append(...nodes.flat());

    add(h('div', { class: 'cc-welcome' },
      h('div', { class: 'cc-line' }, h('span', { class: 'cc-claude' }, '✻'), ' ', h('span', { class: 'cc-b' }, 'Welcome to Claude Code!')),
      h('div', { class: 'cc-line' }, '\u00a0'),
      h('div', { class: 'cc-line cc-dim' }, '  /help for help, /status for your current setup'),
      h('div', { class: 'cc-line' }, '\u00a0'),
      h('div', { class: 'cc-line cc-dim' }, '  cwd: ' + cwd)));

    add(block('cc-dim',
      h('div', { class: 'cc-line' }, ' Tips for getting started:'),
      h('div', { class: 'cc-line' }, '\u00a0'),
      h('div', { class: 'cc-line' }, ' 1. Run /init to create a CLAUDE.md file with instructions for Claude'),
      h('div', { class: 'cc-line' }, ' 2. Use Claude to help with file analysis, editing, bash commands and git'),
      h('div', { class: 'cc-line' }, ' 3. Be as specific as you would with another engineer for the best results')));

    const nextDiff = deck(DIFFS);
    const nextText = deck(TEXTS);
    const nextRead = deck(READS);
    const nextSearch = deck(SEARCHES);
    const nextBash = deck(BASHES);
    let todos = [];
    let todoDone = 0;

    function filler() {
      const r = rng();
      if (r < 0.30) return diffBlock(nextDiff());
      if (r < 0.55) return textBlock(nextText(), 'cc-noise');
      if (r < 0.70) {
        const [file, n] = nextRead();
        return tool('cc-noise', 'Read', file, [['Read ', h('span', { class: 'cc-b' }, String(n)), ' lines (ctrl+r to expand)']]);
      }
      if (r < 0.82) {
        const b = nextBash();
        return tool('cc-noise', 'Bash', b.cmd, b.out.map((l) => l || '\u00a0'));
      }
      if (r < 0.90) {
        const [p, path, n] = nextSearch();
        return tool('cc-noise', 'Search', `pattern: "${p}", path: "${path}"`,
          [['Found ', h('span', { class: 'cc-b' }, String(n)), ' files (ctrl+r to expand)']]);
      }
      if (r < 0.95 && todoDone < todos.length - 1) return todosBlock(todos, ++todoDone);
      return thinkingBlock();
    }

    return {
      rng, pick, deck, project, transcript, add,
      startTodos(items) {
        todos = items;
        todoDone = 0;
        add(todosBlock(items, 0));
      },
      interlude() {
        add(filler());
        if (rng() < 0.3) add(filler());
      },
    };
  }

  // spinner、输入框、命令与键盘导航
  function mountShell(s, opts) {
    const { rng, pick, transcript } = s;
    const paging = opts.paging;
    const items = opts.items || [];

    /* ---------- spinner ---------- */

    const star = h('span', { class: 'cc-star' }, STAR_FRAMES[0]);
    const verb = h('span', null, pick(VERBS) + '…');
    const secs = h('span', null, '0s');
    const toks = h('span', null, '↓ 0.0k tokens');
    const spinner = h('div', { class: 'cc-spin' }, star, verb, ' ',
      h('span', { class: 'cc-dim' }, '(', secs, ' · ', toks, ' · ', h('span', { class: 'cc-b' }, 'esc'), ' to interrupt)'));

    let frame = 0;
    let elapsed = Math.floor(rng() * 40);
    let tokens = 400 + Math.floor(rng() * 2000);
    setInterval(() => { star.textContent = STAR_FRAMES[++frame % STAR_FRAMES.length]; }, 120);
    setInterval(() => {
      elapsed++;
      tokens += Math.floor(rng() * 60);
      secs.textContent = elapsed + 's';
      toks.textContent = `↓ ${(tokens / 1000).toFixed(1)}k tokens`;
      if (elapsed % 9 === 0) verb.textContent = pick(VERBS) + '…';
    }, 1000);

    /* ---------- input ---------- */

    const prompt = h('span', { class: 'cc-prompt' }, '> ');
    const input = h('input', { type: 'text', spellcheck: 'false', autocomplete: 'off', placeholder: 'Try "refactor <filepath>"' });
    const inputBox = h('div', { class: 'cc-input' }, prompt, input);

    const MODES = [
      { text: '? for shortcuts', cls: '' },
      { text: `⏵${VS}⏵${VS} accept edits on (shift+tab to cycle)`, cls: 'cc-mode-accept' },
      { text: `⏸${VS} plan mode on (shift+tab to cycle)`, cls: 'cc-mode-plan' },
    ];
    let mode = 0;
    const modeEl = h('span', null, MODES[0].text);
    const hints = h('div', { class: 'cc-hints' }, modeEl, h('span', null, ''));
    const shortcutLines = [
      ['!', 'bash 模式'],
      ['/', '输入命令'],
      ['shift + tab', '切换模式'],
      ...(opts.shortcuts || []),
      ['← / →', '翻页'],
      ['n / p', '翻页'],
      ['g / G', '顶部 / 底部'],
      ['esc', '清空输入 / 退出输入'],
      ['?', '打开 / 关闭快捷键'],
    ];
    const shortcuts = h('div', { class: 'cc-shortcuts', hidden: true },
      shortcutLines.map(([key, desc]) => `${key}  ${desc}`));

    function cycleMode() {
      mode = (mode + 1) % MODES.length;
      modeEl.textContent = MODES[mode].text;
      modeEl.className = MODES[mode].cls;
    }

    // 将输入相关元素包装到容器中
    const inputArea = h('div', { class: 'cc-input-area' }, inputBox, hints, shortcuts);
    const root = h('div', { id: 'cc-root' }, transcript, spinner, inputArea);
    if (gmGet('quiet', false)) root.classList.add('cc-quiet');
    if (gmGet('fixedInput', false)) root.classList.add('cc-fixed-input');
    document.body.appendChild(root);

    const append = (node) => {
      transcript.append(node);
      node.scrollIntoView({ block: 'nearest' });
    };
    const say = (msg, status) => append(status === 'err'
      ? block('', dotRow('cc-red', md(msg)))
      : textBlock(msg));

    function go(n) {
      say(`正在加载第 ${n} 页…`);
      location.href = pageUrl(n);
    }

    const commands = [
      ['/next, /n', ['/next', '/n'], '下一页', () => go(paging.cur + 1)],
      ['/prev, /p', ['/prev', '/p'], '上一页', () => (paging.cur > 1 ? go(paging.cur - 1) : say('已经是第 1 页了。'))],
      ['/page <N>', ['/page', '/goto'], '跳到第 N 页', (args) => {
        const n = parseInt(args[0], 10);
        return n > 0 ? go(n) : say('用法：`/page <页码>`', 'err');
      }],
      ['/refresh, /r', ['/refresh', '/r'], '刷新当前页', () => location.reload()],
      ...(opts.commands || []),
      ['/quiet', ['/quiet'], '隐藏 / 显示伪装输出', () => {
        const q = root.classList.toggle('cc-quiet');
        gmSet('quiet', q);
        say(q ? '已隐藏伪装输出。' : '已恢复伪装输出。');
      }],
      ['/top', ['/top'], '回到顶部', () => window.scrollTo(0, 0)],
      ['/exit', ['/exit'], '本次显示原始页面', () => {
        sessionStorage.setItem(BYPASS_KEY, '1');
        location.reload();
      }],
      ['/help', ['/help'], '显示本帮助', () => showHelp()],
    ];

    function helpLine(label, desc) {
      return [h('span', { class: 'cc-code' }, label.padEnd(16)), h('span', { class: 'cc-dim' }, desc)];
    }

    function showHelp() {
      append(tool('', 'Help', null, [
        h('span', { class: 'cc-b' }, 'Commands'),
        ...commands.map(([label, , desc]) => helpLine(label, desc)),
        '\u00a0',
        h('span', { class: 'cc-b' }, 'Shortcuts'),
        ...shortcutLines.map(([key, desc]) => helpLine(key, desc)),
      ]));
    }

    function run(raw) {
      const [cmd, ...args] = raw.split(/\s+/);
      const c = commands.find((x) => x[1].includes(cmd.toLowerCase()));
      if (c) return c[3](args);
      return say(`未知命令 \`${cmd}\`，输入 \`/help\` 查看可用命令。`, 'err');
    }

    function submit() {
      const v = input.value.trim();
      input.value = '';
      inputBox.classList.remove('cc-bashmode');
      prompt.textContent = '> ';
      if (!v) return;
      if (v.startsWith('!')) {
        append(tool('', 'Bash', v.slice(1).trim() || 'true', ['(No content)']));
        return;
      }
      append(userBlock(v));
      if (v.startsWith('/')) run(v);
      else setTimeout(() => say(pick(REPLIES)), 500 + rng() * 700);
    }

    input.addEventListener('input', () => {
      const bash = input.value.startsWith('!');
      inputBox.classList.toggle('cc-bashmode', bash);
      prompt.textContent = bash ? '! ' : '> ';
    });

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        if (input.value) { input.value = ''; input.dispatchEvent(new Event('input')); } else input.blur();
      } else if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); cycleMode(); }
    });

    /* ---------- 键盘导航 ---------- */

    let sel = -1;
    function select(i) {
      if (!items.length) return;
      sel = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((it, k) => it.el.classList.toggle('cc-sel', k === sel));
      items[sel].el.scrollIntoView({ block: 'nearest' });
    }
    function open(newTab) {
      const it = items[sel];
      if (!it || !it.url) return;
      if (newTab) window.open(it.url, '_blank', 'noopener');
      else location.href = it.url;
    }

    items.forEach((it, k) => it.el.addEventListener('click', (e) => {
      if (!e.target.closest('a')) select(k);
    }));

    window.addEventListener('keydown', (e) => {
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const focusInput = (prefill) => {
        input.value = prefill;
        input.dispatchEvent(new Event('input'));
        input.focus();
        inputBox.scrollIntoView({ block: 'nearest' });
      };
      const actions = Object.assign({
        j: () => select(sel + 1),
        k: () => select(sel < 0 ? 0 : sel - 1),
        Enter: () => open(false),
        o: () => open(true),
        n: () => go(paging.cur + 1),
        p: () => { if (paging.cur > 1) go(paging.cur - 1); },
        ArrowLeft: () => { if (paging.cur > 1) go(paging.cur - 1); },
        ArrowRight: () => go(paging.cur + 1),
        g: () => window.scrollTo(0, 0),
        G: () => window.scrollTo(0, document.documentElement.scrollHeight),
        '/': () => focusInput('/'),
        '!': () => focusInput('!'),
        i: () => focusInput(''),
        '?': () => { shortcuts.hidden = !shortcuts.hidden; },
      }, opts.keys);
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        cycleMode();
        return;
      }
      const fn = actions[e.key];
      if (!fn) return;
      e.preventDefault();
      e.stopPropagation();
      fn();
    }, true);

    cloak.remove();
    return root;
  }

  // 鼠标移入 [image] 占位符时悬浮展示图片，单击切换缩放档位
  function setupImagePreview(root) {
    const note = h('div', { class: 'cc-dim' }, 'loading…');
    const img = h('img', { alt: '', referrerpolicy: 'no-referrer-when-downgrade' });
    const zoomIndicator = h('div', { class: 'cc-zoom-indicator' }, '1x');
    const box = h('div', { class: 'cc-preview cc-zoom-0', hidden: true }, note, img, zoomIndicator);
    root.append(box);

    // 使用 WeakMap 存储每个 [image] 元素的缩放档位（0/1/2）
    const zoomLevels = new WeakMap();
    let cur = null;
    let lastEvt = null;

    const config = gmGet('zoomConfig', DEFAULT_ZOOM_CONFIG);
    const ZOOM_LABELS = [`${config.zoom0}%`, `${config.zoom1}%`, `${config.zoom2}%`];

    const place = () => {
      if (!lastEvt) return;
      const pad = 16;
      const w = box.offsetWidth;
      const ht = box.offsetHeight;
      let x = lastEvt.clientX + pad;
      let y = lastEvt.clientY + pad;
      if (x + w > window.innerWidth - 8) x = Math.max(8, lastEvt.clientX - pad - w);
      if (y + ht > window.innerHeight - 8) y = Math.max(8, window.innerHeight - 8 - ht);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
    };

    const hide = () => {
      if (cur) zoomLevels.delete(cur); // 清除档位状态
      cur = null;
      box.hidden = true;
      img.removeAttribute('src');
      box.className = 'cc-preview cc-zoom-0';
    };

    const updateZoom = (level) => {
      box.className = `cc-preview cc-zoom-${level}`;
      zoomIndicator.textContent = ZOOM_LABELS[level];
      // 档位切换后重新定位，避免图片变大后溢出屏幕
      setTimeout(place, 10);
    };

    root.addEventListener('mouseover', (e) => {
      const a = e.target.closest && e.target.closest('a.cc-img');
      if (!a || a === cur) return;
      cur = a;
      lastEvt = e;
      const src = a.getAttribute('data-src');
      const level = zoomLevels.get(a) || 0; // 读取档位，默认 0

      img.hidden = true;
      note.hidden = false;
      note.textContent = src ? 'loading…' : '[无法获取图片地址]';
      updateZoom(level);

      img.onload = () => {
        if (cur !== a) return;
        note.hidden = true;
        img.hidden = false;
        place();
      };
      img.onerror = () => {
        if (cur === a) note.textContent = '[图片加载失败]';
      };
      if (src) img.src = src;
      box.hidden = false;
      place();
    });

    root.addEventListener('mousemove', (e) => {
      if (!cur) return;
      lastEvt = e;
      place();
    });

    root.addEventListener('mouseout', (e) => {
      if (cur && !(e.relatedTarget && cur.contains(e.relatedTarget))) hide();
    });

    // 单击 [image] 切换档位：0 → 1 → 2 → 2（最大档保持）
    root.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a.cc-img');
      if (!a || a !== cur) return;

      // 阻止默认跳转行为，但保留 Ctrl/Cmd + 单击 和 中键单击
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      e.preventDefault();

      const level = zoomLevels.get(a) || 0;
      const newLevel = Math.min(level + 1, 2); // 最大档位为 2
      zoomLevels.set(a, newLevel);
      updateZoom(newLevel);
    }, true); // 捕获阶段处理，优先于其他点击事件

    window.addEventListener('scroll', () => { if (cur) hide(); }, { passive: true });
  }

  // 视频预览：鼠标移入显示封面，点击播放视频，移出重置状态
  function setupVideoPreview(root) {
    const config = gmGet('videoConfig', DEFAULT_VIDEO_CONFIG);
    
    const note = h('div', { class: 'cc-dim' }, 'loading…');
    const poster = h('img', { alt: '', referrerpolicy: 'no-referrer-when-downgrade' });
    const video = h('video', { controls: true, referrerpolicy: 'no-referrer-when-downgrade' });
    const indicator = h('div', { class: 'cc-video-indicator' }, '封面');
    const box = h('div', { class: 'cc-video-preview', hidden: true }, note, poster, video, indicator);
    root.append(box);
    
    let cur = null;
    let lastEvt = null;
    let isPlaying = false;
    
    const place = () => {
      if (!lastEvt) return;
      const pad = 16;
      const w = box.offsetWidth;
      const ht = box.offsetHeight;
      let x = lastEvt.clientX + pad;
      let y = lastEvt.clientY + pad;
      if (x + w > window.innerWidth - 8) x = Math.max(8, lastEvt.clientX - pad - w);
      if (y + ht > window.innerHeight - 8) y = Math.max(8, window.innerHeight - 8 - ht);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
    };
    
    const hide = () => {
      cur = null;
      isPlaying = false;
      box.hidden = true;
      poster.removeAttribute('src');
      poster.hidden = false;
      video.pause();
      video.removeAttribute('src');
      video.hidden = true;
      note.hidden = true;
    };
    
    const showPoster = (posterSrc) => {
      note.hidden = false;
      note.textContent = posterSrc ? 'loading…' : '[无封面]';
      poster.hidden = true;
      video.hidden = true;
      indicator.textContent = '封面';
      
      if (posterSrc) {
        poster.onload = () => {
          if (cur) {
            note.hidden = true;
            poster.hidden = false;
            // 根据配置比例设置封面尺寸
            const scale = config.posterScale / 100;
            poster.style.maxWidth = (poster.naturalWidth * scale) + 'px';
            poster.style.maxHeight = (poster.naturalHeight * scale) + 'px';
            place();
          }
        };
        poster.onerror = () => {
          if (cur) note.textContent = '[封面加载失败]';
        };
        poster.src = posterSrc;
      }
      
      box.hidden = false;
      place();
    };
    
    const playVideo = (videoSrc) => {
      poster.hidden = true;
      note.textContent = 'loading…';
      note.hidden = false;
      video.hidden = true;
      video.muted = config.autoMute;
      video.src = videoSrc;
      indicator.textContent = config.autoMute ? '播放中 (静音)' : '播放中';
      
      video.onloadedmetadata = () => {
        if (cur && isPlaying) {
          // 根据配置比例设置视频尺寸
          const scale = config.videoScale / 100;
          video.style.maxWidth = (video.videoWidth * scale) + 'px';
          video.style.maxHeight = (video.videoHeight * scale) + 'px';
          note.hidden = true;
          video.hidden = false;
          place();
        }
      };
      
      video.play().catch((err) => {
        console.error('Video play failed:', err);
        if (cur) {
          note.textContent = '[播放失败]';
          note.hidden = false;
          video.hidden = true;
        }
      });
      
      isPlaying = true;
    };
    
    root.addEventListener('mouseover', (e) => {
      const a = e.target.closest && e.target.closest('a.cc-video');
      if (!a || a === cur) return;
      cur = a;
      lastEvt = e;
      isPlaying = false;
      const posterSrc = a.getAttribute('data-video-poster');
      showPoster(posterSrc);
    });
    
    root.addEventListener('mousemove', (e) => {
      if (!cur) return;
      lastEvt = e;
      place();
    });
    
    root.addEventListener('mouseout', (e) => {
      if (cur && !(e.relatedTarget && (cur.contains(e.relatedTarget) || box.contains(e.relatedTarget)))) {
        hide();
      }
    });
    
    box.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget || (!box.contains(e.relatedTarget) && !cur?.contains(e.relatedTarget))) {
        hide();
      }
    });
    
    // 阻止占位符的默认跳转行为，并直接播放视频
    root.addEventListener('click', (e) => {
      const videoLink = e.target.closest && e.target.closest('a.cc-video');
      if (!videoLink) return;
      
      // 保留 Ctrl/Cmd + 单击 和 中键单击
      if (e.ctrlKey || e.metaKey || e.button === 1) return;
      
      // 阻止默认跳转
      e.preventDefault();
      e.stopPropagation();
      
      // 如果预览框未显示，先触发 mouseover 显示封面
      if (!cur || cur !== videoLink) {
        cur = videoLink;
        lastEvt = e;
        const posterSrc = videoLink.getAttribute('data-video-poster');
        showPoster(posterSrc);
      }
      
      // 直接播放视频
      if (!isPlaying) {
        const videoSrc = videoLink.getAttribute('data-video-src');
        if (videoSrc) playVideo(videoSrc);
      }
    }, true); // 捕获阶段处理，优先于其他点击事件
    
    window.addEventListener('scroll', () => { if (cur) hide(); }, { passive: true });
  }

  /* ------------------------------------------------------------------ */
  /* 列表页                                                              */
  /* ------------------------------------------------------------------ */

  function bootList(table) {
    const rows = parseRows(table);
    const paging = parsePaging();
    const fid = getFid();
    prepare(document.getElementById('m_threads') || table);

    const s = createSession(location.search || 'nga', fid);
    const { rng, add } = s;

    add(userBlock(s.pick(USER_PROMPTS)));
    add(textBlock(s.pick(INTROS)));
    s.startTodos(TODO_POOL.slice(0, 4 + Math.floor(rng() * 2)));

    const nextFetch = s.deck(FETCH_CMDS);
    const items = [];
    if (!rows.length) {
      add(tool('', 'Bash', nextFetch()(0, 30, paging.cur), ['(No content)']));
    }
    for (let i = 0; i < rows.length;) {
      const n = Math.min(3 + Math.floor(rng() * 4), rows.length - i);
      const lines = results(rows.slice(i, i + n).map(topicLine));
      lines.forEach((el, k) => {
        el.classList.add('cc-item');
        items.push({ el, url: rows[i + k].url });
      });
      add(block('', dotRow('cc-green', h('span', { class: 'cc-b' }, 'Bash'), '(', nextFetch()(i, n, paging.cur), ')'), lines));
      i += n;
      if (i < rows.length) s.interlude();
    }

    const total = paging.max > paging.cur ? `（共 ${paging.max} 批）` : '';
    add(textBlock(`第 ${paging.cur} 批共 ${rows.length} 条记录已核对完${total}。输入 \`/next\` 继续下一批，\`/prev\` 返回上一批，\`/help\` 查看全部命令。`));

    mountShell(s, { paging, items, shortcuts: ['j / k 选择话题', 'enter 打开 · o 新标签'] });
  }

  /* ------------------------------------------------------------------ */
  /* 话题页                                                              */
  /* ------------------------------------------------------------------ */

  // 从原始 DOM 提取楼主 UID（在元素被删除前调用）
  function extractOpUid() {
    const nodes = [
      document.getElementById('postauthor0'),
      document.querySelector('#post1strow0 a[href*="uid="], #posterinfo0 a[href*="uid="]'),
      document.querySelector('a[name="l0"]') && document.querySelector('a[name="l0"]').closest('tr, .postrow, table')
        && document.querySelector('a[name="l0"]').closest('tr, .postrow, table').querySelector('a[href*="uid="]'),
    ];

    for (const a of nodes) {
      if (!a) continue;
      const m = /[?&]uid=(\d+)/.exec(a.href || a.getAttribute('href') || '')
        || /userClick\(\s*event\s*,\s*"(\d+)"/.exec(a.getAttribute('onclick') || '');
      if (m) return m[1];
    }

    return null;
  }

  function bootRead(container) {
    // 预加载所有折叠内容（NGA 使用懒加载，需要触发加载）
    const collapseButtons = container.querySelectorAll('.collapse_btn button[name="collapseSwitchButton"]');
    collapseButtons.forEach((btn) => {
      // 模拟点击以触发内容加载
      try {
        btn.click();
      } catch (e) {
        // 忽略点击错误
      }
    });
    
    // 先提取数据再改动页面：提取失败时原页面保持完整
    const posts = parsePosts(container);
    if (!posts.length) throw new Error('no posts');
    const paging = parsePaging();
    const fid = getFid();
    const tidM = /[?&]tid=(\d+)/.exec(location.search);
    const tid = tidM ? tidM[1] : '0';
    const title = topicTitle();

    // 在删除元素前提取楼主 UID
    const opUidValue = extractOpUid();

    prepare(container);
    container.querySelectorAll(READ_STRIP).forEach((el) => el.remove());

    const s = createSession(`read:${tid}:${paging.cur}`, fid);
    const { rng, add } = s;
    const repo = `${ORG}/${s.project}`;

    add(userBlock(s.pick(READ_PROMPTS).replace('{tid}', tid)));
    add(textBlock(s.pick(READ_INTROS)));
    s.startTodos(READ_TODOS.slice(0, 4 + Math.floor(rng() * 2)));

    const items = [];
    let replies = posts;

    if (posts[0].floor === 0) {
      const p = posts[0];
      replies = posts.slice(1);
      const main = block('',
        dotRow('cc-green', h('span', { class: 'cc-b' }, 'Bash'), '(', `gh issue view ${tid} --repo ${repo}`, ')'),
        results([
          kv('title', h('span', { class: 'cc-b' }, title || p.subject || '(untitled)')),
          kv('state', h('span', { class: 'cc-green' }, 'OPEN')),
          kv('author', p.author || 'anonymous'),
          kv('created', h('span', { title: p.dateFull || null }, p.date)),
          kv('number', '#' + tid),
          h('span', { class: 'cc-dim' }, '--'),
          p.content,
        ]));
      main.classList.add('cc-item');
      main.id = 'cc-l0';
      items.push({ el: main });
      add(main);
      if (replies.length) s.interlude();
    } else {
      add(textBlock(`继续看 issue \`#${tid}\`「${title}」第 ${paging.cur} 页的评论。`));
    }

    const nextCmd = s.deck(COMMENT_CMDS);
    for (let i = 0; i < replies.length;) {
      const n = Math.min(2 + Math.floor(rng() * 3), replies.length - i);
      const group = replies.slice(i, i + n);
      const lines = results(group.map(postLine));
      lines.forEach((el, k) => {
        el.classList.add('cc-item', 'cc-postres');
        el.id = 'cc-l' + group[k].floor;
        items.push({ el });
      });
      add(block('', dotRow('cc-green', h('span', { class: 'cc-b' }, 'Bash'), '(', nextCmd()(repo, tid, i, n, paging.cur), ')'), lines));
      i += n;
      if (i < replies.length) s.interlude();
    }

    const total = paging.max > paging.cur ? `（共 ${paging.max} 页）` : '';
    add(textBlock(`第 ${paging.cur} 页共 ${posts.length} 条记录已看完${total}。输入 \`/next\` 继续，\`/prev\` 返回上一页，\`/back\` 回到列表。`));

    const back = () => {
      if (fid) location.href = location.origin + '/thread.php?fid=' + fid;
      else history.back();
    };
    const authorOn = /[?&]authorid=\d+/.test(location.search);
    // 楼主 UID 已在页面改造前提取并缓存
    const opUid = () => opUidValue || '';
    const onlyAuthor = () => {
      if (authorOn) {
        location.href = pageUrl(1, ['authorid']);
        return;
      }
      const uid = opUid();
      if (!uid) return s.add(textBlock('找不到楼主，无法只看作者。'));
      location.href = authorFilterUrl(uid);
    };
    const root = mountShell(s, {
      paging,
      items,
      shortcuts: ['j / k 切换楼层', 'u 返回列表'],
      commands: [
        ['/back, /b', ['/back', '/b'], '返回话题列表', back],
        ['/oa', ['/oa'], authorOn ? '取消只看楼主，显示全部回复' : '只看楼主（再次输入恢复全部）', onlyAuthor],
      ],
      keys: { u: back },
    });
    setupImagePreview(root);
    setupVideoPreview(root);

    // 带 #l12 这类楼层锚点进入时定位到对应楼层
    const lm = /^#l(\d+)$/.exec(location.hash);
    const target = lm && document.getElementById('cc-l' + lm[1]);
    if (target) target.scrollIntoView({ block: 'start' });
  }

  /* ------------------------------------------------------------------ */
  /* 入口                                                                */
  /* ------------------------------------------------------------------ */

  // 话题页正文由页面脚本把 UBB 渲染成 HTML，等页面 load（最多等 maxWait）再提取
  function whenSettled(maxWait) {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') return resolve();
      const timer = setTimeout(resolve, maxWait);
      window.addEventListener('load', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }

  function start() {
    const isRead = /\/read\.php$/i.test(location.pathname);
    const ready = isRead
      ? waitFor('[id^="postcontent"]', 6000).then((el) => whenSettled(1200).then(() =>
        document.getElementById('m_posts') || el.closest('.module_wrap') || el.closest('table').parentElement))
      : waitFor('#topicrows', 6000);

    ready.then((el) => {
      try {
        if (isRead) bootRead(el);
        else bootList(el);
      } catch (err) {
        console.error(TAG, err);
        document.documentElement.classList.remove('cc-on');
        const root = document.getElementById('cc-root');
        if (root) root.remove();
        cloak.remove();
      }
    }, () => cloak.remove()); // 没有内容（未登录、错误页等）时恢复原页面
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
