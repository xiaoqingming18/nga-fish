# NGA 版块话题列表页 HTML 结构分析

分析对象：`https://bbs.nga.cn/thread.php?fid=-7955747`（晴风村）

- 页面标题：`晴风村 NGA玩家社区`
- 页面编码：`GB18030`（不是 UTF-8，抓取时务必按 GBK/GB18030 解码）
- 实测 `document.documentElement.outerHTML` 约 109 KB，含 `#topicrows` 一个话题表格
- 未登录会返回 403 + "未登录"页，必须带 Cookie 才能拿到真实列表

---

## 一、页面整体骨架

```
body
├── #minWidthSpacer / #mmc / #custombg / #mc        外观与布局壳
├── #mainmenu + #menusearchinput                    顶部主菜单与站内搜索
├── #m_nav        .module_wrap                      面包屑导航（N G A » 晴 风 村）
├── #m_pbtntop    .module_wrap → #pagebtop          顶部分页条
├── #m_threads    .module_wrap                       ★ 话题列表主容器
│   └── div.w100
│       ├── #toptopics   .forumbox                  置顶帖/版规区（一行公告 + 版规 UBB 渲染）
│       ├── <span>                                  分隔
│       ├── <script>                                topicArg 初始化脚本
│       ├── #topicrows   .forumbox                   ★★ 话题列表表格，34 行
│       └── <script>                                topicArg 初始化脚本（尾部）
├── #m_pbtnbtm    .module_wrap → #pagebbtm          底部分页条
├── #m_fopts      .module_wrap                      筛选/排序选项
├── #b_nav        .module_wrap                      底部版块导航（more_sub_forums_c）
├── #fast_post_c                                    快速发帖入口
└── #footer       .cpinfo                           页脚
```

关键容器：**`#m_threads > .w100 > #topicrows`**。列表数据全部在 `#topicrows` 这张 `<table class="forumbox">` 里。

---

## 二、话题列表表格 `#topicrows` 结构

```
<table id="topicrows" class="forumbox" cellspacing="1px">
  <!--topicliststart-->
  <tbody>
    <tr class="row1 topicrow">   <!-- row1 / row2 交替，仅用于条纹背景 -->
      <td class="c1">…回复数…</td>
      <td class="c2">…标题 + 分页…</td>
      <td class="c3">…作者 + 发帖时间…</td>
      <td class="c4">…最后回复时间 + 回复者…</td>
    </tr>
  </tbody>
  <script>commonui.topicArg.add(...)</script>   <!-- 紧跟在每个 <tbody> 之后 -->
  <tbody>
    <tr class="row2 topicrow">…</tr>
  </tbody>
  <script>…</script>
  …
</table>
```

要点：

- **每个话题是独立的 `<tbody>`**，内含恰好一个 `<tr class="rowN topicrow">`（`N` 在 row1/row2 之间交替，纯样式）。`#topicrows` 共 34 个话题行。
- `<tbody>` **之后紧跟一段 `<script>commonui.topicArg.add(...)</script>`**，共 35 段（34 个列表行 + 1 个额外）。行数据既在 DOM 属性里，也在这段 JS 的参数里。
- 每行固定 **4 列**：`c1 / c2 / c3 / c4`，列内元素都带 `t_*` 前缀的 id，命名规律为 `t_{字段}{组}_{序号}`，例如第 0 行：
  - `t_rc1_0` 回复数链接，`t_tt1_0` 标题链接，`t_pc1_0` 分页容器
  - `t_ta1_0` 作者，`t_pt1_0` 发帖时间
  - `t_rt1_0` 最后回复时间，`t_tr1_0` 最后回复者

### 各列明细

**`td.c1` — 回复数**

```html
<td class="c1">
  <a id="t_rc1_0" title="打开新窗口" href="/read.php?tid=46203692"
     target="_blank" class="replies"
     style="font-size: 1.667em; color: rgb(181, 122, 123);">67</a>
</td>
```

- 文本即回复数；`href` 指向帖子首页 `/read.php?tid=<tid>`。
- 颜色/字号按热度动态设定（热帖偏红、字号放大）。

**`td.c2` — 标题 + 话题分页**（信息量最大的一列）

```html
<td class="c2">
  <!-- 悬停提示，绝对定位且 display:none，可忽略 -->
  <span style="…display:none…"><a href="/thread.php?key=…&fid=-7955747">[无尽宴会]</a></span>

  <!-- 主标题链接：class 承载语义 -->
  <a href="https://bbs.nga.cn/read.php?tid=46203692"
     id="t_tt1_0" class="topic red b ">
    <span class="silver">[无尽宴会]</span>晴风村小型征友活动 投稿公示第70期————情人节特辑
  </a>
  <span></span>

  <!-- 帖子内分页，id 为 t_pc1_0 -->
  <span id="t_pc1_0">
    <span class=" pager"> [  <a href="…&page=1" class="silver">1</a> … ]</span>
  </span>
</td>
```

- 标题链接 id = `t_tt1_0`，`href` = `/read.php?tid=<tid>`（绝对或相对两种写法都会出现）。
- **`class` 承载话题状态**，实测出现过的取值：
  - `topic` — 基础类
  - `b` — 加粗（有新内容/未读）
  - `red` — 红色高亮（公告/热帖等）
  - 标题内的 `<span class="silver">[无尽宴会]</span>` 是**话题标签**（方括号前缀），标签同时可用 `/thread.php?key=<标签>&fid=<fid>` 做筛选。
- **`t_pc1_0` 是帖子内分页**，`<span class="pager">` 内 `[ 1 2 3 4 ]` 形式；页数多时折叠为 `1 2 3 4 5 ... 139`。这才是"标题列里那个分页"的真身——和页面级翻页是两回事。

**`td.c3` — 作者 + 发帖时间**

```html
<td class="c3">
  <!-- 右上角排序按钮，可忽略 -->
  <div style="…float:right…"><a title="按发布时间排序" href="javascript:void(0)">▼</a></div>
  <a href="/nuke.php?func=ucp&uid=38038219" class="author" id="t_ta1_0"
     title="用户ID 38038219">
     <b class="block_txt" name="nameinit" … title="windflytosky ">w</b>indflyto<span class="b silver">…</span>
  </a>
  <span class="silver postdate" id="t_pt1_0" title="26-02-14 09:22">02-14 09:22</span>
</td>
```

- 作者链接 id = `t_ta1_0`，`href` = `/nuke.php?func=ucp&uid=<uid>`，`title="用户ID <uid>"` **直接给出 uid**（比解析 href 更可靠）。
- 用户名被拆散：首字符放在 `<b class="block_txt">` 里做彩色首字母块，其余文字是文本节点，过长时以 `<span class="b silver">…</span>` 截断。**要取完整用户名，优先用 `b.block_txt` 的 `title` 属性**。
- 发帖时间 `#t_pt1_0`：可见文本是精简格式（`02-14 09:22`、`今天 09:37`、`25分钟前`），**完整时间戳在 `title` 属性**（`26-02-14 09:22`）。

**`td.c4` — 最后回复**

```html
<td class="c4">
  <div style="…float:right…"><a title="按最后回复时间排序" href="javascript:void(0)">▼</a></div>
  <a href="https://bbs.nga.cn/read.php?tid=46203692&page=e"
     class="silver replydate" id="t_rt1_0" title="26-10-05 22:14">10-05 22:14</a>
  <span class="replyer" id="t_tr1_0">
     <b class="block_txt" … title="mikan_takami ">m</b>ikan_taka<span class="b silver">…</span>
  </span>
</td>
```

- 最后回复时间 `#t_rt1_0`，`href` 带 `&page=e` 表示"最后一页"；完整时间同样在 `title`。
- 回复者 `#t_tr1_0`（`span.replyer`），用户的处理方式与 c3 相同（`b.block_txt` 的 `title` 是完整名）。
- 当帖子无回复或时间为"刚才"时，这一列格式会有差异（实测存在 `刚才` 这种文本）。

---

## 三、`commonui.topicArg.add(...)` 脚本

每个话题行后面都跟着一段脚本，把该行元数据注册给页面的 JS：

```js
commonui.topicArg.add(
't_rc1_0','t_tt1_0','t_ta1_0','t_pt1_0',
't_tr1_0','t_rt1_0','t_pc1_0',
'-7955747',46203692,'','','0',1771032138,1791209662,67,
134217760,'AQAAACE','',
null,'',null,'',''
)
```

参数含义（对照 DOM 实测推定）：

| 位置 | 值 | 含义 |
|---|---|---|
| 1–7 | `t_rc1_0`,`t_tt1_0`,`t_ta1_0`,`t_pt1_0`,`t_tr1_0`,`t_rt1_0`,`t_pc1_0` | 该行各元素的 id：回复数/标题/作者/发帖时间/回复者/回复时间/分页 |
| 8 | `-7955747` | **fid**（版块 ID） |
| 9 | `46203692` | **tid**（主题 ID） |
| 12 | `'0'` | 状态/标记位 |
| 13 | `1771032138` | **发帖时间戳**（Unix 秒，≈2026-02-14 09:22） |
| 14 | `1791209662` | **最后回复时间戳**（Unix 秒，≈2026-10-05 22:14） |
| 15 | `67` | **回复数** |
| 16 | `134217760` | 权限/可见性位掩码（`0x080000E0`） |
| 17 | `'AQAAACE'` | 该帖会话/加密标识串 |

> 这张表里 `fid`/`tid`/两个时间戳/回复数是后续写抓取器时最有价值的结构化字段——**不用解析日期文本，直接取这段脚本里的整数时间戳即可**。

---

## 四、页面级翻页

页面级翻页和帖内分页完全不同，位于列表表格之外的独立容器，上下各一份：

```html
<div class="left" id="pagebtop" name="pageball">   <!-- 底部为 #pagebbtm，结构一致 -->
  <table class=" stdbtn" cellspacing="0">
    <tr>
      <td><a href="/thread.php?fid=-7955747&page=2" title="下一页" class=" uitxt1">后页</a></td>
      <td><a href="/thread.php?fid=-7955747" class=" invert" title="">&nbsp;1̣&nbsp;</a></td>
      <td><a href="/thread.php?fid=-7955747&page=2" class=" uitxt1">&nbsp;2&nbsp;</a></td>
      …
      <td><a href="javascript:void(0)" name="topage" title="到指定的页数" class=" uitxt1">到</a></td>
    </tr>
  </table>
</div>
```

- 翻页 URL 形如 `/thread.php?fid=<fid>&page=<N>`，第 1 页可省略 `page`。
- 当前页用 `class="invert"` 标记，其余页码 `class="uitxt1"`。
- 还有 `name="topage"` 的"跳到指定页"入口（走 JS）。

---

## 五、置顶区 `#toptopics`

```html
<div id="toptopics" class="forumbox">
  <div class="contentBlock">
    <h3>
      <a class="block_txt block_txt_c0" href="/thread.php?fid=-7955747">&nbsp;晴风村&nbsp;</a>
      <a href="/read.php?tid=22657848">晴风村——see myself in your eyes</a>
    </h3>
    <span class="gray descrip"></span>
    <span class="postrow">
      <span id="toppedtopic" class="c2 postcontent ubbcode">
        <div class="ubbcode">…版规公告，NGA 的 UBB 富文本渲染结果…</div>
      </span>
    </span>
  </div>
</div>
```

- 版块名在 `h3` 里，第二个 `<a>` 是版块副标题/宣言。
- `#toppedtopic` 内是 **UBB 渲染后的公告/版规富文本**，内含动态生成的 `table#tagTB*`，其 `td/tr` 的 id 也是 `tagTB*` 这种生成 id——**这一段结构不稳定，抓取时应整体跳过或只取纯文本**。

---

## 六、编写抓取器时的实操建议

1. **编码**：响应体按 `GB18030` 解码，别用 UTF-8。
2. **必须带 Cookie**：裸请求 403，返回的是"未登录"页（`<title>未登录</title>`），要用已登录会话的 Cookie 或浏览器上下文。注意该页面还会加载 `w.cnzz.com` 统计脚本。
3. **定位列表**：`#topicrows` 内 `tr.topicrow`，每行 4 个 `td`（`c1`–`c4`）。
4. **取字段**：
   - tid：`a[id^=t_tt1_].href` 中的 `tid=`，或脚本参数第 9 位。
   - 标题：`a[id^=t_tt1_]` 的文本；标签是其中的 `[xxx]`（也见第一个 `span`）。
   - 状态：`a[id^=t_tt1_]` 的 class（`red`/`b` 等）。
   - 回复数：`a[id^=t_rc1_].textContent`（脚本第 15 位同值）。
   - uid：`a[id^=t_ta1_].title` → `用户ID <uid>`。
   - 完整用户名：`#t_ta1_N b.block_txt` 的 `title`。
   - 发帖/最后回复时间：优先用 `commonui.topicArg.add` 里的两个 Unix 时间戳（脚本第 13、14 位），DOM 文本是相对格式、不可直接比较。
5. **置顶/公告区** (`#toptopics`) 和页脚版的 UA 相关信息与列表无关，跳过。
6. **分页**：容器 `#pagebbtm`（或 `#pagebtop`）里的 `a[href*="page="]`；`invert` 类是当前页。帖内的 `span.pager` 不要和它混淆。

---

## 附：一行原始 HTML（第 0 行完整）

```html
<tr class="row1 topicrow">
  <td class="c1"><a id="t_rc1_0" title="打开新窗口" href="/read.php?tid=46203692" target="_blank" class="replies" style="font-size: 1.667em; color: rgb(181, 122, 123);">67</a></td>
  <td class="c2">
    <span style="…display:none…"><a href="/thread.php?key=%5B%E6%97%A0%E5%B0%BD%E5%AE%B4%E4%BC%9A%5D&amp;fid=-7955747">[无尽宴会]</a> </span>
    <a href="https://bbs.nga.cn/read.php?tid=46203692" id="t_tt1_0" class="topic red b "><span class="silver">[无尽宴会]</span>晴风村小型征友活动 投稿公示第70期————情人节特辑</a>
    <span></span>
    <span id="t_pc1_0"><span class=" pager"> [  <a href="…&amp;page=1" class=" silver">1</a> … ]</span></span>
  </td>
  <td class="c3">
    <div style="…float:right…"><a title="按发布时间排序" href="javascript:void(0)">▼</a></div>
    <a href="/nuke.php?func=ucp&amp;uid=38038219" class="author" id="t_ta1_0" title="用户ID 38038219"><b class="block_txt" name="nameinit" … title="windflytosky ">w</b>indflyto<span class="b silver">…</span></a>
    <span class="silver postdate" id="t_pt1_0" title="26-02-14 09:22">02-14 09:22</span>
  </td>
  <td class="c4">
    <div style="…float:right…"><a title="按最后回复时间排序" href="javascript:void(0)">▼</a></div>
    <a href="…&amp;page=e" class="silver replydate" id="t_rt1_0" title="26-10-05 22:14">10-05 22:14</a>
    <span class="replyer" id="t_tr1_0"><b class="block_txt" … title="mikan_takami ">m</b>ikan_taka<span class="b silver">…</span></span>
  </td>
</tr>
```
