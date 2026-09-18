<!-- 本文件是 huein-lightfield-ui-style 技能的第 5、7 步参考。 -->

# 04 · 动效：导航飞行 · 展开过渡 · 内容浮入

> 七步里的**第 5 步**（导航飞行 + 可展开内容）与**第 7 步**（内容依次浮入）。

这一份里最值钱的一条通则：

> **生硬通常出在「时序」，不在曲线。** 凡是「A 已经到位、B 还在路上」，
> 去调 B 的曲线永远调不好 —— 得把 **A 按住**。

## 一、导航切换：选中项**滑过去**（一个对象，位置连续）

### 先说做错的那一版

用户最初的构想是「旧项的着色缩小消失 → 一团光飞过去 → 新项的着色铺开」。
照做了，反馈是**「有点僵硬」**。

回去看，僵硬的根源**不是参数**，是**三个对象在交接**：旧项的余晖和飞着的光斑
根本不是同一个东西，看上去像一次剪辑，而不是一次移动。**拆得越细越像 PPT。**
用户第二轮的判断是对的 ——「简单一点，直接从原点飞到终点得了」。

### 改成一个对象

```
t=0      旧项的着色静态地在那儿（is-navfly-from）—— 光斑正好盖在它上面
t=0      光斑接管；旧项的余晖在底下开始退（is-navliftoff，180ms）
t=0~520  光斑从旧位置滑到新位置          —— 一段动画，只动 transform
落地帧   新项的着色从 0 渐显（is-navland，300ms），光斑同时淡出
```

两端能「零变化」有三条前提，**差一点就会在那两帧闪一下 —— 那是僵硬的另一种来源**：

1. **颜色必须是同一个变量**，各处共用。靠结构保证，不靠「记得改三遍」：
   ```css
   .sidebar { --nav-veil: color-mix(in oklab, var(--lx-a) 13%, transparent); }

   /* 着色的唯一来源是这一层 ::after —— 见下面「两端是一次交叉淡入淡出」 */
   .nav__item.is-active::after           { background: var(--nav-veil); }
   html.is-navfly .is-navfly-from::after { background: var(--nav-veil); }
   .nav__flyer                           { background: var(--nav-veil); }
   ```
2. **落点尺寸 = 目标尺寸**。分组标题行 34px、条目 37px 差几像素，所以 `scale` 一起插值：
   ```js
   const dx = 目标中心x - 起点中心x, dy = 同理;
   const sx = 目标宽 / 起点宽,        sy = 目标高 / 起点高;
   flyer.animate([
     { transform: 'translate(0px, 0px) scale(1, 1)' },
     { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
   ], { duration: dur, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'both' });
   ```
3. **两端各是一次交叉淡入淡出**（见下）。

### 两端必须是一次交叉淡入淡出，不能是「同一帧开关」

**先讲踩过的那个坑。** 第一版落地是「同一帧把新项着色打开 + 把光斑移除」——
位置严丝合缝所以严格来说不算跳变，但**着色本身是瞬间出现的**，用户的原话是
「不要秒显示，要渐显」；而起飞那端同理，旧项的余晖会一直亮到落地帧才突然消失。

**但渐显不能随便加。** 只淡一头（只让新项着色淡入、光斑照旧移除）会在中间露出一截
**变暗的缝** —— 那比原来的「秒显示」更糟。正解是让两层**同时开始、同时结束**：

```css
/* 着色做成一层独立的伪元素，而不是元素自己的 background-image ——
   因为要单独淡它（淡元素自己的 opacity 会把图标和文字一起淡掉）。 */
.nav__item.is-active::after {
  content: ''; position: absolute; inset: 0;
  z-index: -1;                 /* 在文字后面、在侧栏玻璃背景前面 */
  border-radius: inherit;      /* 跟元素一样是圆角 */
  background: var(--nav-veil);
}

html.is-navfly .nav__item.is-navhold::after { opacity: 0; }   /* 飞行期间按住 */

.nav__item.is-navland::after {                                /* 落地：渐显 */
  animation: nav-veil-land var(--dur-navland) var(--ease-focus) both;
}
html.is-navfly .is-navliftoff::after {                         /* 起飞：余晖退场 */
  animation: nav-veil-lift var(--dur-navlift) var(--ease-focus) both;
}
@keyframes nav-veil-land { from { opacity: 0 } to { opacity: 1 } }
@keyframes nav-veil-lift { from { opacity: 1 } to { opacity: 0 } }
```

```js
// 光斑那一头走 WAAPI（它的位置由 JS 逐帧写着），时长和曲线**从同一对 CSS 变量里读** ——
// 写两遍就会漂，两头对不上就又出暗缝
const fade = flyer.animate(
  [{ opacity: 1 }, { opacity: 0 }],
  { duration: cssTime('--dur-navland', 300), easing: cssEase('--ease-focus'), fill: 'both' }
);
fade.finished.then(settle, settle);
```

**为什么这样就平**：两层是**同一个颜色**，alpha 互补 → 合成出来的 alpha 恒为 1。
实测逐帧（落地后每 5ms 一帧）：

```
flyer 0.954  wash 0.046  sum 1.000
flyer 0.862  wash 0.138  sum 1.000
flyer 0.499  wash 0.501  sum 1.000
```

60 帧采样里「和」的最大偏差是 **0.000**。没有一帧是暗的，也没有一帧偏亮。

**曲线别用 `ease-out`。** 它前冲太狠：300ms 走到一半时已经完成 87%，
读起来仍然是「快速出现」而不是「渐显」。用 easeOutSine —— 过半时是 70%，
整个可见爬升摊到约 230ms。**实测判据：落地后 150ms 时着色应 ≤ 0.8。**

### 收尾也必须「两头同时撤」

`.is-navland` 用 `both` 填充，动画结束时 opacity 已经是 1，和基态一致；
所以撤类那一刻画面不动。但**必须和新项的 `is-navhold`、光斑一起撤**，
否则会有一帧只有光斑没有着色（或者反过来说不出在哪一页）。全部塞进幂等的 `settle()`。

### ⚠️ 缓动：短位移不能用 easeOutExpo

项目里的 `--ease-enter` 是 easeOutExpo —— 它**前 30% 就走完 80% 的路**。
那适合「一个岛从中间铺开」这种大动作，但 100~200px 的位移上，
剩下 70% 的时间几乎不动，看着像「**闪一下**」而不是「移过去」。

**这种「唰」就是僵硬感的来源之一。** 100~300px 用 easeInOutCubic
（`cubic-bezier(.65, 0, .35, 1)`）：起步和落地各有一小段缓冲。

时长随距离走一点，别一个数用到底 —— 40px 的邻居位用 520ms 会慢得发腻：

```js
const dur = Math.round(Math.min(520, Math.max(300, 280 + Math.hypot(dx, dy) * 1.2)));
```

⚠️ **飞行途中不要用 opacity 做淡入淡出**。飞着的那块高亮全程是实体的 ——
它是在**移动**，不是在闪烁。飞行两头各闪一下是最容易被读成「僵硬」的动作。

（注意和上面「两端的交接」区分开：那两处确实用了 opacity，但那是
**两个层一个进一个出、alpha 互补、合成恒定** —— 它是在交接，不是在闪烁。
判据很硬：把两层的 opacity 加起来，必须恒等于 1。）

### ⚠️ 文字也得「凝出来」——生硬通常出在**时序**，不在曲线

用户报「导航栏左侧当前页面的文字变化太生硬」。直觉是去调时长和缓动，但**怎么调都没用**。

真实原因是时序：新页面一加载，选中项就已经是最终态（`font-weight: 500` + 亮色），
而那块高亮光还在路上 —— 读出来是「**字先变、光后到**」，两个东西不同步。

处理分两半，缺一不可：

```css
/* ① 飞行期间把「旧」选中项按住 */
html.is-navfly .sidebar .nav__item.is-navhold:not(.is-navland) { color: var(--text-2); }
html.is-navfly .sidebar .nav__item.is-navhold:not(.is-navland) .nav__title { font-weight: 400; }
html.is-navfly .sidebar .nav__item.is-navhold:not(.is-navland) .nav__icon  { color: var(--text-3); }

/* ② 落点项从雾里凝出来（和全站「模糊 → 清晰」的语言一致） */
.nav__item.is-navland .nav__title,
.nav__item.is-navland .nav__icon {
  animation: nav-label-settle var(--dur-navland) var(--ease-focus) both;
}
@keyframes nav-label-settle {
  from { opacity: 0.4; filter: blur(1.2px); }
  to   { opacity: 1;   filter: blur(0); }
}
```

- `:not(.is-navland)` **必需** —— 点当前页时旧项和新项撞在同一个元素上，不排除会互相抵消
- 动画和 `is-navland` 同一时刻起止，所以天然与光斑同步；**不要给它单独配 delay**
- 实测：飞行中字重 `400` / 文字色 `oklch(0.8 0.012 285)`；落地帧动画 `["nav-label-settle"]`；
  末帧字重 `500` / 文字色 `oklch(0.97 0.006 285)` / 图标色 `oklch(0.68 0.24 350)`
- 判据一句话：**「两个东西同时到」比「把一个东西变好看」重要**。
  凡是「A 已到位、B 还在路上」，调 B 的曲线没用 —— 要把 A **按住**。

### ⚠️⚠️「起手」必须做在**解析期**，不能等模块脚本

`is-navfly` 由 `<head>` 里那句脚本挂上（它只决定「要不要滑」）。
但**把新项的着色按住、给旧项补上静态着色**这两件事如果放在 app.js 里就晚了 ——
app.js 是 `<script type="module">`，**deferred**，它跑到之前浏览器已经画过几帧。

→ 放到侧栏模板末尾的内联脚本里。**这条不是这一个功能专用的，是通用规律，
单独写在`02-shell.md` 的「来自 localStorage 的状态」**（那里还带上「侧栏折叠状态刷新时也会自己折一下」）。

两条 CSS 都挂在 `html.is-navfly` 下面。那个类一没（app.js 挂了、被 `<head>` 里那个
2.2s 兜底计时器撤掉），两条规则**同时失效**，页面自动回到「正常高亮当前页」——
**绝不会剩下一个永远透明、看不出自己在哪一页的选中项**。这是最外面那道保险。

```css
/* 起手：旧项补上静态着色（光斑的落脚点），新项按住（等它滑到再渐显）。
   两者都是同一层 ::after —— 「着色」只有这一个来源（见上面「交叉淡入淡出」）。 */
html.is-navfly .sidebar .nav__item.is-navfly-from::after,
html.is-navfly .sidebar .nav__label.is-navfly-from::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit; background: var(--nav-veil);
}
html.is-navfly .sidebar .nav__item.is-navhold::after { opacity: 0; }
html.is-navfly .sidebar .nav__item.is-navhold::before { height: 0; }   /* 光条等落地后再长出来 */
```

⚠️ 用伪元素的话，`.nav__label` 那种本来没有 `position` 的元素要补一句
`position: relative` —— 否则 `inset: 0` 会去对最近的那个定位祖先。

### 折叠分组的判断，起手脚本和 app.js 必须一致

旧项落在**折叠的**分组里时，它被 `overflow` 裁掉了 —— 点亮也看不见。
这时要把标记打在**那一组的标题行**上（那正是 app.js 会拿来当起点的东西）。

两边不一致的话，首屏那几帧会亮错地方。图标栏（`is-rail`）里所有分组都是展开的、
标题退化成 1px 细线，**不能标它**，所以要先判 `is-rail`。

```js
// 起手脚本
var panel = item.closest('.collapse');
var target = item;
if (!doc.classList.contains('is-rail') && panel && panel.classList.contains('is-collapsed')) {
  target = item.closest('.nav__group').querySelector('.nav__label') || item;
}
target.classList.add('is-navfly-from');
```
```js
// app.js：标的是 originEl（它才是光斑真正起飞的元素），不是 fromEl
originEl.classList.add('is-navfly-from');
```

### 多页应用怎么知道「上一个选中项」

页面一跳 DOM 全是新的，「上一个选中项」在本文档里根本不存在。
上一页把「当时高亮的那个导航项的 path」写进 sessionStorage，新页读出来，
在本页侧栏里找同一个位置（侧栏结构每页一致，所以位置是准的）。

```html
<a class="nav__item" href="/ideas" data-nav-path="/ideas" …>
```

记**导航项自己的 path**，不是 `location.pathname`：详情页 `/contents/107`
在侧栏里高亮的是 `/contents`，用 pathname 会找不到条目，
「列表进详情、详情回列表」这类最常走的路径就全做不出动画。

`<head>` 里那句（决定要不要滑 + 2.2s 兜底）：

```js
var from = sessionStorage.getItem('huein-nav-from') || '';
if (from !== '' && from !== location.pathname) {
  doc.classList.add('is-navfly');
  window.__hueinNavfly = setTimeout(function () { doc.classList.remove('is-navfly'); }, 2200);
}
```
（模块脚本接管时 `clearTimeout` 掉它，并在每个「不滑」的出口都 `settle()`。）

### ⚠️ 折叠只是 overflow 裁剪，`getBoundingClientRect` 照样给你满高的框

```js
/* ❌ 折叠分组里的条目仍然报 37px 高 → 以为它看得见 → 高亮从一块空白里冒出来 */
if (fromEl.getBoundingClientRect().height < 4) { … }
/* ✅ 和 .collapse 的框求交 */
const visibleHeight = (el) => {
  const r = el.getBoundingClientRect();
  const panel = el.closest('.collapse');
  const clip = panel ? panel.getBoundingClientRect() : r;
  return Math.min(r.bottom, clip.bottom, navBox.bottom) - Math.max(r.top, clip.top, navBox.top);
};
```

**折叠时起点退回那一组的标题行**，而不是把分组撑开再合上
（为了量一个位置让侧栏当着用户的面抖两下，不划算）：

```js
let originEl = fromEl;
if (visibleHeight(fromEl) < 4) {
  const label = fromEl.closest('.nav__group')?.querySelector('.nav__label');
  if (label && visibleHeight(label) >= 4) originEl = label;   // 图标栏里标题是 1px 细线，不能当起点
}
```

### 光斑本身

```css
.nav { position: relative; }        /* 光斑是它的绝对定位子元素 */
.nav__flyer {
  position: absolute; left: 0; top: 0; z-index: 2; pointer-events: none;
  border-radius: var(--r-2);
  background: var(--nav-veil);      /* 与选中项的着色同一个变量 —— 这是零跳变的前提 */
  box-shadow: 0 0 20px 1px color-mix(in oklab, var(--lx-a) 22%, transparent);
  will-change: transform;           /* ⚠️ 这里绝不能写 transform —— JS 逐帧写它 */
}
```

### 收场：一个幂等的 `settle()`

`settle()` 一次清干净：撤 `is-navfly` + 四个标记类 + 移除光斑。
**所有「不滑」的出口和落地都走它**：

```js
const settle = () => {
  root.classList.remove('is-navfly');
  document.querySelector('.nav__item.is-navhold')?.classList.remove('is-navhold');
  document.querySelector('.nav__item.is-navland')?.classList.remove('is-navland');
  document.querySelector('.is-navfly-from')?.classList.remove('is-navfly-from');  // 可能在标题行上
  document.querySelector('.is-navliftoff')?.classList.remove('is-navliftoff');
  document.querySelector('.nav__flyer')?.remove();
};
```

落地用 `anim.finished.then(land, land)`（`then` 的两个参数都传 `land`，
动画被取消时也收场）+ 一个 `dur + 140ms` 的兜底超时。`land` 用布尔量防重入，
**并且 `land` 只是「开始交接」**（加 `is-navland` + 淡出光斑），
真正的收场挂在光斑那条淡出动画的 `finished` 上（再加一层 `dur + 120ms` 兜底）。

⚠️ 四个标记类里，`is-navhold` / `is-navfly-from` / `is-navliftoff` 都挂在
`html.is-navfly` 下面，所以撤掉 `is-navfly` 本身就能让它们同时失效 ——
**`is-navfly` 是最外面那道保险**，剩下几个只是顺手清掉。

**同项不滑**（`from === nowPath`）、**减动画不滑**、**窄屏不滑**（侧栏整个 `display:none`）。

## 二、可展开卡片（`<details>`）的展开 / 收起要有过渡

原生的 `<details>` 是**瞬开瞬关**的：内容在关闭时根本不参与布局
（现代浏览器用 `content-visibility` 把它藏掉，不是 `display: none`），
所以既量不到高度、也过渡不了。全站的「可展开卡片」几乎都靠它
（热榜、对标库、新建表单、内容详情……），于是一处也顺滑不起来。

**不用 JS 方案，走 CSS：**

```css
@supports (interpolate-size: allow-keywords) and (selector(::details-content)) {
  :root { interpolate-size: allow-keywords; }

  details::details-content {
    block-size: 0;
    overflow: clip;
    transition:
      block-size var(--dur-disclosure) var(--ease-out),
      content-visibility var(--dur-disclosure) allow-discrete;   /* ⚠️ 见下 */
  }

  details[open]::details-content { block-size: auto; }
}
```

四个要点：

1. **`::details-content`** 是 2024 年之后才有的「那一层内容」。没有它就只能
   JS 量高度 + WAAPI 动 height，还得自己处理「关闭时内容已经没了」。
2. **`interpolate-size: allow-keywords`** 让 `block-size: auto` 可过渡。
   它挂在 `:root` 上是**全局开关** —— 上线前 grep 一遍项目里
   `transition: height` / `max-height` 之类，确认没有别的元素在动 `auto`。
   （它只影响「动画到关键字」，百分比和具体长度不受影响。）
3. ⚠️ **`content-visibility` 那行必须带 `allow-discrete`**。
   它是离散属性：不写的话收起时内容会在高度收敛之前就消失 ——
   看到的是「啪地没了，然后盒子慢慢缩」，比不做动画还怪。
4. ⚠️ **整段包在 `@supports` 里，两个条件都要**，少一个就整段失效。
   不支持时退回原生瞬开 —— **降级成「没有动画」而不是「打不开」**，这是唯一可接受的方向。

**验收**：逐帧量 `<details>` 的高度（那是唯一能证明「真的在过渡」的办法）

- 高度变过 ≥5 次、过渡 ≥200ms —— 不是一帧到位
- 收起途中**还有内容在渲染**（`content-visibility !== 'hidden'` 且高度仍大于终态）——
  这一条才是 `allow-discrete` 真的生效的证据
- 而且**功能必须照旧**：每一页的第一个折叠卡片都点开、再点关，确认 `open` 真的跟着变。
  一条 CSS 把全站的折叠卡片弄坏，是最难发现也最不可接受的回归

> 内容块的「依次浮入」（挑单元、错峰、变体）是另一套东西，见技能
> `scroll-reveal-choreography` —— 那里才是它的正本。

## 三、折叠面板（`.collapse`）：两端要两条曲线，时长要随高度

`grid-template-rows: 1fr ↔ 0fr` 是对未知高度做平滑展开的唯一纯 CSS 方案。
但**曲线选错会让「展开」看起来根本没有动画**。实测（工作台「展开全部 35 个权限点」，
面板 2319px 高）：

```
--ease-enter（easeOutExpo）：34ms:169  44ms:481  74ms:1208 … 380ms:2319
                            ↑ 119ms 就走完 86%——肉眼就是「啪地全出来了」
```

而收起因为慢尾（后 20% 用掉 250ms）留得久，反而看得见在动。**用户报的
「展开没动画、收起有」就是这么来的 —— 不是错觉，是同一条曲线在两端的两种表现。**

```css
/* 展开：起步慢、中间最快、最后收住 —— 整段都看得见在长 */
.collapse {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--dur-collapse, 420ms) var(--ease-in-out);
}

.collapse > * { overflow: hidden; min-height: 0; }

/* 收起：给「让开」的曲线。关的时候不需要「演一遍」 */
.collapse.is-collapsed {
  grid-template-rows: 0fr;
  transition-timing-function: var(--ease-out);
}
```

**方向可以分开写**：transition 用的是**变化之后**那一态的函数，
所以只要把这两条分别放在 `.collapse` 和 `.collapse.is-collapsed` 上即可。
实测展开前 1/4 时长只走完 10%（前冲的曲线这里会到 80%+）。

**时长随内容高度走**（2319px 和 200px 不该同一档）：

```js
// ⚠️ 这个变量叫 next，含义是「点击之后应该处于收起态」—— 不是「正在展开」。
//   写反了的表现：展开仍是默认时长，收起反而被拉长。
const next = !panel.classList.contains('is-collapsed');

if (!next) {
  // 面板此刻是 0fr，但子元素是 overflow:hidden，scrollHeight 照样给出完整内容高度
  const inner = panel.firstElementChild;
  const ms = Math.round(Math.min(900, Math.max(280, 260 + (inner ? inner.scrollHeight : 0) * 0.16)));

  panel.style.setProperty('--dur-collapse', ms + 'ms');
} else {
  panel.style.removeProperty('--dur-collapse');
}
```

## 四、验收清单（都写成断言，不靠肉眼看）

**滑动**
**滑动**
- 采样滑块的 `getBoundingClientRect`：**起点贴着旧项（< 16px）、终点贴着新项（< 16px）**
  —— 这是唯一能证明「真的从 A 滑到 B」的办法
- 三条路径都要测：同分组（起点是条目本身）· 跨分组（起点退化成标题行）· 图标栏状态
- **飞行段只有一段动画、只有两个关键帧、关键帧里只有 `transform`** ——
  往 `Element.prototype.animate` 上挂个探针记下来，别靠读代码
- **落地段反过来：必须是两条只动 opacity 的动画，而且是「叠加 = 1」的关系**：
  ```js
  // 逐帧读两层的 opacity（伪元素要 getComputedStyle(el, '::after')）
  const sum = Number(getComputedStyle(flyer).opacity)
            + Number(getComputedStyle(active, '::after').opacity);
  // 断言：每一帧的 sum 都在 1 附近（偏差 ≤ 0.1），min ≥ 0.8、max ≤ 1.12
  ```
  60 帧采样下偏差应当就是 **0.000**。出现 0.5 左右的值 = 中间有暗缝；
  超过 1.1 = 两层一起糊上去了。
- **渐显不能是「前冲」**：落地后 150ms（时间过半）时着色应 **≤ 0.8**；
  用 `ease-out` 会到 0.87，读起来仍是「快速出现」。0.05 → 0.95 的爬升应 ≥ 180ms
- 起飞那端同理：旧项余晖在**落地之前**就该退到 0（实测 256ms 退完、480ms 才落地）
- 收尾：`is-navfly` / `is-navhold` / `is-navland` / `is-navliftoff` / `is-navfly-from` /
  `.nav__flyer` 全清干净、**新选中项的 `::after` opacity 是 `1`**（卡在中间 = 看不出自己在哪一页）
- 落点项的**文字**也要跟着凝出来：飞行中是旧项按住（字重 `400`、颜色 `--text-2`），
  落地那一帧起 `nav-label-settle`、末帧字重 `500`、颜色回到亮色、图标回到品牌色。
  ⚠️ **动画名要在动画还在跑的时候读** —— 播完就没了，`getAnimations()` 只会给你空数组。
  还是用 addInitScript 探针记每一帧
- 同项重载不滑、减动画不滑

> ⚠️ `element.getAnimations()` **拿不到伪元素上的 CSS 动画**。
> 想暂停/读取那一层，得走 `document.getAnimations()` 再按
> `a.effect.target` + `a.effect.pseudoElement === '::after'` 筛。
> 拍定格时也别把位移那条一起暂停 —— 它要停在终点，拉回中间会把滑块拽回半空。

**「有没有空帧」只能逐帧量，不能轮询**
**⚠️「有没有空帧」只能逐帧量，不能轮询**

「全程至少有一个高亮亮着」是这个交互的核心不变量，但它**极易测错**：

```js
// ❌ 外部每 55ms 轮询一遍：导航 commit 之后到第一次绘制之间还有一段时间，
//    这段里采到的是「侧栏还没渲染出来」，会误报成空帧
// ❌ 就算改对了采样方式，还得注意「亮着的东西」有三种：
//    飞着的滑块 / 目标项的着色 / **旧项的静态着色**
//    只数前两种的话，起手那一段会被误报成空帧
// ✅ 挂在 addInitScript 里跟 requestAnimationFrame 采，一帧一个样本
await ctx.addInitScript(() => {
  window.__frames = [];
  let n = 0;
  const visibleH = (el) => {          // 折叠分组只是 overflow 裁剪，别直接量它自己
    const r = el.getBoundingClientRect();
    const clip = el.closest('.collapse');
    const box = clip ? clip.getBoundingClientRect() : r;
    return Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
  };
  const tick = () => {
    const active = document.querySelector('.sidebar .nav__item.is-active');
    const flyer = document.querySelector('.nav__flyer');
    const fromEl = document.querySelector('.is-navfly-from');
    const size = active ? parseFloat(getComputedStyle(active).backgroundSize) || 0 : 0;
    const op = flyer ? Number(getComputedStyle(flyer).opacity) : 0;
    window.__frames.push({
      nav: !!active,                                   // 侧栏还没渲染 = 谈不上空帧
      lit: (flyer && op > 0.5) || size > 50 || (!!fromEl && visibleH(fromEl) > 4),
    });
    if (n++ < 140) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
```

断言写成两条：**「亮起来之后一帧都没暗过」（`holes === 0`）** +
**「从第一帧起就是亮的」（`leading === 0`）**。第二条会直接验出
「起手是不是做在解析期」—— 放在 app.js 里的话它会停在 3~5 帧。

**展开 / 收起**
- 面板：展开**声明的时长**随高度变（2319px → ≥500ms）、且**前 1/4 时长走的距离 < 40%**
  （前冲的曲线这里会到 80%+）；收起仍回到默认时长
  ⚠️ 读 `transitionDuration` 要读**点击之后**那一帧 —— `frames[0]` 是点击之前的

- 另外记住 `element.getAnimations()` 与 `document.getAnimations()` 的区别、
  以及「量 `transitionDuration` 要读点击之后那一帧」这两条 —— 做法见本套技能的 `SKILL.md`。

---

## 五、内容依次浮入（呼吸感）

> **这套技能集里的一份分册。** 总纲（设计语言 / token / 从零复刻的顺序 / 通用验收手法）
> 见技能 `huein-ui-style-playbook`；同级的另外两份是
> `floating-island-app-shell`（外壳）· `lightfield-cursor-glow`（光）·
> `nav-flight-and-expand-motion`（导航飞行与展开过渡）。
> 内容浮入是复刻顺序的第 7 步 —— 外壳和光都定下来之后再动它。

**目标观感**：页面打开时，内容块从上往下依次「从远处聚焦过来」——
不是一起淡入，也不是整页闪一下。滚动到才出现的块同样如此。

一轮实测下来，「差点感觉」几乎总是这两个原因之一：

| 症状 | 真因 |
|---|---|
| 有的页面有呼吸感、有的没有 | 只有手工标注的重点块带 blur，自动拾取的没有 |
| 模糊「看不出来」 | 位移和模糊共用 easeOutExpo，而它把 94% 的变化压在前 40% 时间里 —— **那层雾实际只存在约 115ms** |
| 尾巴几块一起冒出来 | 错峰用 `min(var(--i), 7) * 65ms` 那种**截断式封顶**，第 8 项之后全落在一个延迟上 |
| 滚到才出现的块要等半秒 | 错峰按「整页序号」算 —— 页面越靠后的块等越久 |

先看第一条，它最隐蔽。

## 六、把位移和焦点拆成两条动画

```css
:root {
  /* 位移/淡入：起步快、长尾收束 —— 是「到位」 */
  --dur-enter: 760ms;
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);      /* easeOutExpo */

  /* 焦点：慢一拍、另一条曲线 —— 是「合焦」 */
  --dur-focus: 900ms;
  --ease-focus: cubic-bezier(0.61, 1, 0.88, 1);     /* easeOutSine */
}

@keyframes huein-enter {
  from { opacity: 0; transform: translate3d(0, 16px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}

/* 半径走变量，方便一键关掉（见下面的 plain 逃生口） */
@keyframes huein-focus {
  from { filter: blur(var(--reveal-blur, 8px)); }
  to   { filter: blur(0px); }
}

[data-reveal].is-in {
  animation:
    huein-enter var(--dur-enter) var(--ease-enter) both,
    huein-focus var(--dur-focus) var(--ease-focus) both;
  animation-delay: calc(var(--i, 0) * var(--stagger, 65ms));
}

[data-reveal='plain'] { --reveal-blur: 0px; }   /* 一屏密集表格行那种块用它 */
```

**为什么必须拆开**：`animation` 的关键帧级 timing function 是**整段共用**的，
没法只让 filter 走另一条曲线。两条动画是唯一办法。
而两条都动 `filter` 会互相整条盖住，所以**模糊只归 `huein-focus` 管**。

`animation-delay` 给单个值会自动重复给列表里每条，所以两条延迟天然一致。

实测对比（首块，进页面时就在视口里的那一块）：

```
                      120ms   240ms   360ms   520ms   700ms
共用 easeOutExpo  →           0.5px（300ms 时就已经这样了）
拆开（新）        →  6.31    4.75    3.34    1.75    0.48   （px）
```

雾的存续时间从约 115ms 变成约 600ms。**这是「呼吸感」从「有但看不见」变成
「看得见」的那一步。**

> `var()` 写在 `@keyframes` 里是可用的（按元素解析，不参与插值），
> 用 `getKeyframes()` 读出来已经是代换后的值 —— 可以断言。

### 变体：只改「量」，不另写关键帧

整套浮入只有两个关键帧（`huein-enter` 带位移动量、`huein-focus` 带模糊半径）。
变体就把这两个量调成 0 —— **不要另写一套关键帧**：

```css
@keyframes huein-enter {
  from { opacity: 0; transform: translate3d(0, var(--reveal-rise, 16px), 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes huein-focus {
  from { filter: blur(var(--reveal-blur, 8px)); }
  to   { filter: blur(0px); }
}
```

| 变体 | 设成 | 用途 |
|---|---|---|
| `plain` | `--reveal-blur: 0px` | 一屏密集表格行：再叠一层雾会让人以为渲染没跟上 |
| `fade` | `--reveal-blur: 0px; --reveal-rise: 0px` + 短时长 | 网格里的小格子：16 个小方块各自位移再各自散焦，看着是「一堆东西在动」而不是「依次亮起来」 |
| `unfold` | 上面两个都归零 + 额外挂一条 `clip-path` 动画 | 「一张大卡片，里面还有许多小块」的容器 |

**为什么另写关键帧更短、却更糟**：每加一个变体就要多维护一条「JS 等哪条动画结束才撤类」
（见第四节）—— 那条是硬约束，迟早会漏。共用两个关键帧的话，
时长、曲线、错峰、撤类时机全都不用动，变体之间还能叠加（`unfold` + `slow`）。

`unfold` 那条是**额外叠上去的**（不是替换），所以只动 `clip-path`：

```css
@keyframes huein-unfold {
  from { clip-path: inset(0 0 100% 0); }   /* 下半截整个裁掉 */
  to   { clip-path: inset(0); }
}
```

- **用 `clip-path` 而不是动高度**：高度动画会真的重排整页、内容一直在折行；
  而 `clip-path` 只裁剪渲染，卡片占的位置一开始就是最终位置，下面的东西不乱动。
- ⚠️ **`unfold` 的时长必须小于 `focus`**，否则「最后结束的那条」就不是 `huein-focus`，
  撤类的时机要跟着改。这条约束是隐式的 —— 写在时长 token 的注释里。
- ⚠️ **重写 `animation` 简写会把 `animation-delay` 重置成 0**。变体那条规则里
  必须把 `animation-delay` 原样再写一遍，否则这一块就丢了错峰、会在所有块之前先到位。

`unfold` 容器的语义是「整块摊开，然后里面的东西逐个亮起来」，
所以拾取单元时要**把里面的重复组也收进来**（见第三节）——
两层不会互相放大：容器只动 clip-path，里面的块才动位移和模糊。

## 七、错峰：按「这一批」分配，总时长有界

三段错误做法，按犯错顺序：

```js
/* ❌ 1. 截断式封顶：第 8 项之后全挤在一个延迟上 */
animation-delay: calc(min(var(--i, 0), 7) * 65ms);

/* ❌ 2. 不封顶：30 块时最后一块等 1.95s */
animation-delay: calc(var(--i, 0) * 65ms);

/* ✅ 3. 按批分配：批内从 0 重新数，节拍 = min(65ms, 预算 / (n-1)) */
const REVEAL_BEAT_MAX = 65;
const REVEAL_BEAT_BUDGET = 520;      // 整串错峰的总时长上限

function staggerBatch(list) {
  const beat = list.length > 1
    ? Math.min(REVEAL_BEAT_MAX, REVEAL_BEAT_BUDGET / (list.length - 1))
    : 0;

  list.forEach((el, index) => {
    el.style.setProperty('--i', String(index));
    el.style.setProperty('--stagger', beat.toFixed(1) + 'ms');
  });
}
```

- 「块少时 65ms」的手感被保留（5~9 块仍是 65ms 节拍），
  块多时压到 35~40ms，**整串总时长恒定在半秒内** ——「一页东西多」不该等于「打开更慢」。
- **必须按批**：按整页序号算的话，页面底下那些块滚到眼前时还要先等「序号 × 节拍」。
  实测一页 16 块的场景：末 7 块按整页序号要等 585~975ms，按批只需要 0~390ms。

```js
const reveal = (list) => {
  // ⚠️ 已经在播的不要再进来：IO 的边界通知和下面的兜底可能对同一块各触发一次，
  //    重复进去会重设 --i / --stagger，而它们正被运行中的动画用着 → 那一块会「跳」
  const fresh = list.filter((el) => el.isConnected && !el.classList.contains('is-in'));

  if (fresh.length === 0) return;

  // 批内按文档顺序排。IO 给的是「谁先变可见谁在前」，那顺序取决于滚动方向
  staggerBatch(fresh.slice().sort((a, b) => order.get(a) - order.get(b)));
  fresh.forEach((el) => { settleReveal(el); el.classList.add('is-in'); });
};
```

## 八、挑哪些块当编排单元

**不要只取内容区的直接子元素** —— 那些大多是布局壳（`div.grid` 装着 4 张卡、
`section.card` 装着整个看板）。给壳做动画的结果是整页一起淡入。

```
逐个顶层块往下看：
  · 它自己标了 data-reveal        → 就是它
      （unfold 例外：它只动 clip-path，所以里面的重复组也一并收进来，见下）
  · 里面有人标了 data-reveal      → 拆开，取里面那些，**别把外层壳也算一块**
  · 它是 <details>                → 整张当一块（内容收起时是隐藏的，见下）
  · 找得到「≥3 个同类兄弟」        → 那一组是单元（同标签 + 同 class 串，宽度 ≥96px 筛掉按钮）
  · 都不满足                       → 就它自己
```

用**「重复」**当信号，是因为重复正是「这些块是并列的」最可靠的标志 ——
比认 class 名稳，新页面加一种卡片不用改代码。

### ⚠️ 三条踩出来的硬规则

**① 别做「顶层够多就不拆」的短路。** 看着很合理（顶层节奏本来就对），
但同一个代码库里会同时出现两个相反的毛病：顶层少的页面拆得很细，
顶层多的页面（6~7 块）**4 张统计卡被当成一整块一起淡入**。
用户的原话是「很多页面的一些卡片有缺失呼吸感动画」——
而观测到的正是这些页面。**判据要统一，不能按块数分叉。**

**② 上限不能是「截断」。** `return units.slice(0, 16)` 会**静默丢掉尾巴**：
末尾那几张卡永远不动，看起来像坏了。改成「拆出来会超上限就整块进来」：

```js
const group = findRepeatGroup(el, 3);

// 超上限 → 这一组整块进来（外层壳动一下），而不是把尾巴丢掉
if (group && units.length + group.length <= REVEAL_MAX_UNITS) { units.push(...group); return; }
units.push(el);
```

⚠️ 但**模板作者显式标注的容器不受这个上限约束** —— 他数得清自己有几个格子。
一个 35 格的日历被上限砍掉 11 格，就又变回「静默丢尾巴」。

**③ `<details>` 不往里看。** 它的内容**收起来就是隐藏的**。往里拆的实测后果：
一张折叠卡片里的 3 个表单字段被当成单元，而**卡片自己反而没有动画了** ——
动画被从看得见的东西上偷到了看不见的东西上。
它自己已经有展开/收起过渡，整张卡当一个单元就对了。
（同样地在 `findRepeatGroup` 的下探循环里要跳过 `DETAILS`。）

**④ 手工标注的子树别套壳**

```js
if (el.hasAttribute('data-reveal')) { units.push(el); return; }

const marked = el.querySelectorAll('[data-reveal]');

if (marked.length > 0) { units.push(...marked); return; }   // 拆开，别把壳也算一块
```

壳和里面的块同时播 = 两层叠加：位移 16+16px、模糊 8+8px。
看起来像「这一块比别人糊一倍」，而不是「这块更重」。

**⑤ 给「必须看得见」的元素一个显式退出**

```js
const isSkippable = (el) =>
  REVEAL_SKIP.includes(el.tagName) || el.hasAttribute('data-reveal-skip');
```

用途：页脚署名（许可证/版权那类，法律上必须可见），或任何「贴底、又矮」的元素。
理由见第五节 —— 这类元素可能永远达不到 IO 的门槛。
**把它从编排里排除，等于让它不依赖 JS 和动画机制，永远可见。**

## 九、播完必须摘干净

`animation-fill-mode: both` 会把终态**永久留在元素上**。哪怕终态是
「不透明、零位移、零模糊」，computed 出来的 `transform` 也是矩阵、
`filter` 是 `blur(0px)` 而**不是 `none`** —— 两者都会让这个元素
成为 `position: fixed` 后代的**包含块**。

```js
/* 只有最后结束的那条动画才算数 */
const REVEAL_ANIM = ['huein-focus'];

function settleReveal(el) {
  const done = (event) => {
    // ⚠️ animationend 会**冒泡**：卡片里某个子元素自己的动画结束也会触发它。
    //    只比对 target + animationName，不能见到事件就撤。
    if (event.target !== el || REVEAL_ANIM.indexOf(event.animationName) === -1) return;

    el.removeEventListener('animationend', done);
    el.classList.remove('is-in', 'is-armed');
    el.style.removeProperty('--i');
    el.style.removeProperty('--stagger');
  };

  el.addEventListener('animationend', done);
}
```

- **等最后一条**：两条动画里焦点那条更长，早撤会在焦点还没合上时掐掉动画 → 看得见地跳一下。
- 终态和基态逐字一样（都是「不透明、无位移、不模糊」），所以撤类那一刻画面完全不动 —— 纯赚。
- 不这么做的话，页面静置后会永久持有 N 个 `<transform>`+`<filter>` 的合成层。

**「藏起来的动作由 JS 做，不由 CSS 做」**：`[data-reveal]` 在 CSS 里是可见的，
只有 JS 成功接管后才加 `.is-armed` 把它藏起来。这样脚本报错/被拦截/浏览器不支持时，
页面照常显示 —— 而不是全白。

```css
[data-reveal].is-armed { opacity: 0; }
```

## 十、兜底：IO 的门槛可能让元素永久不可见

IntersectionObserver 只在「相交状态变了」时通知，而门槛常常是
`threshold: 0.1` 再叠一条负的下边距（`rootMargin: '0px 0px -6% 0px'`）。
**一个紧贴页面底、又矮的元素可能永远达不到那条门槛** —— 它被 `is-armed` 藏住，
再也没人来放开，于是永久不可见。

补一道基于位置的兜底，判据和「首屏已经在视口里」用同一个：

```js
const sweep = () => {
  const armed = pending.filter((el) => el.classList.contains('is-armed'));

  if (armed.length === 0) {
    window.removeEventListener('scroll', onMove);
    window.removeEventListener('resize', onMove);
    return;
  }

  const ready = armed.filter((el) => {
    const r = el.getBoundingClientRect();

    return r.top < window.innerHeight * 0.94 && r.bottom > 0;
  });

  if (ready.length === 0) return;

  ready.forEach((el) => observer.unobserve(el));
  reveal(ready);
};

window.addEventListener('scroll', onMove, { passive: true });   // onMove 内部 120ms 防抖
window.addEventListener('resize', onMove);
sweepTimer = window.setTimeout(sweep, 1200);
```

配合第四节的「已经在播的不要再进来」，两者可以安全共存。

## 十一、怎么验（不靠肉眼看）

### 1. 在**动画还在跑**的时候读参数

```js
// ✅ 探针：在动画被创建的那一帧把 effect 的定义记下来
const a = el.getAnimations().find((x) => x.animationName === 'huein-focus');
const kf = a.effect.getKeyframes();
const timing = a.effect.getTiming();

// kf[0].filter → 'blur(8px)'      kf.at(-1).filter → 'blur(0px)'
// timing.delay  → 真实生效的延迟（毫秒）
// timing.easing → 真实生效的曲线
```

```js
// ❌ 播完之后再量 getComputedStyle(el).animationDelay
//    此时 is-in 已被摘掉 → 拿到 0s → 得出「错峰完全没生效」的错误结论
```

探针必须走 `addInitScript`（`page.evaluate` 装的补丁会随下一次导航消失），
并且只改 `Element.prototype` —— 它跑在 `<html>` 存在**之前**，
碰 `document.documentElement` 会是 `null`。

### 2. 拍定格：用 WAAPI 暂停，不要「等 N 毫秒再截」

```js
els.forEach((el) => el.getAnimations().forEach((a) => {
  a.pause();
  a.currentTime = 240;      // 挑一个「前面的块快到位、后面的块还在雾里」的时刻
}));
await page.screenshot({ path });
```

「等 N 毫秒再截」的问题：截图本身有耗时、每次抓到的帧都不一样，
而且极容易抓在 opacity 还接近 0 的第一帧（拍出来一片黑）。
暂停定格可复现，而且能精确展示错峰。

### 3. 断言清单

- 每块都挂了**两条**动画（`huein-enter` + `huein-focus`）
- 每块起始 `blur(>=8px)`、结束 `blur(0px)`
- 批内延迟**两两不同**、随文档顺序**单调递增**
- 最大延迟 ≤ 错峰预算（例如 560ms）
- 滚动后触发的批次：延迟 ≤ 预算，且**明显小于**「按整页序号排队」的值
- 静置后：所有块 `transform` / `filter` 都是 `none`，类已摘、内联变量已清
- 每页滚到底后**没有块还是 `is-armed`**（永久不可见的那一类）
- `prefers-reduced-motion`：每块可见、`getAnimations()` 为空、无 `is-armed`
- 帧时间：`p95 < 34ms`（16 块同时带模糊，实测 p95 只有 5~7ms，代价付得起）
- 逃生口：`data-reveal="plain"` 时 `huein-focus` 起始值应为 `blur(0px)`

### 4. 验收之前先造数

空状态的页面块少、也不滚动，「有没有依次浮入」测不出东西。
先造几条业务数据，再跑验收。
（同理：测「滚下去的块」要**动态挑**一页真的有视口外内容的 ——
写死一页很容易碰上一个整页都在首屏里的页面，那等于什么都没测。）
