/* ============================================================
   huein-lightfield-ui-style · assets/lightfield.js
   来自 绘影工作台 hueinbench（自媒体工作室管理系统，AGPL-3.0）。
   本仓库以 **MIT** 授权（见根目录 LICENSE）—— 作者同为绘影工作台的作者，
   故同一份代码在此按 MIT 另行授权，可直接抄进你的项目。
   ============================================================ */

/**
 * 光场引擎 LIGHTFIELD · 绘影工作台
 * 绘影社 HUEINMEDIA · 扣子  |  AGPL-3.0-or-later
 * ------------------------------------------------------------
 * 三层视差光场。设计意图：**光是指示注意力的工具，不是装饰。**
 *
 * ── 四种操控模式，按设备自动选 ──────────────────────────────
 *
 *   pointer  桌面（有精确指针）  → 跟随鼠标，停下就停止帧循环
 *   sensor   手机 + 陀螺仪已授权 → 轻微自动漂移 **叠加** 陀螺仪偏移
 *   drift    手机没有陀螺仪     → 仅轻微自动漂移，永远在缓慢流动
 *   off      减动画偏好 / 降级到底 / 手动关闭
 *
 * 关键设计：**任何设备都能感受到光场，只是操控方式不同。**
 * 手机没有指针，就用「自动漂移 + 重力感应」——
 * 你转身、倾斜手机，光会跟着偏，和鼠标跟随是同一套视觉语言。
 *
 * 陀螺仪在 iOS 上需要**用户手势**才能申请权限，所以引擎提供
 * `needsOrientationPermission()` 与 `enableOrientation()`，
 * 由界面决定何时弹一个「开启重力感应」的小提示（见 app.js）。
 *
 * ── 性能预算（写死在引擎里，不靠开发者自觉）────────────────
 *   ① prefers-reduced-motion        → 完全不启动
 *   ② 逻辑核心 ≤ 4                  → 只保留一层
 *   ③ 首帧成本 > 12ms               → 降一层
 *   ④ 连续 3 秒平均帧率 < 45        → 降一层（每层只降一次）
 *   ⑤ 标签页不可见                  → 暂停帧循环
 *   ⑥ 非指针模式限帧 30fps          → 自动漂移不需要 60fps，省电
 *
 * 实现上的三条克制：
 *   · 每帧**只写 transform**，绝不读布局属性
 *   · 用 radial-gradient 的柔和边缘代替 filter: blur()（模糊是帧率杀手）
 *   · 指针模式静止时**停止帧循环**；漂移模式限帧运行
 */

/** 模式常量，界面与测试都用它，避免到处写魔法字符串。 */
export const MODE = {
  POINTER: 'pointer',
  SENSOR: 'sensor',
  DRIFT: 'drift',
  OFF: 'off',
};

const CONFIG = {
  /** 每层的 lerp 阻尼。越小越「重」，跟得越慢，视差感越强。 */
  damping: [0.12, 0.075, 0.05],

  /**
   * 三层相对「光场中心」的空间关系 —— 与设计方案逐字对应。
   *
   * 方案里是用 CSS 变量 `--mx / --my`（指针位置）直接算的：
   *    .l1  translate3d(calc(var(--mx) - 450px), calc(var(--my) - 450px))      ← 主光在指针处
   *    .l2  translate3d(calc(100vw - var(--mx) - 510px), calc(100vh - var(--my) - 510px))
   *    .l3  translate3d(calc(var(--mx) - 370px), calc(100vh - var(--my) - 370px))
   *
   *  也就是：主光跟着指针、补光跑到对角线镜像处、冷光跑到垂直镜像处。
   *  三团光构成一个**随指针平移的三角形**，指针一动整片光都在动 —— 这是方案的核心观感。
   *
   *  ⚠️ 早先这里写的是「三个固定锚点（0.42/0.32、0.58/0.66、0.78/0.28）+ 小幅视差」，
   *  结果三团光全挤在屏幕上方一条横带里、下半屏纯黑，与方案完全不是一回事。
   *  看代码时完全看不出来 —— 参数都在，只是空间关系错了。
   *
   *  fx / fy 是镜像系数：+1 与焦点同向，-1 反向。数组顺序 = DOM 顺序 = [c, b, a]。
   */
  placement: [
    { fx: 1, fy: -1 },  // c 冷光：垂直镜像
    { fx: -1, fy: -1 }, // b 补光：对角镜像
    { fx: 1, fy: 1 },   // a 主光：跟随焦点
  ],

  /** 非指针模式下「虚拟焦点」的游走幅度（相对视口半宽/半高） */
  driftReach: { x: 0.62, y: 0.52 },

  /**
   * **指针模式下也叠一层漂移** —— 桌面端的光也要「自己在动」。
   *
   * 用户的原话：「背景的光场手机端不是会自己稍微动一动吗？电脑端也要这个效果，
   * 即会自己飘浮动一动也会跟着鼠标动」。
   * 幅度比触摸设备小得多（±5% 视口半宽 ≈ ±64px）：光要仍然**贴着**指针，
   * 只是不再死钉在那儿。再大就从「呼吸」变成「飘走了」。
   */
  pointerDriftReach: { x: 0.05, y: 0.042 },

  /** 陀螺仪把焦点整体推开的比例（相对视口半宽/半高） */
  tiltReach: 0.17,

  /** 自动漂移：两个不同周期的正弦叠加，得到不重复的缓慢游走。
   *  频率单位是「每秒圈数」，0.045 即约 22 秒一圈 —— 慢到不会让人分心。 */
  drift: {
    ax: 0.045,
    ay: 0.031,
    bx: 0.017,
    by: 0.023,
    mix: 0.32,
    weight: 1,
  },

  /** 陀螺仪：把倾斜角映射到偏移量。
   *  gamma（左右）±35° 打满；beta 以 45°（自然握持角）为零点，±35° 打满。 */
  tilt: {
    gammaRange: 35,
    betaNeutral: 45,
    betaRange: 35,
    /** 平滑系数。比指针更迟钝，否则手一抖光就跳。 */
    damping: 0.06,
    weight: 1,
  },

  /** 缓动收敛判定阈值（px）。差值小于它就认为到位，可以停掉帧循环。 */
  settleEpsilon: 0.08,

  /**
   * 换页 / 刷新的**开场动画**。
   *
   * 用户的原话：「切换页面和刷新页面的情况下，光场的起点保留上一个页面的位置状态，
   * 然后光场飞到页面中间转一圈当加载动画，转完又回到鼠标身边」。
   *
   * 三段：
   *   toCenter  —— 从上一页留下的位置飞到页面正中
   *   orbit     —— 绕正中转一整圈（这就是那个「加载动画」）
   *   toPointer —— 转完回到指针身边
   *
   * ⚠️ 起点靠 sessionStorage 记（`startKey`）—— 页面一跳，DOM 全是新的，
   *    上一页的焦点只可能留在会话存储里。存的是**阻尼后的焦点**（真正在屏幕上的那个），
   *    而不是指针坐标：用户要的是「光从它刚才在的地方接着走」。
   *
   * 总时长 ≈ 420 + 900 + 640 ≈ 1.96s —— 它同时充当一个「这页在加载」的信号，
   * 所以不追求快，追求**看得清**。
   */
  intro: {
    startKey: 'huein-lf-from',
    toCenterMs: 420,
    orbitMs: 900,
    toPointerMs: 640,
    /** 轨道半径，按视口短边取比例 —— 手机上 ±55px、桌面上 ±126px */
    orbitRadius: 0.14,
  },

  /**
   * 开场动画期间给三层的阻尼乘一个系数。
   *
   * ⚠️ 不乘的话动画是「糊」的：a 层的阻尼是 0.05，跟一个 420ms 的位移要 1 秒多才追得上，
   *    转的那一圈也会被抹平 —— 实测焦点明明扫过 360°，层上只剩 192°、半径只剩 79px
   *    （「转一圈」被阻尼吃掉了一半）。乘 4 之后层能跟上约 95% 的幅度。
   *    代价是三层之间的视差在开场这一段会变小 —— 那是刻意的，这段时间要的是「看得清轨迹」。
   */
  introDampingBoost: 4,

  /**
   * ── 为什么这里没有「帧率预算」了 ──────────────────────────────
   *
   * 早先实现过：连续 3 秒平均帧率低于阈值就逐层降级，降到底就整个关闭。
   * 前后踩了两次，最后**整个删掉**了：
   *
   *   第一次：降到 1 层后直接 disable()，光场整个消失。用户在 2560×1080 上
   *          看到的是「和设计方案完全不一样，光没了」，而日志里一片干净。
   *   第二次：改成「最低保留一层」，但**只剩一层时只画冷光那一团**
   *          （740px，比主光小一圈），用户的反馈是「覆盖不满整个网页」——
   *          还是走样。
   *
   *  根本問題是**这个测量不可靠**：
   *    · headless / 无 VSYNC 环境下 rAF 帧率天然只有 10~20fps，100% 误判
   *    · 桌面真实環境里，页面加载、后台任务、其它标签页都会拉低帧率
   *    · 而三层光斑只是 GPU 合成，**掉几帧用户根本感知不到，
   *      少一层却一眼就能看出来** —— 惩罚方向完全反了
   *
   *  所以改成**确定性规则**，不再猜设备的性能：
   *    · prefers-reduced-motion        → 关闭（用户的明确意愿）
   *    · 触摸设备 / 逻辑核心 ≤ 4        → 1 层（手机不值得为装饰跑三层）
   *    · ?lf=off、?lflevel=N           → 手动
   *
   *  需要对照满血效果时用 ?lflevel=3。
   */

  /** 非指针模式的帧间隔（毫秒）。33ms ≈ 30fps —— 自动漂移不需要 60fps，省电。 */
  driftFrameMs: 33,

  /**
   * 指针**停下来之后过了多久**就按「只剩漂移」处理（毫秒）。
   * 见下面的 `pointerDriftFrameMs`。
   */
  idleAfterMs: 220,

  /**
   * 指针模式下、指针停着时的帧间隔。
   *
   * 指针模式以前是「跟上指针就停循环」，现在桌面端也要自己漂 —— 循环停不掉了。
   * 但慢速漂移每帧只挪零点几像素，**没必要按 60fps 跑**：
   * 指针一动就回到满帧（跟手），指针一停就降到 30fps（省电、也省掉卡片 backdrop-filter
   * 那层每秒 60 次的重算）。
   */
  pointerDriftFrameMs: 33,
};

/**
 * @param {{
 *   root?: Element,
 *   mode?: string,
 *   config?: Partial<typeof CONFIG>
 * }} [options]
 */
export function createLightfield(options = {}) {
  const config = { ...CONFIG, ...(options.config || {}) };
  const root = options.root || document.querySelector('.lightfield');

  const handle = {
    mode: MODE.OFF,
    level: 3,
    running: false,
    reason: '',
    orientation: 'unsupported',
    setEnabled() {},
    setMode() {},
    enable() {},
    degrade() {},
    enableOrientation: async () => false,
    needsOrientationPermission: () => false,
    stats: () => ({
      mode: handle.mode,
      level: handle.level,
      running: handle.running,
      reason: handle.reason,
      orientation: handle.orientation,
    }),
  };

  if (!root) {
    handle.reason = 'no-root';
    return handle;
  }

  const layers = Array.from(root.querySelectorAll('.lightfield__layer'));

  if (layers.length === 0) {
    handle.reason = 'no-layers';
    return handle;
  }

  // ---------- 设备能力探测 ----------

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;

  /**
   * 选模式。桌面优先指针；触摸设备走漂移（授权陀螺仪后自动升级为 sensor）。
   * 显式传入 mode 时不探测（给预览控件与自动化测试用）。
   */
  const detectMode = () => {
    if (finePointer && !coarsePointer) {
      return MODE.POINTER;
    }

    return MODE.DRIFT;
  };

  handle.mode = options.mode || detectMode();

  /**
   * 显式锁定的层数（?lflevel=1|2|3）。传了它就不再自动降级 ——
   * 用来对照「设计上本来该是什么样」，也给自动化截图用
   * （headless 的 rAF 帧率天然偏低，不锁层数永远截不到三层光）。
   */
  const forcedLevel = Number.isInteger(options.level)
    ? Math.max(0, Math.min(layers.length, /** @type {number} */ (options.level)))
    : null;

  if (forcedLevel !== null) {
    handle.level = forcedLevel;
  }

  // ---------- 状态 ----------

  const state = layers.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));

  let pointerX = 0;
  let pointerY = 0;

  let driftX = 0;
  let driftY = 0;

  let tiltX = 0;
  let tiltY = 0;
  let tiltRawX = 0;
  let tiltRawY = 0;

  let rafId = 0;
  let visible = true;
  let lastFrameAt = 0;
  let orientationBound = false;

  /*
   * 阻尼后的「光场焦点」，只用来给点阵当面具（见 computeTargets 末尾）。
   * 用阻尼值而不是原始焦点：否则快速移动指针时，点阵会先亮、光才追上来。
   * `focusSnapped` 让第一帧直接就位 —— 否则首帧点阵的面具会从左上角飞过来。
   */
  let focusX = 0;
  let focusY = 0;
  let focusSnapped = false;

  /** 上一次真正写出去的面具位置（百分比）—— 量化用，见 computeTargets 末尾 */
  let lastFocusPctX = -999;
  let lastFocusPctY = -999;

  /** 指针最后一次动的时刻，用来判断「现在只剩漂移在动」 */
  let lastPointerAt = 0;

  /**
   * 开场动画的状态机。
   *   phase: 'off' 不做 | 'toCenter' | 'orbit' | 'toPointer'
   * 走完就置 'off'，之后完全交给「指针 + 漂移」那套。
   */
  const intro = {
    phase: 'off',
    startedAt: 0,
    fromX: 0,
    fromY: 0,
  };

  /** 缓入缓出。转圈和飞行都用它 —— 起止都不突兀，中段最快。 */
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const easeOutCubic = (t) => 1 - (1 - t) ** 3;

  /** 指针还没动过时把焦点放在视口中心 —— 否则首屏的光会全挤在左上角 */
  const measure = () => {
    if (pointerX === 0 && pointerY === 0) {
      pointerX = window.innerWidth / 2;
      pointerY = window.innerHeight / 2;
    }
  };

  // ---------- 三种目标位移 ----------

  /** 自动漂移：两个正弦叠加，得到缓慢而不重复的游走（李萨如曲线） */
  const driftOffset = (now) => {
    const t = now / 1000;
    const d = config.drift;
    const mix = d.mix;
    const rest = 1 - mix;

    return {
      x: Math.sin(t * d.ax * Math.PI * 2) * (rest + mix * 0.5)
        + Math.sin(t * d.bx * Math.PI * 2 + 1.3) * (mix * 0.5),
      y: Math.cos(t * d.ay * Math.PI * 2) * (rest + mix * 0.5)
        + Math.cos(t * d.by * Math.PI * 2 + 0.4) * (mix * 0.5),
    };
  };

  /**
   * 开场动画这一帧的焦点。
   *
   * 三段**首尾相接、全部走确定的数学**，不依赖上一帧的值 —— 每次跑的轨迹都一样，
   * 方便截图对照。唯一读实时输入的是最后一段：它以**当前指针**为终点，
   * 所以用户中途动了鼠标，光会直接朝他那儿收过去，而不是傻等动画走完。
   *
   * 三段的接缝都是连续的：
   *   toCenter 的终点就是中心 → orbit 从 k=0 起（半径 0，也在中心）
   *   orbit 的终点是 k=1（grow = sin(π) = 0，回到中心）→ toPointer 从中心出发
   *
   * @param {number} now
   * @param {number} cx
   * @param {number} cy
   * @returns {{fx: number, fy: number}}
   */
  const introTargets = (now, cx, cy) => {
    const cfg = config.intro;
    const t = now - intro.startedAt;

    if (intro.phase === 'toCenter') {
      if (t >= cfg.toCenterMs) {
        // 落进下一段，同一帧继续往下算 —— 不然会多出一帧的停顿
        intro.phase = 'orbit';
        intro.startedAt = now;
      } else {
        const e = easeInOutCubic(t / cfg.toCenterMs);

        return { fx: intro.fromX + (cx - intro.fromX) * e, fy: intro.fromY + (cy - intro.fromY) * e };
      }
    }

    if (intro.phase === 'orbit') {
      if (t >= cfg.orbitMs) {
        intro.phase = 'toPointer';
        intro.startedAt = now;
      } else {
        const k = t / cfg.orbitMs;
        const r = Math.min(window.innerWidth, window.innerHeight) * cfg.orbitRadius;

        // 从正上方起转一整圈；半径先涨后收 ——
        // 不收的话终点会停在轨道上，下一段就得从旁边拐回中心，多一个折角
        const angle = -Math.PI / 2 + easeInOutCubic(k) * Math.PI * 2;
        const grow = Math.sin(Math.PI * k);

        return { fx: cx + Math.cos(angle) * r * grow, fy: cy + Math.sin(angle) * r * grow };
      }
    }

    // toPointer：从中心收到指针身边。
    // 终点带上漂移量，这样交给「指针 + 漂移」那套时的衔接是无缝的。
    const k = Math.min(1, t / cfg.toPointerMs);

    if (k >= 1) {
      intro.phase = 'off';
    }

    const e = easeOutCubic(k);
    const drift = driftOffset(now);
    const aimX = pointerX + drift.x * cx * config.pointerDriftReach.x;
    const aimY = pointerY + drift.y * cy * config.pointerDriftReach.y;

    return { fx: cx + (aimX - cx) * e, fy: cy + (aimY - cy) * e };
  };

  /**
   * 算出三层的目标位置。
   *
   * 与设计方案同源：先定一个「光场焦点」，再让三层围绕它做镜像分布 ——
   *   a 主光 = 焦点处      b 补光 = 对角镜像      c 冷光 = 垂直镜像
   * 焦点在桌面是真实指针，在触摸设备是缓慢游走的虚拟点，
   * 所以「手机也能感受到光场」和「桌面跟随鼠标」用的是同一套空间语言。
   */
  const computeTargets = (now) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    // 陀螺仪平滑。只有 sensor 模式真的会收到数据，其余情况自动回中
    if (handle.mode === MODE.SENSOR) {
      tiltX += (tiltRawX - tiltX) * config.tilt.damping;
      tiltY += (tiltRawY - tiltY) * config.tilt.damping;
    } else {
      tiltX += (0 - tiltX) * 0.1;
      tiltY += (0 - tiltY) * 0.1;
    }

    let fx;
    let fy;

    const drift = driftOffset(now);

    if (intro.phase !== 'off') {
      // 开场动画接管焦点（三段见 introTargets）。这期间不叠陀螺仪偏移 —— 轨道要干净。
      const aim = introTargets(now, cx, cy);

      fx = aim.fx;
      fy = aim.fy;
    } else if (handle.mode === MODE.POINTER) {
      /*
       * 桌面端 = 指针 + 一层缓慢漂移。
       * 两层都以「视口半宽/半高」为单位，所以换屏幕尺寸不用重调。
       */
      driftX = drift.x;
      driftY = drift.y;
      fx = pointerX + driftX * cx * config.pointerDriftReach.x;
      fy = pointerY + driftY * cy * config.pointerDriftReach.y;
    } else {
      // 触摸设备：焦点缓慢游走（约 22 秒一轮），不依赖任何输入
      driftX = drift.x;
      driftY = drift.y;
      fx = cx + driftX * cx * config.driftReach.x;
      fy = cy + driftY * cy * config.driftReach.y;
    }

    // 重力感应把焦点整体推开一点：三层同向偏移 = 「转头看」的体感
    if (intro.phase === 'off') {
      fx += tiltX * cx * config.tiltReach;
      fy += tiltY * cy * config.tiltReach;
    }

    /*
     * 把阻尼后的焦点写出去，给点阵的 `mask` 用（`--lf-fx/--lf-fy`，百分比）。
     *
     * 为什么要给点阵一个面具：用户要的是「光场照到的地方点阵接近半透明、
     * 越远越淡甚至消失」。点阵本身是一张静态的重复图案，
     * 靠 `mix-blend-mode: overlay` 只能做到「有光的地方更亮一点」，
     * 做不到「暗处完全消失」。加一层跟着光走的面具才是那个意思。
     */
    const damp = intro.phase !== 'off' || !focusSnapped ? 1 : config.damping[2];

    focusX += (fx - focusX) * damp;
    focusY += (fy - focusY) * damp;
    focusSnapped = true;

    const pctX = (focusX / w) * 100;
    const pctY = (focusY / h) * 100;

    /*
     * ⚠️ 只在**看得出变化**时才写这两个变量。
     *    点阵的面具依赖它们 —— 每写一次，浏览器就要重算一遍全屏的面具纹理。
     *    0.25% 在 2560 宽上约 6px（比 8px 的点距还小），肉眼看不出来；
     *    而慢速漂移每帧只挪零点几像素，量化之后大部分帧根本不用重算。
     */
    if (Math.abs(pctX - lastFocusPctX) >= 0.25 || Math.abs(pctY - lastFocusPctY) >= 0.25) {
      lastFocusPctX = pctX;
      lastFocusPctY = pctY;
      root.style.setProperty('--lf-fx', pctX.toFixed(2) + '%');
      root.style.setProperty('--lf-fy', pctY.toFixed(2) + '%');
    }

    // 焦点相对视口中心的归一化偏移（-1 ~ 1）
    const nx = (fx - cx) / Math.max(1, cx);
    const ny = (fy - cy) / Math.max(1, cy);

    for (let i = 0; i < layers.length; i++) {
      const place = config.placement[i] || { fx: 1, fy: 1 };

      state[i].tx = cx + nx * cx * place.fx;
      state[i].ty = cy + ny * cy * place.fy;
    }
  };

  const activeLayers = () => handle.level;

  /** @param {boolean} [snap] 直接就位（首帧、换模式时用），免得光从左上角飞进来 */
  const draw = (snap = false) => {
    // 开场动画期间把阻尼放大 —— 否则 a 层的 0.05 会把那一圈转抹平（理由见 CONFIG）
    const boost = intro.phase === 'off' ? 1 : config.introDampingBoost;

    for (let i = 0; i < activeLayers(); i++) {
      const s = state[i];
      const damping = snap ? 1 : Math.min(1, (config.damping[i] || 0.1) * boost);

      s.x += (s.tx - s.x) * damping;
      s.y += (s.ty - s.y) * damping;

      // 只写 transform。translate3d 触发合成层，不引起重排。
      layers[i].style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
    }
  };

  /**
   * 每帧要等多久才真正算一次 —— 也就是「这一次有没有必要重算」。
   *
   * ⚠️ 这里以前是 `settled()`：指针模式跟上指针就**停掉整个循环**。
   *    现在桌面端也叠了漂移（见 config.pointerDriftReach），光永远在动，停不掉了。
   *    代价改用**降帧**换：指针停着时按 30fps 跑（慢速漂移每帧只挪零点几像素，
   *    看不出区别），指针一动立刻回到满帧（跟手不能打折）。
   *    顺带省掉了卡片 `backdrop-filter` 每秒 60 次的重算。
   */
  const frameBudget = (now) => {
    // 开场动画要满帧 —— 30fps 转出来的圈是一顿一顿的
    if (intro.phase !== 'off') {
      return 0;
    }

    if (handle.mode !== MODE.POINTER) {
      return config.driftFrameMs;
    }

    return now - lastPointerAt > config.idleAfterMs ? config.pointerDriftFrameMs : 0;
  };

  const loop = (now) => {
    if (!visible || handle.level === 0) {
      handle.running = false;
      return;
    }

    if (now - lastFrameAt < frameBudget(now)) {
      rafId = requestAnimationFrame(loop);
      return;
    }

    lastFrameAt = now;

    computeTargets(now);
    draw();

    rafId = requestAnimationFrame(loop);
  };

  const wake = () => {
    if (handle.level === 0 || !visible || handle.running) {
      return;
    }

    handle.running = true;
    rafId = requestAnimationFrame(loop);
  };

  const disable = (reason) => {
    handle.level = 0;
    handle.running = false;
    handle.reason = reason;
    handle.mode = MODE.OFF;
    root.classList.add('is-off');
    root.dataset.mode = MODE.OFF;
    // dataset 必须同步 —— 早先漏了这两行，排障时看到的是
    // 「level=1 但 className 已经是 is-off」，两个信息互相矛盾，白查半天
    root.dataset.level = '0';
    cancelAnimationFrame(rafId);
  };

  // ---------- 陀螺仪 ----------

  const hasOrientationApi = typeof window.DeviceOrientationEvent !== 'undefined';

  /** iOS 13+ 需要用户手势申请权限；其它平台直接可监听 */
  const needsOrientationPermission = () => {
    if (!hasOrientationApi) {
      return false;
    }

    const ctor = /** @type {any} */ (window.DeviceOrientationEvent);

    return typeof ctor.requestPermission === 'function';
  };

  handle.needsOrientationPermission = needsOrientationPermission;

  const onOrientation = (event) => {
    if (event.gamma === null || event.beta === null) {
      return;
    }

    const t = config.tilt;

    tiltRawX = Math.max(-1, Math.min(1, event.gamma / t.gammaRange));
    tiltRawY = Math.max(-1, Math.min(1, (event.beta - t.betaNeutral) / t.betaRange));
  };

  const bindOrientation = () => {
    if (orientationBound || !hasOrientationApi) {
      return false;
    }

    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    orientationBound = true;
    handle.orientation = 'listening';

    // 授权后从纯漂移升级为「漂移 + 重力感应」
    if (handle.mode === MODE.DRIFT) {
      handle.setMode(MODE.SENSOR);
    }

    return true;
  };

  handle.enableOrientation = async () => {
    if (!hasOrientationApi) {
      handle.orientation = 'unsupported';

      return false;
    }

    if (!needsOrientationPermission()) {
      return bindOrientation();
    }

    try {
      const ctor = /** @type {any} */ (window.DeviceOrientationEvent);
      const result = await ctor.requestPermission();

      handle.orientation = result === 'granted' ? 'granted' : 'denied';

      if (result !== 'granted') {
        return false;
      }

      return bindOrientation();
    } catch (error) {
      // 用户拒绝、或不是在用户手势里调用 —— 都只是退回纯漂移模式，不影响页面
      handle.orientation = 'denied';

      return false;
    }
  };

  // ---------- 事件 ----------

  const onPointerMove = (event) => {
    if (handle.mode !== MODE.POINTER) {
      return;
    }

    pointerX = event.clientX;
    pointerY = event.clientY;
    // 记下来给 frameBudget 用：刚动过就满帧，停久了才降到 30fps
    lastPointerAt = performance.now();
    wake();
  };

  const onResize = () => {
    measure();
    wake();
  };

  const onVisibility = () => {
    visible = document.visibilityState === 'visible';

    if (visible) {
      lastFrameAt = 0;
      wake();
    } else {
      cancelAnimationFrame(rafId);
      handle.running = false;
    }
  };

  // ---------- 对外接口 ----------

  handle.degrade = () => {
    // 已经只剩一层就到底了。**不再继续把光场关掉** ——
    // 光场是背景装饰，「少一层」可以接受，「整个消失」不行。
    if (handle.level <= 1) {
      return handle.level;
    }

    handle.level -= 1;
    handle.reason = `degraded-to-${handle.level}`;
    root.dataset.level = String(handle.level);
    layers[handle.level].style.transform = 'translate3d(0,0,0)';

    return handle.level;
  };

  handle.setMode = (next) => {
    if (!Object.values(MODE).includes(next)) {
      return false;
    }

    handle.mode = next;
    root.dataset.mode = next;
    handle.reason = '';
    root.classList.remove('is-off');

    if (next === MODE.OFF) {
      disable('manual');

      return true;
    }

    if (handle.level === 0) {
      handle.level = cores <= 4 ? 1 : Math.min(2, layers.length);
      root.dataset.level = String(handle.level);
    }

    lastFrameAt = 0;
    measure();
    // 直接就位，不要从上一个模式的位置滑过去
    computeTargets(performance.now());
    draw(true);
    wake();

    return true;
  };

  handle.enable = () => handle.setMode(options.mode || detectMode());

  handle.setEnabled = (on) => (on ? handle.enable() : disable('manual'));

  // ---------- 启动 ----------

  if (reduced) {
    disable('prefers-reduced-motion');
    return handle;
  }

  // 触摸设备不值得为装饰跑三层。显式锁定层数时不做这个干预。
  if (forcedLevel === null && (cores <= 4 || coarsePointer)) {
    handle.level = Math.min(handle.level, 1);
    handle.reason = cores <= 4 ? 'low-core' : 'touch-device';
  }

  if (!hasOrientationApi) {
    handle.orientation = 'unsupported';
  }

  measure();
  root.dataset.mode = handle.mode;
  root.dataset.level = String(handle.level);

  if (handle.level === 0) {
    disable('initial-degrade');
    return handle;
  }

  // 首帧直接就位。这里刻意**不再按耗时降级** ——
  // 首帧包含 JIT 预热与样式计算，测出来的数字不代表日常渲染成本，
  /**
   * 起开场动画：起点取上一页留下的焦点。
   *
   * ⚠️ 必须在**第一次 draw 之前**把 focusX/focusY 摆到那个位置 ——
   *    否则首帧会先从默认位置（视口中心）起手，再「飞」到上一页的位置，方向上正好反了。
   */
  const startIntro = () => {
    // 减动画偏好、或 ?lfintro=0 时不演
    if (options.intro === false || reduced) {
      return;
    }

    let saved = '';

    try {
      saved = sessionStorage.getItem(config.intro.startKey) || '';
    } catch (error) {
      /* 隐私模式读不到 —— 那就从中心起转 */
    }

    const [sx, sy] = saved.split(',').map(Number);
    const usable = Number.isFinite(sx) && Number.isFinite(sy) && (sx !== 0 || sy !== 0);

    // 第一次访问没有上一页 —— 起点就是中心，第一段自然消失，几乎是直接开始转圈
    intro.fromX = usable ? sx : window.innerWidth / 2;
    intro.fromY = usable ? sy : window.innerHeight / 2;

    focusX = intro.fromX;
    focusY = intro.fromY;
    focusSnapped = true;

    intro.phase = 'toCenter';
    intro.startedAt = performance.now();
  };

  startIntro();

  // 拿它做降级决策会误伤（理由见 CONFIG 顶部那段）。
  computeTargets(performance.now());
  draw(true);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  /*
   * 离开这一页时把焦点留下 —— 下一页的开场就从这儿起步（用户要的「起点保留上一页的位置状态」）。
   * 挂 `pagehide`：它是唯一在「跳去别的页」和「刷新」两种情况下都会响的钩子。
   * 存**阻尼后的焦点**（真正在屏幕上的那个），不是指针坐标。
   */
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(config.intro.startKey, `${Math.round(focusX)},${Math.round(focusY)}`);
    } catch (error) {
      /* 写不了就算了，下一页从中心起转 */
    }
  });

  // 非 iOS 平台不需要用户手势，直接挂上重力感应
  if (hasOrientationApi && !needsOrientationPermission() && coarsePointer) {
    bindOrientation();
  }

  wake();

  return handle;
}

export default createLightfield;
