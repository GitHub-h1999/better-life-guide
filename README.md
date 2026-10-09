# 好好生活 · Better Life Guide

《高性价比人生指南》的现代阅读站。自动同步原书，适配手机与桌面，支持全文搜索、证据筛选、收藏、阅读进度、条目链接与深浅主题。

内容来源：[eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)。本项目负责阅读界面与同步工具，不是原书作者，也不重新审定原文建议。正文按原书许可证 CC BY 4.0 使用，调整了展示形式，保留来源、成本、数据与备注。

## 本地运行

需要 Node.js 24 和 Git。

```bash
npm ci
npm run dev
```

打开终端提示的地址，路径为 `/better-life-guide/`。仓库已包含生成的内容快照，本地运行不必先同步，也不需要数据库、服务器账号或 API Key。

```bash
npm run sync   # 从原书拉取最新正文
npm test       # 检查解析行为
npm run build  # TypeScript 检查并生成 dist/
npm run preview
```

## 阅读外观

当前默认采用「留白 / Paper」：暖白纸面、深灰正文、少量蓝色强调。点击右上角阅读外观图标，可查看当前风格并切换浅色/深色。风格令牌独立存放，后续按套加入其他风格；目前只提供留白。详见 [设计说明](docs/DESIGN.md)。

## 第一版功能

- 34 章的章节导航与主题快捷入口；章节和条目统计从实际数据计算。
- 全文关键词搜索，可组合 A 级证据、不花钱筛选。
- 默认显示简明结论和完整备注；成本、研究数据与来源按需展开。
- 收藏、阅读位置和主题保存在浏览器本地；编号调整不影响基于标题识别的收藏。
- 条目链接可以复制和直接打开；无剪贴板权限时提供地址栏回退。
- 移动端抽屉目录、底部导航、安全区适配；尊重减少动态效果设置。
- Markdown 展示经过 DOMPurify 净化；网页运行期间不向 GitHub 请求内容。

收藏和进度不跨设备同步，清除网站数据会丢失。本版未实现 PWA 离线缓存和账号体系。标题与正文同时大幅变化时，不能保证自动识别原收藏，未匹配记录会保留并提示。

## 自动更新与发布

合入主分支后，`Sync upstream content` 每天北京时间 06:00 **计划**启动，也可在 Actions 手动运行。实际启动时间可能延后。同步、校验、测试和构建全部成功后，才提交数据并部署；解析异常时停止，保留上一次成功的网站。

首次启用：仓库 **Settings → Pages → Source → GitHub Actions**。确认 Actions 可以运行。部署工作流会使用 `github-pages` 环境；如果设置了审批或分支限制，需要允许 `main`。

GitHub 自动提交不会再次触发普通 push 工作流，因此同步工作流包含自己的部署步骤。普通主分支改动由 `Deploy GitHub Pages` 部署。

## 文档

- [架构与同步机制](docs/ARCHITECTURE.md)
- [部署与维护](docs/DEPLOYMENT.md)
- [界面设计与移动端规则](docs/DESIGN.md)
- [验证记录与已知限制](docs/VALIDATION.md)
- [正文原始许可证](docs/CONTENT-LICENSE.txt)

## 分支流程

`main` 是发布分支；第一版在 `feat/reader` 开发。通过 PR 展示最终改动，自动检查通过后合入。不要直接修改 `src/data/content.json` 中的正文，应修改上游或同步脚本后重新生成。

## 授权

本项目新增代码采用 [MIT](LICENSE)。原书正文和对应许可证单独采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)，不属于 MIT 授权范围。转载应标明原书作者/项目、原文链接、许可证和展示形式调整。
