<!-- 本文件是 huein-lightfield-ui-style 技能的第 2 步参考。做法与踩坑，可直接照做。 -->

# 02 · 悬浮岛外壳（几何 · 收起展开 · 首帧 · 记忆）

> 七步里的**第 2 ~ 4 步**。做完第 1 步（token）之后读这一份。

## 一、几何：一圈等宽的留白是全部成本

```css
:root {
  --island-gap: 12px;
  --island-radius: var(--r-4);
  --island-w: 244px;      /* 侧栏展开宽 */
  --rail-w: 76px;         /* 侧栏收起后的图标栏宽 */
  --topbar-h: 56px;
}

.shell {
  display: grid;
  grid-template-columns: var(--island-w) minmax(0, 1fr);
  gap: var(--island-gap);
  padding: var(--island-gap);
  min-height: 100vh;
  align-items: start;
}

.shell__main {
  display: flex;
  flex-direction: column;
  gap: var(--island-gap);
  /* ⚠️ 必须减掉上下留白，否则页面底部多出一条永远滚不到底的空白 */
  min-height: calc(100vh - var(--island-gap) * 2);
}

.sidebar, .topbar {
  position: sticky;
  top: var(--island-gap);
  border: 1px solid var(--glass-border);
  border-radius: var(--island-radius);
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-2);
}

/* 侧栏高度按「视口减上下留白」算。用 100vh 会让底部一段永远露在屏幕外 */
.sidebar { height: calc(100vh - var(--island-gap) * 2); }
```

**留白必须在四周和中间是同一个数**。侧栏 `x` = 12、顶栏 `x` = 侧栏右边 + 12、
顶栏右边缘距视口右缘 12 —— 四个数字一致，才像「一套」。
（验证时右边要对 **`documentElement.clientWidth`** 算，不是 `innerWidth`；
实测 2560 的窗口里滚动条吃掉 10px，用 innerWidth 会差 10。）

侧栏宽度走 CSS 变量、由 `grid-template-columns` 消费，收起时只换变量 ——
过渡由 `grid-template-columns` 自己插值。

```css
.shell { transition: grid-template-columns 460ms var(--ease-enter); }
html.is-rail .shell { grid-template-columns: var(--rail-w) minmax(0, 1fr); }
```

> ⚠️ 这违反了「只动 transform 与 opacity」的常规纪律。但侧栏收起**必然**要改变
> 内容区可用宽度；用 transform 假装不动只会得到一个盖在内容上的浮层。
> 一次性用户操作、代价可控，所以是有意为之 —— **把它写进注释**，
> 否则下一个人会当成 bug「修」回去。

## 二、入场动画：两个岛用两种展开方式

用户的原话往往是可执行的设计稿：「侧栏从上向下逐个从左侧进入」「顶栏从上向下
并同时从中心向两侧展开」。翻译成 CSS：

```css
/* 侧栏：从左边缘向右展开（收起状态 = 左边一条线） */
@keyframes island-unfold-x {
  from { clip-path: inset(0 100% 0 0 round var(--island-radius)); transform: translateX(-12px); opacity: 0.35; }
  to   { clip-path: inset(0 0 0 0 round var(--island-radius));     transform: none;               opacity: 1; }
}

/* 顶栏：位移负责「从上往下」，clip-path 的左右内缩负责「从中心向两侧」 */
@keyframes island-unfold-center {
  from { clip-path: inset(0 50% 0 50% round var(--island-radius)); transform: translateY(-16px); opacity: 0.35; }
  to   { clip-path: inset(0 0 0 0 round var(--island-radius));     transform: none;              opacity: 1; }
}
```

**为什么用 clip-path 而不是动 width**：动 width 会让内部内容每一帧重新折行
（搜索框、面包屑都在跳）；clip-path 只裁剪渲染，不参与布局。
`round var(--radius)` 让裁剪窗口保持圆角，中途不会露出直角。

**岛内条目按 DOM 顺序错峰滑入**：

```css
@keyframes huein-island-item {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}

.island-in {
  animation: huein-island-item 640ms var(--ease-enter) both;
  animation-delay: calc(80ms + min(var(--i, 0), 18) * 26ms);
  /*                 ↑ 错峰封顶：26 项每项 +26ms，最后一项要等 750ms —— 那不是「依次进入」，是「加载很慢」 */
}
```

`--i` **写在服务端模板里**（`style="--i:<?= $step++ ?>"`），不要交给 JS：
动画在首屏就开始播，等 JS 跑到再补 `--i`，用户会先看到一排同时出现、再各归各位。

## 三、动画残留必须清掉

入场动画用 `animation-fill-mode: both` —— 播完之后**终态会永久留在元素上**。
侧栏和顶栏因此长期持有 `transform`，而**祖先一旦有 transform，
`position: fixed` 后代的包含块就不再是视口**（这条坑的完整记录在
`kanban-drag-confirm` 技能里，代价是一个遮罩塌成 1932×265 的横带）。

```js
// 用一个略大于最长链的固定超时，而不是 animationend：
// 岛内有一批子动画（每个菜单项一条），animationend 会冒泡、要逐个判断元素与动画名
window.setTimeout(() => document.documentElement.classList.add('is-entered'), 1400);
```
```css
html.is-entered .sidebar,
html.is-entered .topbar,
html.is-entered .island-in { animation: none; }
```

⚠️ 减动画偏好下要**同时**关掉动画，但**不要**补 `opacity: 1` ——
这两条动画的基础态本来就是「可见 + 无位移」，只是从别处飞进来而已。
（对比：靠动画从 `opacity: 0` 显示出来的元素，那个必须补可见度，否则就是空白。）

## 四、两种收起，对应两类需求

| 岛 | 收起成什么 | 为什么 |
|---|---|---|
| 侧栏 | **图标栏（76px）** | 导航是高频动作。真收没了，每次都得先展开一次 |
| 顶栏 | **整个浮走** | 顶栏的价值是「我在哪」，收起的目的是把**纵向空间**还回来 |

### 图标栏

```css
html.is-rail .nav__title,
html.is-rail .brand__text,
html.is-rail .nav__count { display: none; }

/* 分组标题退化成一条细线：分组关系还在，但不需要占一行文字。
   height:1px + overflow:hidden 会让文字对读屏仍然可见 —— 这是想要的。 */
html.is-rail .nav__label {
  height: 1px; padding: 0; margin: var(--sp-3) var(--sp-3);
  background: var(--line-soft); overflow: hidden; pointer-events: none;
}

/* 只剩图标时折叠分组没有意义，只会藏起入口 */
html.is-rail .collapse { grid-template-rows: 1fr; }
```

**图标栏必须给每个条目补 `title`**（原生 tooltip）。不要自己画气泡：
侧栏是 `overflow: auto`，画在里面的气泡会被横向裁掉，而原生 tooltip 不受裁剪影响。
用 JS 在切换时加/删 `title`，展开态不必背着一堆唠叨的 tooltip。

### 顶栏浮走并把空间还回来

只做位移的话，顶栏走掉了但位置还留着，页面顶部空出一条说不清是什么的带子：

```css
html.is-nobar .topbar {
  transform: translateY(calc(-100% - var(--island-gap) * 2));
  opacity: 0;
  pointer-events: none;
  margin-bottom: calc(-1 * (var(--topbar-h) + var(--island-gap)));   /* ← 把空间收回来 */
  transition: transform 460ms var(--ease-enter), opacity 420ms, margin-bottom 460ms;
}
```
（`--topbar-h` 要**写死并真的用 height**，不然负 margin 的数学对不上。）

### ⚠️「展开」的入口别浮在右上角

第一版把「展开顶栏」做成右上角一颗浮动小岛 —— 结果它**正好压住页面头那一排
操作按钮**（内容顶上去之后，右边缘就是视口右边缘）。宽屏上因为内容有 max-width
看不出来，中等宽度就露馅。

→ 放进**侧栏头部**：永远不会和任何东西重叠，而且和「收起侧栏」在同一处，
用户找「收起的壳怎么展开」只需要看一个地方。只在顶栏收起时出现：

```css
.island-toggle--bar { display: none; }                    /* ⚠️ 必须写在 .island-toggle 之后！ */
html.is-nobar .sidebar .island-toggle--bar { display: inline-flex; }
```

## 五、收起状态必须在首屏之前定下来

```html
<!-- <head> 里的内联脚本，和主题同一处 -->
<script>
try {
  var doc = document.documentElement;
  if (localStorage.getItem('huein-rail') === '1') { doc.classList.add('is-rail'); }
  if (localStorage.getItem('huein-nobar') === '1') { doc.classList.add('is-nobar'); }
} catch (err) { /* 隐私模式读不了，按默认展开渲染 */ }
</script>
```

等 app.js 跑到再收，用户会**先看到展开的样子再「啪」地收起来**。
同理，动画的 `--i` 也走服务端渲染。

## 六、窄屏上的三个坑（都是实测出来的）

### ① 高特异性规则会盖掉媒体查询

```css
/* ❌ 手机单列被下面这条顶回两列 */
html.is-rail .shell { grid-template-columns: var(--rail-w) minmax(0, 1fr); }   /* 0-2-1 */
@media (max-width: 820px) { .shell { grid-template-columns: minmax(0,1fr); } } /* 0-1-0 输 */
```

手机上 `.sidebar { display: none }` 之后，`.shell__main` 会顶到**第一列**（76px），
整个页面被压成一根竖条。修法是把两列都写死：

```css
@media (max-width: 820px) {
  .shell,
  html.is-rail .shell { grid-template-columns: minmax(0, 1fr); }
}
```

### ② `left: 50%` + shrink-to-fit = 只有半屏可用

```css
/* ❌ 固定定位元素只写 left:50%，可用宽度 = 视口右边那一半 */
.dock { position: fixed; left: 50%; transform: translateX(-50%); }
/* 实测：390 宽的屏上 dock 只有 195×113，四个 tab 挤成两行、文字竖排 */
```
```css
.dock { width: max-content; max-width: calc(100vw - var(--gutter) * 2); }   /* ✅ */
```

### ③ 内联的两栏布局不会自己堆叠

`team/roles` 和 `team/ai-role` 各写了一段内联样式：
`grid-template-columns: minmax(200px,250px) minmax(0,1fr)`。手机上右栏只剩 118px，
里面的 `minmax(300px,1fr)` 网格直接溢出，**整页横向滚动（实测 598 > 390）**。
→ 抽成 `.split-panel` 类 + `@media (min-width: 1101px)` 才并排。

顺带：`.card__head` 加 `flex-wrap: wrap`。卡片头里通常塞着
「标题 + 说明 + 一个 pill + 一个按钮」，窄屏不让换行的结果不是挤一挤，而是整页横滚。

## 七、图标栏的「悬停临时展开」—— 做过，砍掉了

> **别再做第二次。** 我最初的理由听起来仍然成立，所以很容易重做，所以记在这里。

第一版做了「鼠标进图标栏就临时摊开」，理由是「图标栏省的是空间，不是不想用导航，
想看菜单不该先点两下」。上线后用户的原话是**「太鸡肋了」**。砍掉。

为什么当初的理由站不住：

- 图标栏的用处是**稳定、可预期**。悬停改宽度 = 鼠标移进移出的每一刻它都在动；
  想点第三个图标，得先等它展开完再动，或者穿过两次形变。
- 收益是「少点一次那颗按钮」，成本是**每一次路过**都要一次布局动画。
  悬停是最高频的动作，拿它换一次点击，频率上完全不划算。

顺带消失了**一整串复杂度** —— 它们全都是为这个效果才存在的：
`:not(.is-peek)` 的反向样式组、只在 `(hover: hover)` 上绑 JS 的兼容分支、
「宽度必须写成具体长度才能插值」的硬要求、悬停 110ms 延迟防误触。

砍完的直接收益：

```css
/* 规则可以直接写，不用再套 :not(.is-peek) */
html.is-rail .nav__title,
html.is-rail .brand__text { display: none; }
```
```css
/* 侧栏宽度交回栅格管 —— 下面那两条本来只是为了「让宽度可插值」才硬写的 */
/* .sidebar { justify-self: start; width: var(--sidebar-w); } */
/* html.is-rail .sidebar { width: var(--rail-w); } */
```

> 教训：**「听起来成立的理由」不等于「值得的交互」**。
> 判据是「这事每天发生多少次 × 每次换来什么」。悬停的频次是最高的一档，
> 而它只换来省一次点击 —— 那就该砍。

## 八、入场动画只在**本次会话第一次**加载播

服务端渲染的多页应用，每次跳转都是全新加载。不拦的话，点一次菜单就要
从头看一遍两个岛铺开、几十个条目逐个滑入 —— 第一次叫「入场」，
第十次叫「每次都挡在我和内容之间」。

```html
<script>  <!-- 和主题、收起状态同一处，<head> 里 -->
var first = true;
try {
  first = sessionStorage.getItem('huein-entered') !== '1';
  sessionStorage.setItem('huein-entered', '1');
} catch (err) { /* 隐私模式：读不到就当首次，宁可多播一次 */ }
if (!first) { document.documentElement.classList.add('is-reentered'); }
</script>
```
```css
html.is-reentered .sidebar,
html.is-reentered .topbar,
html.is-reentered .island-in { animation: none; }
```

用 **sessionStorage** 而不是 localStorage：开新标签页 = 新会话 = 该看到入场，
刷新不重播。注意登录页若用另一套布局（没有这两个岛），它**不占用这个「第一次」**——
所以「登录后进入外壳」那一次仍然会播，这通常正是想要的。

## 九、来自 localStorage 的状态，必须在**解析期**应用

同一个根因踩了两次，两次的表现完全不同 —— 所以这条值得单独一节。

| 没在解析期做 | 用户看到的样子 | 实测 |
|---|---|---|
| 导航滑动的「起手」（给旧项补着色、把新项按住） | 侧栏亮着，但**没有任何一项被选中** | 5 帧 ≈ 80ms |
| 侧栏分组的折叠状态 | 刷新后先按服务端那版画一遍，**再瞬间收起 / 展开** | 1 帧 |

服务端渲染读不到 localStorage，所以「服务端猜一版 + 客户端纠正」这个结构没问题 ——
问题在**纠正的时机**。`<script type="module">` 是 deferred，它跑到之前浏览器已经画过了。

**做法：能挪到解析期的就挪过去。** 解析到侧栏模板末尾时侧栏已经在 DOM 里了，
而且比第一次绘制早：

```php
</aside>
<script>
(function () {
  var doc = document.documentElement;
  var nav = document.querySelector('.sidebar .nav');
  if (!nav) { return; }

  /* ① 折叠状态 —— 每一页都要做 */
  try {
    var saved = JSON.parse(localStorage.getItem('huein-collapsed') || '{}') || {};
    /* …对每个 [data-collapse] 应用 saved[id]，同时补 aria-expanded… */
  } catch (err) { /* 隐私模式读不到，就按服务端那版来 */ }

  /* ② 导航起手 —— 只在真的要滑的时候做（决定权在 <head> 那句脚本） */
  if (!doc.classList.contains('is-navfly')) { return; }
  /* …给 [data-nav-path=from] 加 is-navfly-from、给 .is-active 加 is-navhold… */
})();
</script>
```

**够不着的那些用第二道保险**：侧栏以外也有折叠面板（设置页、权限清单），
它们散在各页模板里，没法用一个内联脚本覆盖。那就让 `<head>` 挂一个「首帧闭嘴」类：

```css
html.is-booting .collapse,
html.is-booting .shell,
html.is-booting .sidebar,
html.is-booting .topbar { transition: none; }
```
```js
function boot() {
  // 放在 boot 最前面预约：后面任何一步抛异常都不会把它留下
  requestAnimationFrame(() => document.documentElement.classList.remove('is-booting'));
  …
}
```
```js
// <head> 里再加一个 2.5s 兜底 —— 万一 app.js 整个没跑起来
window.setTimeout(function () { doc.classList.remove('is-booting'); }, 2500);
```

> 留着 `is-booting` 的后果是「所有过渡再也不生效」，那是个很难查的毛病
> （现象是「什么都没动画了」，而代码看起来全对）——
> 所以撤除要放在最不可能被跳过的地方。

**验收怎么写**：逐帧记录那个面板的高度，断言「只有起点和终点两个值、
中间一个都没有」；再断言「第一帧就已经是 localStorage 记的那一态」。
另外要**反向验一次**：用户真的去点的时候仍然有过渡（否则就是关过头了）。

## 十、滚动条：隐藏，但保留滚动

用户的要求通常就一句「能不能隐藏滚动条但保留滚动」。**别一刀切** —— 分两种做法：

| 位置 | 做法 | 为什么 |
|---|---|---|
| 侧栏 / 设计过的滚动面 | **彻底不显示** | 它是悬浮岛，一条常驻的滚动条会把「浮起来」的观感拉回普通面板 |
| 页面 | **默认看不见，滚的时候才浮出来** | 完全去掉的话，用户失去「这页还有多长」和「能拖回去」两个信息 |

```css
* { scrollbar-width: thin; scrollbar-color: transparent transparent; }
*::-webkit-scrollbar { width: 9px; height: 9px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background: transparent;                 /* 默认不可见 */
  border-radius: var(--r-pill);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* 捏住 thumb 时当然要看得见；页面滚动时由 JS 挂 is-scrolling */
*::-webkit-scrollbar-thumb:hover,
html.is-scrolling::-webkit-scrollbar-thumb,
.tw:hover::-webkit-scrollbar-thumb,
.kanban:hover::-webkit-scrollbar-thumb {
  background: color-mix(in oklab, var(--text-4) 62%, transparent);
}

/* Firefox 没有 thumb:hover，只能挂在 html 上整体切 */
html.is-scrolling { scrollbar-color: color-mix(in oklab, var(--text-4) 62%, transparent) transparent; }

/* 侧栏：彻底不显示，但照常滚 */
.sidebar { scrollbar-width: none; -ms-overflow-style: none; }
.sidebar::-webkit-scrollbar { width: 0; height: 0; }
```

```js
// scroll 不冒泡 —— 捕获阶段才能收到**所有**滚动区（窗口、宽表、看板）
window.addEventListener('scroll', () => {
  root.classList.add('is-scrolling');
  clearTimeout(timer);
  timer = setTimeout(() => root.classList.remove('is-scrolling'), 800);  // 太短会一闪一闪
}, { passive: true, capture: true });
```

⚠️ **别把 thumb 藏了却让滚动条不占位** —— 那会让内容宽度在滚动时来回抖。
保留 9px 的槽位、只让 thumb 透明，页面布局就一直是稳的。

⚠️ **测量滚动条有个坑**（我第一次就量错了，得出「页面根本没有滚动条」的假结论）：

```js
/* ❌ documentElement.offsetWidth 不含滚动条，两者相减恒为 0 */
root.offsetWidth - root.clientWidth
/* ✅ */
window.innerWidth - root.clientWidth
/* 元素上看滚动条占位时，记得把 border 减掉 —— offsetWidth 里含着边框 */
el.offsetWidth - el.clientWidth - borderLeft - borderRight
```

## 十一、滚动位置记忆（含侧栏）

多页应用里「刷新回到顶部」是两件事叠加造成的，要分别处理：

| 容器 | 记法 | 为什么 |
|---|---|---|
| 页面 | 按 `location.pathname` 分别记 | 每页的位置是它自己的；回访/刷新恢复，首次访问当然是顶部 |
| 侧栏 | **全站一个键** | 它是每页都一样的那个侧栏，切页重置它毫无道理 |

```html
<!-- body 末尾、模块脚本之前 -->
<script>
(function () {
  var PAGE_KEY = 'huein-scroll:';
  var BAR_KEY = 'huein-scroll:sidebar';
  var bar = document.querySelector('.sidebar');

  // 不关掉的话浏览器自己也会恢复一次，两边顺序不可控
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  try {
    var y = parseInt(sessionStorage.getItem(PAGE_KEY + location.pathname) || '0', 10);
    if (y > 0) window.scrollTo(0, y);
    if (bar) bar.scrollTop = parseInt(sessionStorage.getItem(BAR_KEY) || '0', 10) || 0;
  } catch (err) { /* 隐私模式 */ }

  window.addEventListener('pagehide', function () {
    try {
      sessionStorage.setItem(PAGE_KEY + location.pathname, String(Math.round(window.scrollY)));
      if (bar) sessionStorage.setItem(BAR_KEY, String(Math.round(bar.scrollTop)));
    } catch (err) { /* 写不了就算了 */ }
  });
})();
</script>
```

三个位置约束，缺一个都会看见「先到顶再跳下去」：

- ⚠️ **不能放 `<head>`** —— 那时 body 还没解析，文档高度是 0，`scrollTo` 会被夹到 0
- ⚠️ **不能放 app.js** —— 那是 deferred，跑到之前浏览器已经按顶部画过一帧
- ⚠️ **记录挂 `pagehide`** —— 它是唯一在「跳去别的页」和「刷新」两种情况下都会响的钩子；
  不要放在 scroll 里（一页能滚几百次）

**验收要先断言「这一页确实能滚」**。第一次测的时候视口是 1600×900，
而那一页的页高正好 900 —— `scrollTo(0, 420)` 被夹到 0，四条断言全红，
看着像功能没做，实际是**没有可滚空间**。

## 十二、图标（Logo / favicon）的本地缓存

**症状**：响应头里明明有 `Cache-Control: public, max-age=86400`，刷新时却每次都在请求。
**真因**：Service Worker 对所有静态资源走**网络优先**（`fetch(request)`），
等于把 HTTP 缓存绕过去了。而图标是**每一页左上角都出现**的东西，
于是用户看到的就是「Logo 闪一下」。

```
Service Worker 的取数策略要**分两条路**：
  · CSS / JS  → 网络优先（开发期天天在改，宁可慢也不要看到旧样式）
  · 图标      → 缓存优先（它不会变，而且每页都请求一次纯属浪费）
```

**缓存优先的必要代价是「地址必须能变」** —— 否则改了品牌色也永远拿旧图标：

```php
function huein_icon_url(array $brand, int $size = 64, bool $favicon = false): string
{
    $version = (int) ($brand['brand_hue'] ?? 0) . '-' . (defined('HUEIN_VERSION') ? HUEIN_VERSION : 'dev');
    $path = $favicon ? '/favicon.svg' : '/icon.svg?size=' . $size;

    return $path . (str_contains($path, '?') ? '&' : '?') . 'v=' . rawurlencode($version);
}
```

⚠️ **改了图标地址之后，所有「按字面量匹配」的地方都要跟着改**。
静态快照脚本里那几条正则是这么写的：

```php
/* ❌ 原来以「紧跟一个引号」收尾 —— 加了 ?v= 之后一条都匹配不上，快照里 Logo 全空 */
'#(<link rel="icon" href=")/favicon\.svg(")#'
/* ✅ 容忍 query */
'#(<link rel="icon" href=")/favicon\.svg(?:\?[^"]*)?(")#'
'#(src=")/icon\.svg\?[^"]*size=(64|192|512)[^"]*(")#' => '$1' . $icon64 . '$3'
```

**验收必须看服务端日志**，不能看页面侧的 response 事件 ——
后者分不清「SW 走了网络」和「SW 从 CacheStorage 拿的」。个数说话：

```
SW 激活后连刷 4 次：/icon.svg 命中 0 次 · /favicon.svg 0 次 · CSS 8 次（网络优先没被改坏）
```

## 十三、两处「文案和图形由服务端给」的小地方

### 品牌 Logo：没配就只留一个占位图标

系统自动生成的那个 Logo（圆角底 + 三层光弧）用户嫌丑，要求「只留一个代表图片的图标，
Logo 让用户自己配置导入」。于是：

```php
function huein_logo_url(array $brand): string
{
    $path = (string) ($brand['logo_path'] ?? '');

    return $path === '' ? '' : '/brand-logo?v=' . substr(sha1($path), 0, 8);
}
```

- **没配返回空串**，调用方据此分支（而不是回去用系统那个图形）
- 配了就带 `?v=<路径短哈希>`：`/brand-logo` 是 `max-age=86400`，
  不换地址的话换了图最多一天还看到旧的
- ⚠️ 占位用 `<span>`：外面那层 `.brand` 已经是 `<a>`，套 `<a>` 是无效 HTML
- ⚠️ 顺手修过一个真 bug：登录页里 `$logo` 存的是 `logo_path` 的**原始路径**（`brand/x.png`），
  直接当 `src` 用 —— 配了 Logo 反而显示破图。**凡是「存路径、用 URL」的地方都要走同一个 helper**，
  否则迟早有一条分支忘了转

### 一句会轮换的提示

「隔一段时间换一句话，随机一言，提前写好不同的一言」。分成两半：

| 在哪 | 干什么 | 为什么 |
|---|---|---|
| 服务端 | 候选池（十几条） | 第一句要服务端渲染 —— 脚本没跑起来时页面也得有话说；也才能被自检覆盖 |
| 客户端 | 每 11 秒换一句 | 换句是纯表现，不必回服务器 |

```js
const pool = lines.filter((line) => line !== current);   // ⚠️ 排除当前句
const next = pool[Math.floor(Math.random() * pool.length)] || lines[0];

el.classList.add('is-swapping');                          // 淡出
window.setTimeout(() => { el.textContent = next; el.classList.remove('is-swapping'); }, FADE);
```

- ⚠️ **只淡里面那个 span，不动整块 `h1`** —— 否则「名字 + 逗号」会跟着一起抖
- ⚠️ 不排除当前句的话，有 1/N 的概率「换了个寂寞」
- 候选池走 `<script type="application/json" data-quips>`（带 `JSON_HEX_TAG`），
  和看板配置同一个读法
- 减动画偏好下整个不换 —— 每 11 秒闪一下也算「动效」，不是内容

## 十四、验收清单（都写成断言，不靠肉眼看）

**几何**
**几何**
- 四周留白相等：侧栏 `x`/`y` = gap、顶栏 `x` = 侧栏右边 + gap、右边缘距右缘 = gap
- 两个岛不接触（缝 = gap），侧栏高 = 视口 − 2×gap
- 内容区 `x` = 侧栏右边 + gap
- ⚠️ 右边要对 `documentElement.clientWidth` 算，不是 `innerWidth`（滚动条会吃掉 10px）
- ⚠️ 别把展开宽度硬编码成 244 —— 宽屏媒体查询会把它改成 268/288。动态量

**入场**
**入场**
- 首次加载：三个元素的 `animationName` 分别是 `island-unfold-x` / `island-unfold-center` / `huein-island-item`
- 第二次加载 + 新会话：`is-reentered` 的有无相反，`animationName` 全是 `none`
- **残留被清掉**：静置后两个岛的 `transform` 与 `clipPath` 都是 `none`

> 内容区那些「依次浮入」的块有同一个陷阱（`animation-fill-mode: both` 留下 transform/filter
> → 变成 `position: fixed` 的包含块），但解法要成套：见`04-motion.md`。
> 两者共用一条铁律 —— **动画播完必须把 animation 撤掉**，不管是岛还是内容块。

**收起**
**收起**
- 侧栏宽 = rail 宽、顶栏 `y + h <= 0`、内容区 `y` 真的变小
- 收起态刷新后首帧就是收起态（`grid-template-columns` 里直接是 rail 宽）

**窄屏**
**窄屏**
- `shell` 单列、内容区占满、dock 单行（`w > 250 && h < 80`）、无横向溢出
- 侧栏 `display: none`、没有滑动残渣（`is-navhold` / `is-navland` / `is-navliftoff` / `is-navfly-from` / `.nav__flyer` 都是 0）

**图标栏（砍掉悬停展开之后）**
**图标栏（砍掉悬停展开之后）**
- 鼠标停在图标栏里 1.2 秒：宽度仍是 rail 宽、没有 `is-peek`、文字仍是 `display:none`
- 在图标栏里点一下：也不展开（那是导航，不是展开开关）

**滚动条**
**滚动条**
- 侧栏：`offsetWidth − clientWidth − 边框` = 0，**但** `scrollHeight > clientHeight`
  且滚轮能把 `scrollTop` 推上去（「藏了」和「还能滚」两个都要断言）
- 页面：`window.innerWidth − clientWidth` > 0（槽位还在）、`is-scrolling` 平时没有
- 滚一下 → `is-scrolling` 挂上、`scrollbar-color` 与静止时**不相等**；停手 800ms 后回到相等
- ⚠️ 用一个**矮窗口**（比如 2560×560）测，否则好几页根本不长，量出来的是假结论

**来自 localStorage 的状态**
**来自 localStorage 的状态**
- 逐帧记录那个面板的高度，断言「**只有起点/终点两个值，中间一个都没有**」
- 第一帧就已经是 localStorage 记的那一态（这才是「起手做在解析期」的证据）
- 反向验一次：用户手动点的时候**仍然有过渡**（0 → 中间值 → 终值）

**滚动与缓存**
- 滚动：先断言「这一页确实能滚」「侧栏确实能滚」，否则 `scrollTo` 被夹到 0，
  断言会全红但功能其实是好的；再验「刷新恢复」「切页保留侧栏」「回访恢复」
- 缓存：**数服务端日志**里的 `/icon.svg` —— 刷新 N 次之后应为 0，
  同时 CSS 仍应 > 0（证明网络优先没被一起改坏）

**品牌 Logo 与那句会轮换的话**
- Logo 占位：没配时 `.brand__mark--empty` 在（且里面有 svg）、**页面里不该再出现 `/icon.svg` 那张图**；
  配了则 `src` 匹配 `^/brand-logo\?v=[0-9a-f]{8}$`。两边（外壳页 + 登录页）都要验
- 会轮换的那句话：候选池条数、有 `opacity` 过渡、**等一轮之后文本真的变了**且还在池子里

> 指针光 / 光柱 / 点阵 / 开场动画的断言见 `03-light.md`；
> 导航滑动与可展开过渡的断言见 `04-motion.md`；
> 内容浮入的断言见 `04-motion.md`。
