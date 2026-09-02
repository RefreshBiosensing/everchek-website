# EverChek 网站重建 — 进度记录

> 断点续传用。每完成一步就更新这个文件。
> 最后更新：2026-09-03

## 目标（业主 2026-09-03 确认）

1. **修复并改版现有英文站** —— 审计出的 114 条问题要修；设计要重做
2. **多语言** —— 第一批：法语（全站）
3. **内容后台** —— 可视化编辑，不用改代码

## 已定的技术决策

| 项 | 决定 | 理由 |
|---|---|---|
| 架构 | **Astro 5 静态生成** | 沿用自家 p20-website 的成熟体系，团队已会用 |
| 内容模型 | **区块化 YAML**：`content/pages/<locale>/*.yaml` | 一页 = 一个有序 `sections` 列表，23 种区块可拖拽增删 |
| 后台 | **Sveltia CMS**（`/admin`） | 基于 Git、免费、无服务器、多语言支持最好 |
| 路由 | 单一动态路由 `src/pages/[...slug].astro` | 所有页面共用，locale 由文件夹决定 |
| 多语言 | 每页自带 `path` + `translationKey` | 支持各语言独立 slug；`translationKey` 驱动 hreflang |
| 部署 | Cloudflare Pages | ⚠️ 见下方「待业主操作」 |
| 参考实现 | `/Users/yanhuarong/Desktop/体温计p20/p20-website` | 同体系姊妹站 |

## 仓库状态

- 仓库：`https://github.com/RefreshBiosensing/everchek-website`
- 本地：`/Users/yanhuarong/Desktop/everchek/repo-everchek`
- 分支：**`astro-rebuild`**（`main` 未动，线上不受影响）
- 脚手架工作副本：`/Users/yanhuarong/Desktop/everchek/everchek-website`（内容已同步进仓库）

## 已完成

- [x] 全站镜像抓取（20 页 + 全部图片 + site.css/js/nav/footer/blog-data.json），51MB
- [x] 克隆真仓库，建 `astro-rebuild` 分支
- [x] 目录重构：图片 → `public/images/`、博客图 → `public/blog/`、`_headers` 与 `.well-known` → `public/`（用 `git mv` 保留历史）
- [x] 从 p20-website 移植 Astro 代码骨架（src/scripts/config），`package.json` 改名 `everchek-website`
- [x] **20 个页面全部转成区块模型 YAML**，21 个文件全部解析通过，0 失败
- [x] `content/i18n/en.yaml` UI 字典转为 EverChek（导航新增 Resources 下拉、页脚新增 Guides 栏 —— 修掉「6 个指南页零导航入链」）
- [x] 修 i18n 两处：`nav.solutions.root` 从占位 `/cgm-` 改为真实页；SLA 文案全站统一为 "one China business day (Mon–Fri, UTC+8)"
- [x] **新色板落地** `src/styles/global.css` —— 旧品牌蓝 `#80BCE2`（白底 2.06:1）降级为纯装饰色，主色改 `#0B5FA5`（6.57:1）
- [x] `VisualPhone.astro` 血糖曲线改用新主色（原浅蓝 2px 描边过淡）

## 进行中 / 卡住

- [ ] **`npm install` 装不上** —— `registry.npmjs.org` 连接被重置（ECONNRESET，拉 `@capsizecss/unpack` tarball 时 socket hang up）。已清过 npm 缓存、加过重试参数，仍失败。**下一步：改用国内镜像 `--registry=https://registry.npmmirror.com`**
- [ ] 首次构建验证（`npm run build`）
- [ ] 删除旧的扁平 HTML 文件（`git rm *.html site.css site.js nav.html footer.html blog-data.json`）——**等构建验证通过再删**

## 待做

- [ ] 构建通过后逐页视觉走查，对照旧站确认无内容丢失
- [ ] 图片优化：`public/` 现在 39MB，首页原本 5.16MB。转 WebP + 尺寸压缩（单张 `08-manufacturer-selection.jpg` 7.5MB，博客封面每张 1.3–1.75MB，logo 是 8697×2029px 渲染成 137×32）
- [ ] `robots.txt` 重写（放行 AI 爬虫）+ `llms.txt`
- [ ] 真 404 页（旧站任何不存在的 URL 都返回 200 + 首页）
- [ ] `_redirects`：旧 `.html` URL → 新无扩展名 URL 的 301；`/blog/cgm-skd-b2b-guide` 是重复文章需 301 合并
- [ ] `.well-known/agent-skills/index.json` 里的 URL 还是 `.html` 形式（会 308），要更新
- [ ] GA4 埋点 + 表单归因字段（`source_page`/`referrer`/`landing_page`/`utm`）
- [ ] 询盘表单：国家下拉换完整 ISO 列表；`/request-nda` 页
- [ ] `accuracyClaim` 字段要加进 `scripts/build-cms-config.mjs` 的 `pagesCollection()`，否则 Sveltia 存盘会丢（见下方「已知问题」）
- [ ] 法语版：`content/pages/fr/` + `content/i18n/fr.yaml` + astro.config 的 `locales` 加 `fr`
- [ ] Sveltia CMS 配置加法语 collection
- [ ] Sveltia CMS 的 `<script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js">` 没有锁版本，建议锁定

## 已知问题 / 需要业主拍板

1. **`accuracyClaim` 不是 CMS 字段** —— 我按转换规则把它放在 `home.yaml` 顶层，但 Sveltia 不会显示它，存盘可能丢失。要么加进 CMS schema，要么改放别处。
2. **MARD 声明 A/B 未决** —— 当前按 B 实施（撤下裸数字，改成方法与协议文案）。翻盘只需改 `home.yaml` 的 `accuracyClaim` 一个字段。
3. **`[TODO: ...]` 占位符** —— 全站 grep `TODO:` 可列出。主要是：IP 等级（站上 IPX8 与 IP28 并存）、灭菌方式（两种说法）、CE 状态（五页互相矛盾）、认证机构名称与 scope、RF 型式认证。这些必须业主给答案，我不能编。
4. **`/blog/cgm-skd-b2b-guide`** —— 仓库里有第 4 篇文章，线上可访问但不在 sitemap、不在 `blog-data.json`、无任何入链。内容与 `what-is-cgm-skd` 高度重合，建议 301 合并。

## ⚠️ 待业主操作（我做不了）

**Cloudflare Pages 构建设置必须改**，否则合并后线上会挂：

| 设置项 | 现在 | 改成 |
|---|---|---|
| Build command | （空） | `npm run build` |
| Build output directory | `/`（仓库根） | `dist` |
| Node version | — | 建议设 `NODE_VERSION=20` 或更高 |

**建议流程**：先在 Cloudflare Pages 给 `astro-rebuild` 分支开一个 preview 部署，确认无误再合 `main`。
