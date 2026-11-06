# DSH Balance Money

DeepSeek Harness 极简余额提醒插件。在输入框下方原有统计栏的最后，显示余额、今日消费和峰谷倒计时。

> 余额 ¥5.48　今日 ¥1.40　谷 61h34m

与原有统计栏使用相同的字体和主题色，三项共用一个悬停背景，点击整组刷新。

## 安装

当前为早期预览版本，已在 macOS **DeepSeek Harness 0.2.1-rc.5** 验证。

1. 在 [Releases](https://github.com/aoe1124/dsh-balance-money/releases) 下载 `dsh-balance-money-0.1.5.tgz`。
2. 在 DSH 的「插件 → 添加插件 → 安装第三方插件」中选择本地安装包；如果界面不提供文件选择，可使用下面的官方命令。
3. 安装后在插件页刷新。更新旧版本后若仍显示旧界面，正常重启 DSH 一次。

```sh
dsh plugin --profile desktop add /你的下载目录/dsh-balance-money-0.1.5.tgz
```

macOS 桌面版如果没有 PATH 中的 `dsh`，使用安装包自带的官方 CLI：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" plugin --profile desktop add "$HOME/Downloads/dsh-balance-money-0.1.5.tgz"
```

也可将此仓库链接或下载的安装包交给 DSH，要求它按标准插件流程安装。

## 使用

- **余额**：包含充值余额及可用赠金；相同币种合计，优先 CNY，其次 USD。
- **今日**：北京时间当天首次成功采样后，累计观察到的余额下降额。充值不会抵扣此前累计消费。
- **峰／谷**：当前价格时段和距下次切换的小时、分钟，支持超过 24 小时。

余额约每五分钟刷新，点击整组可手动刷新；悬停查看更新时间和统计说明。凭据复用 DSH 官方账号或 API Key 服务，无需把密钥填入插件。

关闭插件后整组信息隐藏。重新启用后恢复显示。新会话首页的欢迎输入框不显示统计，进入对话后显示。

## 统计说明

“今日”是近似提醒数据，**不是官方账单**。首次安装从 0 开始，不继承其他插件的累计；无法补齐首次采样前的消费。采样间隔内充值与消费相抵可能漏计，赠金到期也可能表现为余额下降。

按账户来源、身份摘要和币种分别保存当天状态。重启后继续累计，跨北京时间自然日重建基线。数据保存在 DSH 数据目录的 `balance-money/balance.json` 中，不保存原始账户 id、API Key 或登录令牌。

普通刷新失败保留上次余额并标记 `*`，没有成功数据时显示 `—`。停用插件则隐藏整组信息。

## 峰谷日历

规则来自 [DeepSeek 官方定价页](https://api-docs.deepseek.com/quick_start/pricing/)：北京时间周一至周五 09:00–12:00、14:00–18:00 为峰时，其余时间为谷时，中国法定节假日全天谷时，调休周末仍按周末处理。

内置节假日数据覆盖 **2026–2027 年**。超出覆盖范围会提示更新，不推测假日安排。官方规则发生变化时，需要更新插件。

## 卸载

在 DSH 插件管理中卸载，或运行：

```sh
dsh plugin --profile desktop remove dsh-balance-money
```

本地累计文件会保留，便于重新安装后恢复。

## 从源码构建

需要 Node.js 22+：

```sh
npm ci
npm run build
npm test
npm pack
```

仓库包含已构建的 `lib/client.js`。修改客户端后请重新构建。公开安装优先使用 Release 附带的 `.tgz`，GitHub 自动生成的源码 ZIP 不是插件安装包。

## 兼容性与反馈

已验证 macOS DSH 0.2.1-rc.5 的安装、真实账号余额、点击刷新、重启恢复及开关行为。API Key 路径、跨天和充值等边界通过自动测试验证；其他平台和宿主版本尚未逐一实测。

遇到问题可在 [Issues](https://github.com/aoe1124/dsh-balance-money/issues) 提交 DSH 版本、插件版本与复现步骤。不要上传密钥、令牌或私人配置文件。

## 许可

[MIT](LICENSE)。统计栏样式参考 DeepSeek Harness 的 MIT 源码，保留 DeepSeek 版权声明。本项目为社区插件，与 DeepSeek 官方无隶属关系。
