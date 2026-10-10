# NGA 摸鱼优化

将 NGA 分区话题列表页与话题页伪装成 Claude Code CLI 界面，让摸鱼更隐蔽。

## ✨ 主要功能

- 🎨 **伪装界面**：将 NGA 页面伪装成 Claude Code CLI 终端风格
- 🖼️ **图片预览**：鼠标悬停显示图片，点击切换缩放档位（支持自定义）
- 🎬 **视频预览**：鼠标悬停显示封面，点击直接播放（支持自定义缩放比例）
- 🚫 **广告拦截**：自动跳过 NGA 翻页广告，零延迟
- 👁️ **只看楼主**：快速过滤帖子，只显示楼主回复
- 📍 **固定输入框**：可选固定底部输入框，刷新生效
- ⌨️ **键盘导航**：支持 vim 风格快捷键（j/k 选择，Enter 打开）

## 📦 安装

### 前置要求

1. 安装浏览器扩展：[Tampermonkey](https://www.tampermonkey.net/) 或 [Violentmonkey](https://violentmonkey.github.io/)
2. 选择以下任一方式安装脚本：

### 方式一：一键安装（推荐）

点击下方链接，Tampermonkey 会自动提示安装：

**[📥 点击安装 NGA 摸鱼优化](https://raw.githubusercontent.com/xiaoqingming18/nga-fish/main/nga-fish.user.js)**

### 方式二：手动安装

1. 打开 [脚本源码页面](https://github.com/xiaoqingming18/nga-fish/blob/main/nga-fish.user.js)
2. 点击右上角 `Raw` 按钮
3. Tampermonkey 会自动识别并提示安装

### 方式三：从源码安装

1. 复制 [nga-fish.user.js](./nga-fish.user.js) 的全部内容
2. 打开 Tampermonkey 管理面板
3. 点击 `+` 创建新脚本
4. 粘贴代码并保存

## 🔄 自动更新

脚本已配置自动更新功能：

- **自动检查**：Tampermonkey 默认每 24 小时自动检查更新
- **手动更新**：打开 Tampermonkey 面板 → 找到脚本 → 点击「检查更新」
- **更新源**：`https://raw.githubusercontent.com/xiaoqingming18/nga-fish/main/nga-fish.user.js`

> 💡 **提示**：更新后可能有 5 分钟左右的 CDN 缓存延迟

## ⚙️ 配置选项

脚本提供了丰富的菜单配置（点击 Tampermonkey 图标 → NGA 摸鱼优化）：

| 功能 | 说明 |
|------|------|
| **开启/关闭摸鱼模式** | 一键切换伪装效果，刷新生效 |
| **自定义图片缩放档位** | 配置三档缩放比例（默认 30%、50%、85%） |
| **自定义视频预览设置** | 配置封面/播放缩放比例、是否静音 |
| **固定底部输入框** | 让输入框固定在底部，方便操作 |

## ⌨️ 快捷键

### 列表页

| 快捷键 | 功能 |
|--------|------|
| `j` / `k` | 上下选择话题 |
| `Enter` | 打开选中的话题 |
| `o` | 在新标签页打开话题 |
| `n` / `→` | 下一页 |
| `p` / `←` | 上一页 |
| `g` / `G` | 跳转到顶部/底部 |
| `/` | 输入命令 |
| `!` | Bash 模式 |
| `?` | 显示/隐藏快捷键 |
| `i` | 聚焦输入框 |

### 话题页

| 快捷键 | 功能 |
|--------|------|
| `j` / `k` | 上下切换楼层 |
| `u` | 返回列表 |
| `n` / `→` | 下一页 |
| `p` / `←` | 上一页 |
| `/oa` | 只看楼主 / 显示全部 |
| 其他 | 同列表页 |

## 🎨 图片/视频预览操作

- **图片**：
  - 鼠标移入 `[image]` 显示预览
  - 单击切换缩放档位（小 → 中 → 大）
  - `Ctrl/Cmd + 单击` 在新标签页打开原图
- **视频**：
  - 鼠标移入 `[video]` 显示封面
  - 单击直接播放视频
  - `Ctrl/Cmd + 单击` 在新标签页打开视频

## 🛠️ 常见问题

**Q：如何临时关闭脚本？**  
A：在 Tampermonkey 菜单中选择「关闭摸鱼模式」，或直接在扩展中禁用脚本。

**Q：如何查看原始 NGA 页面？**  
A：按 `Esc` 聚焦输入框后，输入 `/exit` 并回车（仅本次生效，刷新后恢复伪装）。

**Q：图片/视频缩放档位如何调整？**  
A：点击 Tampermonkey 图标，选择对应的「自定义」菜单项，按提示输入新的比例。

**Q：为什么更新不及时？**  
A：GitHub Raw URL 有约 5 分钟的 CDN 缓存，耐心等待或手动重装脚本。

**Q：脚本在哪些 NGA 域名生效？**  
A：支持所有官方域名：`bbs.nga.cn`、`ngabbs.com`、`nga.178.com`、`g.nga.cn`

## 📜 更新日志

### v0.10.0 (当前版本)
- 新增固定底部输入框功能
- 修复只看楼主功能
- 新增翻页广告自动拦截
- 新增视频预览功能
- 支持自定义图片缩放档位

更多历史版本见 [Commits](https://github.com/xiaoqingming18/nga-fish/commits/main)

## 📄 开源协议

MIT License

## 🤝 反馈与贡献

- **问题反馈**：[提交 Issue](https://github.com/xiaoqingming18/nga-fish/issues)
- **功能建议**：欢迎在 Issues 中讨论
- **代码贡献**：欢迎提交 Pull Request

---

**享受无干扰的摸鱼时光！** 🐟
