<!-- 本文件是 huein-lightfield-ui-style 技能的第 6 步参考。 -->

# 03 · 光：边缘光 · 光柱 · 点阵 · 光场 · 开场动画

> 七步里的**第 6 步**。

从**一个指针**到**整页的光**，一共四层：

```
指针
 ├─ 光场焦点（桌面 = 指针 / 触摸 = 漂移虚拟点）
 │    ├─ 三层光斑（主光在焦点 · 补光对角 · 冷光垂直）→ 整页的底色光
 │    └─ 点阵的面具（三个圆跟着这三层光走）
 ├─ 光标光柱（fixed + screen 混合，照整个界面）
 └─ 各面的边缘光（.card / .topbar 自己发，.sidebar 另开一层）
```

**两条贯穿全篇的原则**：① 光由「距离」决定，不是「碰到才亮」；② 所有光响应**同一个焦点**。

## 一、卡片的「鼠标即一盏灯」

### 先定模型：光由**距离**决定，不是「碰到才亮」

第一版是「指针悬停在卡片上才亮」。用户的原话是
「希望边缘光的影响不是鼠标触碰到卡片才会照亮」+ 附了一个参考实现
（ReactBits 的 MagicBento）—— 要的是**光跟着光标在页面上扫，卡片越近越亮**。

三层一起工作：

| 层 | 干什么 |
|---|---|
| `.cursor-light` | 光标光柱：`fixed` + `mix-blend-mode: screen`，z-index 在 `.shell` 之上 —— 照的是**整个界面**（卡片、文字、玻璃都在这束光里），不只给卡片描边 |
| 各面的 `::before` / `.island-glow::after` | 边缘光，强度由 `--gle` 驱动 |

（还有过一层 `.mote` 飘浮光点，**用户要求删掉了** —— 见本节末尾。）

### ⚠️ 距离要用「到**矩形本身**的精确距离」

参考实现算的是 `到中心的距离 − 外接圆半径`。在一堆大小相近的方块里没问题，
但真实界面里有**长条**：

```js
// ❌ 1150×56 的顶栏：外接圆半径 575 → 指针落在下半个屏幕上都被判成「贴着顶栏」
const dist = Math.hypot(px - cx, py - cy) - Math.max(r.width, r.height) / 2;

// ✅ 到矩形的精确距离（矩形内 = 0），对任何长宽比都成立，而且一样便宜
const dx = Math.max(r.left - px, 0, px - r.right);
const dy = Math.max(r.top - py, 0, py - r.bottom);
const dist = Math.hypot(dx, dy);
```

这个 bug 的表现很有欺骗性：**光点长到了顶栏上、光柱的浓度一直满亮**，而卡片看起来正常。

折算：

```js
const RADIUS = 320;
const PROXIMITY = RADIUS * 0.5;   // ≤ 160px：满亮
const FADE = RADIUS * 0.75;       // ≤ 240px：线性淡到 0

let intensity = 0;
if (dist <= PROXIMITY) intensity = 1;
else if (dist <= FADE) intensity = (FADE - dist) / (FADE - PROXIMITY);
```

实测「指针停在卡片**外面**」：

```
离左边缘  60px → --gle 1.000   --glx −60px
离左边缘 200px → --gle 0.500   --glx −200px
离左边缘 300px → --gle 0.000
```

**`--glx` 是负值是对的** —— 光斑落在卡外，被 mask 裁出来的那一圈里，
亮的正好是朝着指针的那条边。指针在卡外时「靠边程度」算 1（它就在边上），
在卡内才算「越靠边越强」：`--gle = 距离强度 × 靠边程度`。

### 飘浮光点：做过，被用户要求删掉了

按参考实现（MagicBento 的 `enableStars`）加过一层 `.mote`：9 个飘浮光点，
只长在离指针最近的那张卡上，位置/漂移量随机写进行内、两条 CSS 动画分别管
`transform` 和 `opacity`。

**上线看过之后用户要求全部删掉**（「边缘光的跟随效果不需要飘浮的光子了，把光子都删了」）。
记在这里是**为了别再加回来** —— 它的实现要点（宿主迟滞、只认 `.card`、
`mote-blink` 不能从 `opacity: 0` 起否则是闪烁不是飘浮）都还有参考价值，
但**结论是：这个界面上不要它**。删的时候 DOM / CSS / JS 三处一起清，
并加了断言守住（DOM 里 0 个 + 样式表里不存在 `.mote` 规则）。

### 两样东西一起动

都由 JS 逐帧写的变量驱动（**JS 只写数，颜色和形状全留 CSS**）：
`--clx/--cly/--clop` 光柱、`--glx/--gly` 位置、`--glp` 卡内柔光强度、`--gle` 边缘光强度。

```css
/* 卡内柔光：跟着指针走 */
.card::after {
  content: ''; position: absolute; width: 200px; height: 200px;
  left: 0; top: 0; margin: -100px 0 0 -100px; border-radius: 50%;
  background: radial-gradient(circle closest-side, color-mix(in oklab, var(--lx-a) 20%, transparent), transparent 72%);
  transform: translate3d(var(--glx, 50%), var(--gly, 50%), 0);
  opacity: var(--glp, 0);
  pointer-events: none;
}

/* 边缘光：用 mask 把整块裁成一圈（外框减内容框），只有那 1.5px 的边会亮 ——
   读起来是「卡片的边被照亮了」，而不是「又糊了一块色斑」 */
.card::before {
  content: ''; position: absolute; inset: 0; padding: 1.5px; border-radius: inherit;
  background: radial-gradient(circle 160px at var(--glx, 50%) var(--gly, 50%),
    color-mix(in oklab, var(--lx-a) 95%, transparent), transparent 80%);
  opacity: var(--gle, 0);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}
```

⚠️ **两个伪元素都不要设 `z-index: -1`** —— 会被卡片自己的背景盖住
（那是半透明的玻璃色，不是透明的）。光要**落在内容上面**才像光。

### 阻尼跟随

```js
const DAMP = 0.18;       // 每帧吃掉剩余距离的比例
const SOFT_DAMP = 0.13;  // 明暗比位置再慢半拍，收尾更柔
const SETTLED = 0.4;     // 位置差小于这个像素数就算到位

// 一次瞬移后的实测：58 → 100 → 134 → 163 → 186 → 205 → 221 …（23 个不同值）
s.x += (s.tx - s.x) * DAMP;
s.p += (s.tp - s.p) * SOFT_DAMP;

// ⚠️ 停稳 + 已经隐身之后必须把 rAF 停掉、并把内联变量清干净
```

**矩形必须缓存。** 每帧对每张卡调 `getBoundingClientRect()` 会直接把帧率打下来 ——
「距离驱动」意味着每帧都要看**所有**卡片，比「碰到才亮」更容易踩这个。做法：

```js
if (performance.now() - rectsAt > RECT_TTL) {   // 500ms
  gather();    // 重新收集会发光的那些面（布局变过：切视图、展开面板）
  measure();   // 重新量矩形
}
// measure 里：视口外一圈（REACH = FADE + 40）之外的直接 rect = null，
//            后面的三角计算连做都不用做
```

实测（光柱还带一层全屏 `screen` 混合）：指针连续移动时帧间隔中位 **8.4ms**、p95 **12.5ms**。

三条容易被忽略的：

- **停循环**。一页几十张卡，指针不动还在烧 rAF 是最容易漏的性能问题。
  判据：`tp === 0 && p < 0.01 && |tx-x| < SETTLED`。
- **滚动要用「没动过的指针坐标」重算**（`document.elementFromPoint(lastX, lastY)`）——
  卡片位置变了但指针没动，事件不会来，光斑会停在旧位置。
- **第一次进入时从指针位置直接起手**，不要从 `(0,0)` 插值 —— 会看到一条横穿卡片的亮线。

### 「越靠边越强」的基准取**较短边**

```js
// 0 = 正中，1 = 贴边
const nearest = Math.min(x, w - x, y, h - y);
const half = Math.max(1, Math.min(w, h) / 2);

return Math.max(0, Math.min(1, 1 - nearest / half));
```

用长边做基准的话，一块又宽又扁的卡片，指针在左右来回走时（上下明明已经很近了）
边缘光一直不亮 —— 因为「距上边」永远只占长边的一半不到。用完短边，四周才是同一个尺度。

### 哪些面能「自己发自己」——看它是不是滚动容器

| 面 | 能不能挂元素自己的伪元素 |
|---|---|
| `.card`（普通卡片） | ✅ 可以 |
| `.topbar`（顶栏） | ✅ 可以 —— 它是 `sticky`，不滚动 |
| `.sidebar`（侧栏） | ❌ **不行** —— 它是 `overflow-y: auto` 的滚动容器 |

**滚动容器上不能挂绝对定位的光层**：`inset: 0` 的伪元素会**跟着内容一起滚走**，
滚到中间那圈光就没了。测试里最容易漏这条 —— 不滚动的时候一切正常。

另一条看着可行的路也不干净：这类容器往往有 `backdrop-filter`，按规范它会让元素成为
`fixed` 后代的包含块 —— 想在里面「钉住」一层就得依赖这条偏冷的规则，
还要和 `overflow` 的裁剪打架。

**做法：另开一层独立元素，`fixed` 到视口、按外壳的几何变量对齐它。**

```html
<div class="shell">
  <div class="island-glow" aria-hidden="true"></div>   <!-- fixed → 脱流，不占 grid 一列 -->
  <aside class="sidebar">…</aside>
  …
</div>
```

```css
.island-glow {
  position: fixed;
  top: var(--island-gap);
  left: var(--island-gap);
  width: var(--sidebar-w);                       /* 图标栏时换成 --rail-w */
  height: calc(100vh - var(--island-gap) * 2);
  border-radius: var(--island-radius);
  pointer-events: none;
  z-index: 4;
  transition: width var(--dur-island) var(--ease-enter);
}
html.is-rail .island-glow { width: var(--rail-w); }
/* ::after 就是那圈 mask 出来的边光，和卡片同一条做法 */
```

侧栏自己是 sticky 在 gap 处的，所以两者位置永远重合、和页面滚动无关。
**验收判据：光层的 `getBoundingClientRect()` 必须和侧栏重合（±2px），
而且侧栏滚动前后都要重合** —— 这一条才能证明「没跟着滚走」。
窄屏（侧栏 `display: none`）时记得把光层也隐藏。

**JS 侧要把「写变量的元素」和「量几何的元素」分开**：

```js
const surfaceOf = (x, y) => {
  const hit = document.elementFromPoint(x, y);

  if (!(hit instanceof Element)) return null;

  const card = hit.closest('.card');
  if (card) return { el: card, box: card };          // 卡片：自己发自己

  if (hit.closest('.sidebar')) {
    // 侧栏：几何取侧栏、变量写给那一层（CSS 变量不会从兄弟节点继承）
    return { el: document.querySelector('.island-glow'), box: document.querySelector('.sidebar') };
  }

  return null;
};
```

### ⚠️ 未定义的 `var()` 会**静默回落到 `currentColor`**

用户报「工作台最上面那些卡片鼠标悬浮有**白框**，太突兀、还盖住边缘光」。源码长这样：

```css
.card--lift:hover { border-color: var(--line-strong); transform: translateY(-3px); }
```

而全站**根本没有 `--line-strong`**（只有 `--line` / `--line-soft`）。
未定义的 `var()` **不报错、不警告、构建也不拦** —— 计算值阶段直接回落 `currentColor`。
深色主题下文字是浅色，于是那条边框就是一根白线，和用户「白框」的描述完全对上。

- **排查手法：改完样式读 computed，不要只读源码。** 源码里 `var(--line-strong)` 读起来完全合理，
  只有 `getComputedStyle` 会告诉你它变成了 `oklch(1 0 0 / …)` 或者别的什么
- 修法：删掉整条规则，顺带把 `prefers-reduced-motion` 里那条一起清干净
- 判据（写进断言）：基态与悬停的 border **完全相同**、transform 都是 `none`
  ```
  基态：border=oklch(1 0 0 / 0.09)  transform=none
  悬停：border=oklch(1 0 0 / 0.09)  transform=none
  ```
- 推广：`var(--x, fallback)` 写保底值能防这一类，但更稳的是**别引不存在的变量**。
  变量名重构之后记得 grep 全站用量。

## 二、底层点阵：让光场「打亮」它

背景纯黑太单调时，加一层细密点阵。**做法走过一个弯路，值得记下来。**

### 只靠混合模式做不到用户要的那件事

第一版是「静态点阵 + `mix-blend-mode: overlay`」。它能做到「有光的地方点更亮」，
但用户要的是「**光场照到的地方接近半透明，距离越远越淡甚至消失**」——
混合模式改变的是**颜色**，不是**存在与否**：暗处 `overlay` 等于原色，
点阵该在还是在，只是不亮而已。**「消失」这件事只能靠 `mask`。**

### 正解：静态图案 + 跟着光走的面具

```css
.lightfield__dots {
  position: absolute;
  inset: 0;
  mix-blend-mode: overlay;                 /* 有光的地方再亮一档 */
  background-image: radial-gradient(circle, oklch(100% 0 0 / 0.5) 0.55px, transparent 0.9px);
  background-size: 8px 8px;
  /* 三个圆 = 三层光的实际位置（主光在焦点、补光对角镜像、冷光垂直镜像）
     半径 = 各自的可见半径（0.68 × farthest-corner） */
  mask-image:
    radial-gradient(circle 430px at var(--lf-fx, 50%) var(--lf-fy, 50%), #000 0%, #000 34%, transparent 100%),
    radial-gradient(circle 490px at calc(100% - var(--lf-fx)) calc(100% - var(--lf-fy)), #000 0%, #000 34%, transparent 100%),
    radial-gradient(circle 355px at var(--lf-fx) calc(100% - var(--lf-fy)), #000 0%, #000 34%, transparent 100%);
  mask-composite: add;    /* 多层并集：哪里被照亮，哪里才有颗粒 */
}

[data-theme='light'] .lightfield__dots {   /* 白点在白底上 overlay 还是白 */
  background-image: radial-gradient(circle, oklch(30% 0.02 var(--neutral-hue) / 0.5) 0.55px, transparent 0.9px);
}
```

镜像公式直接用了光场那套 `placement`（`fx/fy = ±1`），所以**层的位置一改，
这里的镜像和半径要一起改**。焦点由光场引擎逐帧写进 `--lf-fx/--lf-fy`（百分比）。

### ⚠️ 两个必须注意的点

**① 用「阻尼后的焦点」，不是原始焦点。** 原始焦点是目标值，三层光是阻尼后才追上去的；
拿原始值当面具的位置，快速移动指针时会出现「点阵先亮、光才追上来」的错位。

**② 变量的写入要量化。** 点阵的面具依赖这两个变量 —— **每写一次，浏览器就要重算一遍
全屏的面具纹理**。0.25% 在 2560 宽上约 6px（比 8px 的点距还小），而慢速漂移每帧只挪
零点几像素；量化之后大部分帧根本不用重算：

```js
if (Math.abs(pctX - lastX) >= 0.25 || Math.abs(pctY - lastY) >= 0.25) {
  lastX = pctX; lastY = pctY;
  root.style.setProperty('--lf-fx', pctX.toFixed(2) + '%');
  root.style.setProperty('--lf-fy', pctY.toFixed(2) + '%');
}
```

**密度和浓度要一起调**：第一版是 `13px` + alpha `0.5`，反馈是「不够密集、而且太显眼」——
两个方向相反的诉求，所以是同时把间距压到 `8px`、alpha 降到 `0.3`。加上面具之后
（点只在光里出现）alpha 可以回到 `0.5`。

### 顺带：桌面端的光场也要「自己会动」

用户：「手机端不是会自己稍微动一动吗？电脑端也要这个效果，即会自己飘浮动一动、
也会跟着鼠标动」。

```js
// 指针模式：焦点 = 指针 + 一层缓慢漂移
pointerDriftReach: { x: 0.05, y: 0.042 },   // ±5% 视口半宽 ≈ ±64px
```

幅度要比触摸设备那档（`driftReach` ±0.62）**小一个量级** —— 光要仍然**贴着**指针，
只是不再死钉在那儿；再大就从「呼吸」变成「飘走了」。

⚠️ **代价：循环再也停不掉了。** 原来指针模式有一条「跟上指针就停掉 rAF」的优化，
现在作废了（光永远在动）。用**降帧**换：

```js
const frameBudget = (now) =>
  handle.mode !== MODE.POINTER
    ? config.driftFrameMs                                    // 触摸设备：30fps
    : (now - lastPointerAt > config.idleAfterMs              // 指针刚动过 → 满帧（跟手不能打折）
        ? config.pointerDriftFrameMs                          // 指针停着 → 30fps
        : 0);
```

慢速漂移每帧只挪零点几像素，30fps 看不出区别；而卡片那层 `backdrop-filter`
因此也少算了 60 次/秒。

### 换页时的开场动画：接上一页 → 飞到中间转一圈 → 回到鼠标

用户的诉求：「切换页面和刷新页面的情况下，光场的起点保留上一个页面的位置状态，
然后光场飞到页面中间转一圈当加载动画，转完又回到鼠标身边」。三段，首尾相接：

| 段 | 时长 | 干什么 |
|---|---|---|
| `toCenter` | 420ms | 从上一页的焦点 → 页面正中 |
| `orbit` | 900ms | 绕正中转一整圈（半径先涨后收）← 这就是那个「加载动画」 |
| `toPointer` | 640ms | 从正中 → 指针身边（终点带**实时**漂移量，交接无缝） |

```js
// 起点：pagehide 里写**阻尼后的焦点**（真正在屏幕上的那个），不是指针坐标 ——
// 要的是「光从它刚才在的地方接着走」
window.addEventListener('pagehide', () => {
  sessionStorage.setItem('huein-lf-from', `${Math.round(focusX)},${Math.round(focusY)}`);
});
```

**四个硬要点：**

1. ⚠️ **必须在第一次 `draw()` 之前把起点摆好** —— 否则首帧会先从默认位置（视口中心）起手、
   再「飞」到上一页的位置，**方向上正好反了**。
2. ⚠️⚠️ **阻尼会吃掉一半幅度**（最反直觉的一条，实测出来的）：焦点本身要阻尼一次
   （`damping[2] = 0.05`），三层的位置还要再阻尼一次 —— 于是**脚本里 360° 的一圈，
   画面上只剩 192°、半径只剩 79px**（设计值 126px）。解法两条一起上：
   **开场期间焦点不走阻尼**（精确跟脚本）+ **层的阻尼乘一个系数**（×4，跟到约 95%）。
   代价是三层之间的视差在这两秒变小 —— 刻意的，这段时间要的是「看得清轨迹」。
3. **接缝要连续**：`toCenter` 的终点就是中心，`orbit` 从 `k=0` 起（`grow = sin(0) = 0`，半径 0）；
   `orbit` 在 `k=1` 时 `grow = sin(π) = 0`（也回到中心），`toPointer` 从中心出发。
   而且**相位切换不要 `return`** —— 同一帧继续往下算，否则每段之间会多出一帧的停顿。
4. 开场期间**满帧**（降帧会让那一圈一顿一顿的）+ **不叠陀螺仪偏移**（轨道要干净）。

留一个 `?lfintro=0` 开关：自动化截图要一个**确定**的画面，
否则每次截图都取决于开场跑到哪一帧了。

**验收怎么量「转了一圈」**：逐帧采样焦点的位置，换算成 **px** 之后累加每帧的转角 ——
⚠️ 三个坑都在「量」这一侧，功能其实是好的：

- **必须在 px 空间算**：1600×900 时 1% x = 16px 而 1% y = 9px，一段「直着飞向中心」的位移
  在百分比空间里是弯的，会被算成 180° 的假转角（实测把 360° 量成了 545°）
- **半径趋近 0 时角度失去意义**：轨道收回中心那一刻 angle 乱跳，又累出上百度的假转角 →
  只统计「半径 ≥ 60px 且 `|Δangle|` 确实在动」的帧
- **探针要跳过「引擎还没写值」的帧**：那时 `--lf-fx` 是空串 →
  `parseFloat → NaN → || 0` → 被当成「焦点在 (0,0) 那个角落」，
  半径会量成 918px（正好是视口对角线的一半）

## 三、验收清单（都写成断言，不靠肉眼看）

**指针光（距离驱动，所以要先断言「不碰也亮」）**
- 指针光（**距离驱动**，所以要先断言「不碰也亮」）：
  指针停在卡片**外面** 60 / 200 / 300px 时，`--gle` 应该分别是 **满亮 / 约一半 / 0**，
  而且单调递减；此时 `--glx` 是**负值**（光斑在卡外，亮的是朝指针那条边）
- 光柱：`mix-blend-mode` 是 `screen`、位置逐帧逼近（≥8 个中间值）、
  第一次移动后**立刻**在指针处（不是从 (0,0) 划过来）；指针离开窗口后浓度归 0
- 光点：**已经删掉了** —— 守住这一条：DOM 里 0 个 `.mote`、样式表里也没有 `.mote` 规则
- ⚠️ 变量清掉后 `getPropertyValue` 返回空串，`parseFloat` 会给 `NaN` ——
  那正好是「已归零并清理干净」的意思，记得兜底成 0

**侧栏与顶栏**
- 侧栏与顶栏：指针在它们**外面** 70 / 90px 时 `--gle` 也要 > 0.5
- ⚠️ **「某个值应该很低」的断言，先确认取样位置真的满足前提**。
  测「远离所有面时整支光柱淡下去」时沿卡片左侧取样，而左边 44px 就是侧栏 ——
  三档浓度全是 0.85，看着像功能坏了，其实是取样点一直在侧栏上
- 整块岛（侧栏）的光层：**光层的 `getBoundingClientRect()` 要和侧栏重合（±2px），
  而且把侧栏滚下去之后仍要重合** —— 不滚动的时候两者永远重合，只有这一条能证明它没跟着滚走；
  再验窄屏（侧栏 `display: none`）时光层也隐藏
- 顶栏（导航栏）：`--gle` 贴左端与贴上边都要 > 0.6、在**正中**要 < 0.15（离四条边最远）；
  收起后整条 `opacity 0` + `pointer-events: none`，指针打不到它 → **不会留一条够不着的残光**
  ⚠️ 细长条上「靠近边缘」几乎总是成立（高 56px，纵向只有正中那点算「远」）——
  所以顶栏的边光在横向中点最弱、贴上下边最亮。这是用较短边做基准的必然结果，别当 bug 修

**点阵**
- 点阵：面具是**三个圆**（半径 = 三层光的可见半径）、
  **第一个圆的位置 == 光场写出的 `--lf-fx/--lf-fy`**（这一条才证明面具真由光驱动）、
  `mix-blend-mode` 是 `overlay`
  ⚠️ 计算后的 `mask-image` 里 `var()` **已经被解析**，拿它去 grep `var(--lf-fx` 必然失败；
  也**不能做字符串比较**（`51.20%` 会被规范化成 `51.2%`），要比数值
  ⚠️ 带 `g` 的 `String.match` 返回的是整个匹配（`'430px'`）不是捕获组 ——
  直接 `Number()` 得 `NaN`，要 `parseFloat`

**开场动画与自漂移**
- 开场动画（换页 / 刷新）：**首帧的焦点要接上一页**（距上一页位置 < 距页面中心）、
  `sessionStorage` 里的起点是 `\d+,\d+`、层的首帧 `transform` 与它一致；
  换算成 px 后逐帧累加转角 ≈ **360°（300~420）**、轨道峰值半径 ≈ 设计值 ±45%、
  中途回到过中心；`?lfintro=0` 时转角 < 60°
- 光场「自己在动」：指针**不动**时连续采样焦点，必须能采到 ≥2 个不同值；
  而指针一动仍要主导（两个对角之间差 > 40%）

**装饰性呼吸**
- 装饰性呼吸（比如卡片角上那点光）：`getAnimations()` 里有那条动画名，
  并且连续采样的 `opacity` 至少能有 2 个不同值

> ⚠️ 这一节里最容易出错的一类断言是**取样位置**：断言「某个值应该很低」之前，
> 先确认取样点真的满足前提（下面那条采样踩到侧栏的案例就是这么来的）。
