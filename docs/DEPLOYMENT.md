# 部署与维护

## 首次发布

1. 确认 PR 中的 Check 成功。
2. Settings → Pages → Source 选择 GitHub Actions。
3. 将开发分支合入 main，等待 Deploy GitHub Pages 成功。
4. Actions 中部署任务提供实际站点地址；以任务输出为准。
5. 打开网站检查手机布局、搜索与收藏，再手动运行一次 Sync upstream content。

Vite base 配置为 `/better-life-guide/`，匹配当前仓库名称。更名或使用自定义域名时，需修改 `vite.config.ts`；自定义域名通常使用 `/`。

## 工作流

| 工作流 | 触发 | 作用 |
|---|---|---|
| Check | PR、main/feat/reader push | 安装锁定依赖、解析测试、类型检查和构建 |
| Sync upstream content | 每日 UTC 22:00、手动 | 同步上游、验证后提交快照并部署 |
| Deploy GitHub Pages | main push、手动 | 验证并发布当前快照 |

同步提交使用 GitHub 自动提供的 token，无需个人访问令牌。同步提交需要 contents write，部署仅使用 pages write 和 id-token write。依赖锁文件确保 `npm ci` 可重复安装。

## 日常维护

正文更新无需每天手动操作。关注失败的 Actions：Markdown 格式、标签或许可证变化时，需要人工核对并调整脚本。公开仓库长时间无活动时，GitHub 可能停用定时工作流；若没有继续同步，先检查工作流是否启用。定时任务不是精确时间保证。

上游改变成本含义或证据规则时需核对 UI 文案。页面字段来自解析契约，不能假设上游格式永不变。不要仅因为构建成功就认为医学或法律内容已被本项目重新核实。

## 冲突与回退

同步提交 push 遇到主分支新提交会正常失败，不强推；下次同步或手动重跑即可。部署失败不会替换已经成功部署的站点。需要回退时通过 Git 回退对应代码/数据提交，再构建发布。浏览器收藏另存于用户设备，不随 Git 回退。

## 本地同步到指定快照

```bash
UPSTREAM_DIR=/绝对路径/HowToLiveBetter npm run sync
```

指定目录时不会自动拉取或重置该目录，按该目录当前 Git 提交生成，适合复现或核对。默认 `.upstream/` 是可重建的临时克隆，同步会 fetch 并 reset，因此不要在里面修改文件。
