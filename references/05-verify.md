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
