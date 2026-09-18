---
name: huein-lightfield-ui-style
description: 把一套「悬浮岛 + 光场」的暗色后台界面风格完整复刻到任意项目上。**给 AI 这一个技能就够** —— 入口是本文件，做法细节在同目录的 `references/` 里按需读取。覆盖：三层光场的焦点镜像模型、距离驱动的边缘光（鼠标即一盏灯）、跟着光走的面具点阵、两个互不接触的悬浮岛外壳、收起 / 展开与首帧状态、导航选中项「滑过去」、`<details>` 与折叠面板的展开过渡、内容依次浮入，以及一整套「都写成断言、不靠肉眼看」的验收手法。当用户说「复刻这种前端风格、照这套风格做个新后台、想要悬浮岛 / 边缘光 / 光场 / 点阵背景 / 呼吸感 / 高级感后台、这套设计的规则是什么、把绘影工作台那套 UI 搬过来」时使用。
agent_created: true
---

# 悬浮岛 + 光场 · 后台 UI 风格复刻

**设计语言一句话**：

> **光是指示注意力的工具，不是装饰。**

每当你想再叠一处光，先问一句「它在提示什么？」——答不上来就别加。
这条判据能挡掉九成的「花哨但廉价」。

---

## 零、怎么用这份技能（先读完这一节）

这份技能的正文是**入口与地图**，具体做法在 `references/` 下按需读取。
**不要凭记忆写代码 —— 每一步动手之前，先读那一步指定的文件。**

```
huein-lightfield-ui-style/
├── SKILL.md                  ← 你正在读的：原则 · 七步流程 · 骨架 · 地图
├── references/
│   ├── 01-tokens.md          设计 token 全表与色相派生推导
│   ├── 02-shell.md           悬浮岛外壳：几何 / 收起展开 / 窄屏 / 首帧 / 滚动 / 缓存
│   ├── 03-light.md           光：边缘光 / 光柱 / 点阵 / 三层光场 / 开场动画
│   ├── 04-motion.md          导航飞行 · 展开过渡 · 内容浮入
│   └── 05-verify.md          验收与取证手法（怎么写断言 · 测试脚本的坑）
├── assets/
│   ├── tokens.css            ← 可直接改用（MIT，见 LICENSE）
│   └── lightfield.js         光场引擎，851 行，可直接改用
├── PROMPT.md                 给 AI 的一键复用提示词（复制粘贴用）
└── README.md
```

**硬规则（不遵守会做错）**

1. **按顺序做，不要跳步。** 七步的顺序是设计过的 —— 后一步假设前一步已经就位。
2. **每一步动手前读对应 reference**，尤其是 `01-tokens.md` 和 `05-verify.md`。
3. **每一步做完就自检**，不要攒到最后一起验。断言怎么写见 `references/05-verify.md`。
4. **一次只改一小块。** 这种风格几乎全是动效与光，一次性铺开改，
   出问题时无法定位是哪一步引入的。
5. **`.standalone.md`（如果仓库里有 `SKILL.full.md`）是所有文件的拼接版** ——
   只有在「只能粘贴一个文件、读不到 `references/`」时才用它。
   能用 `references/` 就一定用，按需读取比全文照读省得多。

**如果你读不到 `references/`**（只拿到了这一份文本）：
信息量仍然够开始第 1、2、4、5 步 —— 本文件里有原则、流程、骨架、和三处最贵的坑。
动手写 `light()` 之前先说明「缺了光场那部分的细节，我按骨架里描述的三层镜像模型实现」，
不要硬编。

---

## 一、三条原则

1. **光有方向。** 所有光层对**同一个**「光场焦点」做响应（桌面 = 指针，触摸 = 漂移的虚拟点）。
   绝不要出现两个各自为政的光源 —— 那是「装饰」的味道。
2. **深色是主场景，浅色不是反色。** 两套**独立调校**：
   浅色下光场 chroma 降一档、玻璃换实色、文字加粗。
   直接反相或简单换亮度会立刻露出廉价感。
3. **动效只动 `transform` 与 `opacity`，绝不回弹。**
   「呼吸感」来自**错峰 + 时长**，不是来自花哨的曲线。会弹的缓动一律不用。

## 二、从零复刻 · 七步

| # | 做什么 | 读哪一份 | 做完的样子 |
|---|---|---|---|
| 1 | **定 token**：色相派生、间距、圆角、字号、动效阶梯 | `references/01-tokens.md` | 改一个 `--brand-hue` 能派生整套协调配色 |
| 2 | **搭外壳骨架**：`grid` + 一圈等宽留白，做出两个互不接触的悬浮岛 | `references/02-shell.md` §一 | 侧栏与顶栏之间有一条等宽缝，四周留白相等 |
| 3 | **收起 / 展开**：侧栏收成图标栏、顶栏浮走并把纵向空间还回来 | `references/02-shell.md` §四 | 两个方向都能收，且收起来真的省出了空间 |
| 4 | **首屏入场 + 解析期状态 + 动画残留清理** | `references/02-shell.md` §二 §三 §五 §八 | 刷新后第一帧就是正确状态，静置后无残留 transform |
| 5 | **导航切换的「滑过去」+ 可展开内容的过渡** | `references/04-motion.md` | 选中项从旧项滑到新项，中途没有暗缝 |
| 6 | **光**：先边缘光（距离驱动），再光标光柱，最后点阵的面具 | `references/03-light.md` | 指针不碰卡片也能点亮它的边 |
| 7 | **内容依次浮入** | `references/04-motion.md` 后半 | 内容一块块从雾里凝出来，错峰不挤在一起 |

> 第 4 步的「解析期状态」和第 6 步的「开场动画」是最容易被跳过、也最容易返工的两处 ——
> 它们都涉及「第一帧长什么样」，**事后补的代价很高**。

## 三、页面骨架（照抄，顺序都不要改）

```html
<body>
  <!-- ① 底色：三层光 + 点阵。fixed，最底，不吃事件 -->
  <div class="lightfield">…</div>

  <!-- ② 侧栏的边光：因为侧栏是滚动容器，光不能挂在它自己身上 -->
  <div class="island-glow"></div>

  <!-- ③ 光标光柱：fixed + mix-blend-mode: screen -->
  <div class="cursor-light"></div>

  <div class="shell">
    <aside class="sidebar">…</aside>
    <div class="shell__main">
      <header class="topbar">…</header>
      <main class="shell__content">…</main>
    </div>
  </div>
</body>
```

### 三条铁律（这三条是这套风格里最贵的知识）

**① 所有 `fixed` 层必须在内容区之外。**
`animation-fill-mode: both` 的终态**不是 `none`** —— computed 的 `transform` 是矩阵、
`filter` 是 `blur(0px)`，**两者都会让元素成为 `position: fixed` 后代的包含块**。
把遮罩、ghost、toast 放进内容区，它们会塌成一条横条贴在页面下半部分。
→ 推论：**动画播完必须撤掉 `animation`**。

**② 滚动容器上的光要另开 `fixed` 层。**
挂在滚动容器自己身上会跟着内容一起滚走，而且**不滚动的时候看不出问题**。

**③ 解析期状态一律用内联脚本。**
主题、折叠状态、导航起手、滚动位置这些「来自 localStorage / sessionStorage」的状态，
必须在 `<head>` 或 body 末尾的内联脚本里就应用 ——
模块脚本是 **deferred**，跑到之前浏览器已经画过几帧，用户会看到「先闪一下再变」。

## 四、这套风格里最容易做错的三个地方

先记住这三条，能省掉一整轮返工。细节见对应 reference。

1. **三层光场是「围绕焦点做镜像」，不是三个固定锚点。**
   主光（品红）在焦点 · 补光（琥珀）对角镜像 · 冷光（靛紫）垂直镜像。
   ⚠️ 写错成「三个固定锚点 + 微视差」的后果是：三团光全挤在屏幕上方一条横带、下半屏纯黑。
   **参数都在、不报错、注释还理直气壮 —— 看代码根本看不出错。** → `references/03-light.md`
2. **光由「距离」决定，不是「碰到才亮」。**
   距离要用「到**矩形本身**的精确距离」（矩形内 = 0），
   不是「到中心距离 − 外接圆半径」（那会让指针在下半个屏幕都被判成贴着顶栏）。
   → `references/03-light.md`
3. **生硬通常出在「时序」，不在曲线。**
   凡是「A 已经到位、B 还在路上」，调 B 的曲线永远调不好 —— 要把 **A 按住**。
   → `references/04-motion.md`

## 五、做完的样子（Definition of Done）

全部按 `references/05-verify.md` 的方式写成**断言**，不靠肉眼看。至少要能证明：

- [ ] 四周留白相等、两个岛不接触（缝 = gap）
- [ ] 收起态刷新后，**第一帧**就是收起态（不是先展开再折一下）
- [ ] 首次加载有入场动画；**第二次加载没有**，且静置后 `transform` / `clipPath` 都是 `none`
- [ ] 导航切换：滑块起点贴着旧项（< 16px）、终点贴着新项（< 16px）
- [ ] 落地过程**逐帧采样**「两层 opacity 的叠加」恒为 1（没有暗缝）
- [ ] 指针**不碰**卡片时 `--gle` 也 > 0（距离驱动），且随距离单调递减
- [ ] 点阵面具的第一个圆的位置 == 光场写出的 `--lf-fx / --lf-fy`
- [ ] 刷新 / 换页时，光场起点接的是**上一页的位置**
- [ ] 全站没有「引用了但不存在的 CSS 变量」（这个坑会让边框变成白框，且**不报错**）
- [ ] 控制台无 `pageerror`

---

## 附：这份技能的来历

从 [绘影工作台 hueinbench](https://github.com/CODES233)（自媒体工作室管理系统，AGPL-3.0）
里把这套界面风格抽出来的一份复刻手册。原项目里这套设计已经跑过 13 个版本迭代，
下面每一条「⚠️」基本都是真实踩过的坑，不是推演出来的。

本仓库以 **MIT** 开源，见 `LICENSE`。作者同为绘影工作台的作者，
故本仓库中的 `assets/`（与该项目同源）在此按 MIT 另行授权。


---

<!-- ============================================================
     以下是 references/01-tokens.md
     ============================================================ -->

# 01 · 设计 token

> 这一份是七步里的**第 1 步**。做完它，后面六步才有地基。
> 完整可跑的版本见 `../assets/tokens.css`（194 行，MIT，可直接改用）。

## 核心手法：只暴露一个参数

整套配色**只由一个 `--brand-hue` 派生**。换一个色相，整个光场会**协调地**换色 ——
不会出现一堆互相打架的颜色。这是这套风格最值得抄的一件事。

```css
:root {
  /* ---- 唯一的手法入口 ---- */
  --brand-hue: 285;                          /* 0-360 */
  --neutral-hue: var(--brand-hue);           /* 中性色掺品牌色相，而不是死灰 */
  --warm-hue: calc(var(--brand-hue) + 160);  /* 浅色主题用的暖调中性：285 → 85 */

  /* ---- 三层光场的色相（由主色相派生）---- */
  --lx-a-hue: calc(var(--brand-hue) + 65);   /* 主光 → 350 品红 */
  --lx-b-hue: calc(var(--brand-hue) + 143);  /* 补光 →  68 琥珀 */
  --lx-c-hue: calc(var(--brand-hue) - 10);   /* 冷光 → 275 靛紫 */
}
```

**两个反直觉的地方，都是踩出来的：**

- **中性色不是死灰**（`--neutral-hue` 跟着品牌色相走）。用 `oklch(L 0 0)` 的纯灰会和品牌色
  明显不在一个世界里，页面读起来是「彩色 + 灰色」，而不是「有色调的暗面」。
- ⚠️ **第三层光刻意只偏 −10。** 早先写的是 `-75`（→ 210 青蓝），画面变成
  「品红和青蓝两种颜色在打架」，和设计稿对不上、观感发脏。
  **它要和品牌色同族** —— 三层光是「同一束光被拆开」，不是三个不同颜色的灯。

## 间距 / 圆角 / 字号：固定阶梯，不做流体

```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

--r-1: 6px;  --r-2: 10px;  --r-3: 14px;  --r-4: 20px;  --r-pill: 999px;

--f-xs: 0.6875rem;  /* 11px 微标签 */
--f-sm: 0.8125rem;  /* 13px 辅助 */
--f-md: 0.9375rem;  /* 15px 正文 */
--f-lg: 1.0625rem;  /* 17px 小标题 */
--f-xl: 1.375rem;   /* 22px 标题 */
--f-2xl: 1.75rem;   /* 28px 页面标题 */
--f-3xl: 2.25rem;   /* 36px 数字 */
```

**不要上 `clamp()` 流体排版。** 后台是密集信息界面，字号要在不同屏宽下**保持一致**，
否则密集表格的可读性会随窗口宽度漂移。岛的圆角统一用 `--r-4`（20px）。

## 动效 token

分两组：一组是**基础的**，一组是**语义化的**（表达「这是什么动作」）。
后者是这套风格手感的关键 —— 不要一个 `--dur` 用到底。

```css
/* 基础三档 */
--dur-1: 120ms;  --dur-2: 220ms;  --dur-3: 420ms;
--ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);

/* 几何：外壳 */
--island-gap: 12px;
--island-radius: var(--r-4);
--sidebar-w: 244px;
--rail-w: 76px;              /* 收起后的图标栏 */

/* 语义化时长 —— 这几条决定「手感」 */
--dur-island: 460ms;         /* 手动收起 / 展开 */
--dur-island-in: 720ms;      /* 首屏入场 */
--dur-enter: 760ms;          /* 内容进入 */
--dur-enter-slow: 1050ms;
--dur-enter-fade: 560ms;     /* 只做位移、不模糊的那一档 */
--dur-char: 880ms;           /* 逐个字的进入 */
--dur-unfold: 660ms;         /* 卡片展开 */
--dur-collapse: 420ms;       /* 折叠面板（实际时长随内容高度算） */
--dur-disclosure: 320ms;
--dur-navland: 300ms;        /* 导航落地 */
--dur-navlift: 180ms;        /* 导航起飞 */

/* 两条语义化缓动 —— 别混用 */
--ease-enter: cubic-bezier(0.16, 1, 0.3, 1);  /* easeOutExpo：大动作，前冲感 */
--ease-focus: cubic-bezier(0.61, 1, 0.88, 1); /* easeOutSine：快结束、慢收尾 */

/* 聚焦感的时长 */
--dur-focus: 720ms;
```

⚠️ **`--ease-enter`（easeOutExpo）只适合「一个岛从中间铺开」这种大动作。**
它前 30% 就走完 80% 的路 —— 用在 100~300px 的位移上，剩下 70% 时间几乎不动，
读起来像「**闪一下**」而不是「移过去」。短位移用 `--ease-in-out`。

⚠️ **`--dur-focus` 从 900 调到 720ms 是靠算出来的**：easeOutSine 的形状决定
「t 时刻还剩多少雾」**只看总时长**，换曲线效果更小。所以想让雾散得快，直接减时长。

## 色板

**暗色是默认**（剪辑 / 审片 / 深夜排期时用的那套）。**浅色是单独调过的一整套，不是反色。**

| 用途 | 暗色 | 浅色 |
|---|---|---|
| 底 | `--bg` `oklch(11.5% .018 var(--neutral-hue))` · `--bg-deep` 8.5% | 97.5% · `--bg-deep` 94.5%（暖调中性） |
| 面 | `--surface` 16.5% / `--surface-2` 20.5% / `--surface-3` 25% | 100% / 98% / 95.5% |
| 描边 | `--line` `oklch(100% 0 0 / .075)` · `--line-soft` `/ .045` | `oklch(0% 0 0 / .085)` · `/ .05` |
| 文字 | `--text` 97% / `--text-2` 80% / `--text-3` 62% / `--text-4` 48% | 23% / 42% / 55% / 66% |
| 玻璃 | `--glass-bg` alpha **0.55** · `--glass-blur` **18px** | alpha **0.86** · `--glass-blur` **0px** |
| 强调 | `--accent` `oklch(72% .19 var(--brand-hue))` | `oklch(52% .19 …)` |

**三层光**（浓度直接对齐设计稿）：

| | 暗色 | 浅色 |
|---|---|---|
| 主光 a | `oklch(68% .24 var(--lx-a-hue) / .30)` | `oklch(60% .21 … / .26)` |
| 补光 b | `oklch(79% .15 var(--lx-b-hue) / .22)` | `oklch(70% .14 … / .21)` |
| 冷光 c | `oklch(66% .19 var(--lx-c-hue) / .26)` | `oklch(56% .17 … / .22)` |

`--lx-x-strength` 只当**总开关**用（`prefers-reduced-motion` 时才归零），
平时的浓度由上面的 alpha 决定 —— **这两者相乘，别在两边重复打折。**

## 四个实测调出来的值（照抄就行，别自己重调）

1. **暗色 `--glass-bg` 用 0.55 是真的可以半透明** —— 背后有光场可透。
   浅色一开始写 0.92，**会把身后的光场完全挡掉，页面看起来就是一片死白** → 降到 0.86。
   太透（< 0.8）也不行，白底上会变成一团灰雾。
2. **浅色下光场的 chroma 要降一档，但浓度反而要比设计稿高一档。**
   降 chroma 是因为白底上高彩度刺眼；**提浓度是因为载体不同** ——
   设计稿是文档页（纯背景 + 文字），光场直接可见；卡片密集型界面里
   光只从卡片缝隙和页面边缘透出来，照搬设计稿的浓度会几乎看不见，
   「光场」这条设计语言就失效了。
3. **浅色下文字要更粗**（`--weight-strong: 600`，暗色是 500）。
   细字在白底上比黑底更虚。
4. **浅色的 `--glass-blur` 是 0px** —— 白底上做模糊只会得到一团灰雾，没有意义。

## 两处降级（别省）

```css
/* 浏览器不支持 backdrop-filter → 换实色，别让卡片糊成一片 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  :root          { --glass-bg: oklch(18% .022 var(--neutral-hue) / .94); }
  [data-theme='light'] { --glass-bg: oklch(100% 0 0 / .97); }
}

/* 系统设了「减少动态效果」→ 光场整个停掉（不是只关动效） */
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-1: 0ms; --dur-2: 0ms; --dur-3: 0ms;
    --lx-a-strength: 0; --lx-b-strength: 0; --lx-c-strength: 0;
  }
}
```

## 落地检查清单

- [ ] 改成自己的 `--brand-hue`，三层光的色相跟着变协调（第三层要和品牌同族）
- [ ] 中性色跟着品牌色相走，不是纯灰
- [ ] 间距 / 圆角 / 字号都是固定阶梯，没有 `clamp()` 流体排版
- [ ] 动效 token 分「基础」与「语义化」两组，不是一个 `--dur` 用到底
- [ ] 明暗两套都单独看过（浅色不是反色：chroma 降档、玻璃换实色、文字加粗）
- [ ] ⚠️ 全站**没有**「引用了但从未定义」的 CSS 变量 —— 那个坑会让描边变成白框且不报错，
      检查手法见 `05-verify.md` 末尾（另外提醒：**全站只有 `--line` 和 `--line-soft`，
      没有 `--line-strong`**，别顺手编一个出来）
- [ ] `backdrop-filter` 的降级分支和 `prefers-reduced-motion` 都在


---

<!-- ============================================================
     以下是 references/02-shell.md
     ============================================================ -->

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


---

<!-- ============================================================
     以下是 references/03-light.md
     ============================================================ -->

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


---

<!-- ============================================================
     以下是 references/04-motion.md
     ============================================================ -->

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


---

<!-- ============================================================
     以下是 references/05-verify.md
     ============================================================ -->

<!-- 本文件是 huein-lightfield-ui-style 技能的验收参考，每一步做完都要回来读。 -->

# 05 · 验收与取证（怎么写断言 · 测试脚本的坑）

> 这套风格几乎全是动效与光，而**动画是最容易「看着对、其实不对」的东西**。
> 所以每一步做完都要验收 —— 而且要用断言，不靠肉眼看。

## 一、四条通用手法（先记住这个）

### ① 别用轮询，也别等动画播完再读

这是最容易搞错的一条。挂 `addInitScript` 探针，跟着 `requestAnimationFrame`
**一帧一个样本**记下来，跑完再去断言那段序列。

```js
await ctx.addInitScript(() => {
  window.__frames = [];
  let n = 0;
  const tick = () => {
    // 这里读所有你想验的值，压进 window.__frames
    if (n++ < 140) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
```

- ❌ 外部每 55ms 轮询一遍：`commit` 之后到第一次绘制之间有一段时间，
  这段里采到的是「还没渲染」，会误报成「坏了」
- ❌ 等动画播完再 `getAnimations()`：那时候 `is-in` 类已经摘了，
  **动画名和延迟全都读不到**

### ② 伪元素上的 CSS 动画，`element.getAnimations()` 拿不到

必须走 `document.getAnimations()`，再按目标 + 伪元素筛：

```js
const anims = document.getAnimations().filter(
  (a) => a.effect.target === el && a.effect.pseudoElement === '::after',
);
```

（本套风格里大量使用 `::after` / `::before` 承载「着色层」，所以这条很常用。）

### ③ 拍动画定格：用 WAAPI 暂停，不要「等 N 毫秒再截」

```js
await page.evaluate((t) => {
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
}, 300);
await page.screenshot({ clip: { … } });
```

⚠️ 只想定格**一条**动画时，别把位移那条一起暂停 —— 它要停在终点，
拉回中间会把元素拽回半空。

### ④ 量计算后的样式，要读「点击之后」那一帧

`transitionDuration` 这类值在读它的那一刻才有意义。
逐帧记录的话，`frames[0]` 往往是**点击之前**的那一帧 —— 读它会得出旧值。

**另外**：变量被清掉之后 `getPropertyValue` 返回空串，`parseFloat` 会给 `NaN` ——
那正好是「已归零并清理干净」的意思，记得兜底成 0。

---

## 二、内容浮入

- 每页的单元数 ≥ 4（**空状态页除外** —— `div.empty` 那种天生就 3 个，先造数再测）
- `--i` 是 0..n−1 的连续序列（页面上的 `[data-reveal]` 全算，含手工标的）
- 首帧之后 `is-booting` 已撤

## 三、测试脚本本身的坑

- ⚠️ **每段测试之前先断言「自己在对的页面上」**。清理临时文件时把验收账号脚本一起删了，
  于是登录**静默失败**、整段测试跑在登录页上，报出来的却是「点阵不对」这种假象
  （`getComputedStyle(null)` 直接抛错，或者元素读不到而断言全红）。
  加一条 `hasShell && pathname !== '/login'` 的断言，能省掉一轮排查。
- 同理：凡是「页面元素读不到」的断言，前面都要先确认页面加载成功。
- Playwright 里点一个**折叠分组内的导航项**会 30s 超时（"element is visible" 但被别的元素
  拦截 pointer events —— 正是「overflow 裁剪不算不可见」那一条）。跑之前先展开那一组
- `addInitScript` 跑在 `<html>` 存在**之前**，`document.documentElement` 还是 `null`。
  只是改 `Element.prototype` / 挂 `requestAnimationFrame` 没事；
  要去 `observe(document.documentElement)` 就得用 `MutationObserver(document, { childList: true })` 等它插进来
- ESM 的 `import` **不认 `NODE_PATH`**，`import { chromium } from 'playwright'` 会
  `ERR_MODULE_NOT_FOUND`。用 `createRequire(import.meta.url)('playwright')`
- 从 Git Bash 传 `OUT="$(pwd)"` 会得到 `/c/Users/...`，Windows 上被解析成
  `\c\Users\...` → 文件写到 `C:\c\...` 去了。传真正的 `C:\...` 路径
- 连拍动画要用 `page.screenshot({ clip })` 框住侧栏再拍 —— 全屏图上那块高亮只有指甲盖大，
  截完自己也看不清效果
- **量滚动条占位**：页面用 `window.innerWidth − documentElement.clientWidth`；
  元素上用 `offsetWidth − clientWidth − 左右边框`。
  两种都容易写错，而且写错的方向都是「得出 0」→ 误判成「没有滚动条」

## 四、静态对账：别让「不存在的变量」溜过去

白框那个坑（成因见 `03-light.md` 的「未定义的 `var()` 会静默回落到 `currentColor`」）
**不报错、控制台干净**，靠人眼在几十条规则里找是不现实的 —— 值得做成一条常驻断言：

```
① 读所有 css，先剥掉注释（注释里写 var(--x) 是说明，不是引用；
   不剥的话自己留的那段说明会变成一条永远失败的假阳性）
② 定义集 = 匹配 --x:    引用集 = 匹配 var(--x)
③ 运行时集 = JS 里 setProperty('--x'  +  模板内联 style="…--x: …"
④ 断言：引用集 − 定义集 − 运行时集 必须为空
```

实例：**103 个引用全部有出处**（90 个样式表内定义 + 14 个运行时写入，有 1 个两边都算）。

- 反方向（定义了却没人引用）适合当**信息**打印，不适合当断言 —— 过渡期里很正常
- 这条检查的价值在于**它是活的**：以后谁写错一个变量名，当场就红

## 五、把上面的都变成一条命令

验收脚本建议按这个形状组织，`exit code` 直接当成败信号：

```
1. 起服务 → 2. 登录 → 断言「我在对的页面上」→ 3. 逐帧探针 → 4. 各项断言
→ 5. 把失败项连同「实际值 / 期望值」一起打出来 → 6. 打印 通过 N · 失败 M
```

⚠️ 失败信息里**一定要带实际值**。只报「不对」的话，下一轮还是要重新插桩去看。
