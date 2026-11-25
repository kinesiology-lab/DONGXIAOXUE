# 《动小学》人体运动学虚拟实验室

部署后，全班共用同一个 HTTPS 首页。学生选择“学生入口”，教师在同一页选择“教师入口”。学习记录写入同一教学服务的 SQLite 数据库。教师登录后可查看成绩、病例完成情况、对话及问题反馈，导出 Excel。累计人数按学号去重，个人明细保留历次学习。学生身份由本人填写，请使用自己的固定学号。

## 在服务器运行

1. 准备可从班级设备访问的 Linux 主机、HTTPS 域名和持久磁盘，安装 Python 3.12 与 Caddy。将本仓库放在 `/opt/dongxue`。
2. 创建 `/etc/dongxue.env`，填写 `LAB_ORIGIN=https://实际教学域名`。将 `deploy/Caddyfile.example` 中的示例域名换成同一域名，将此站点配置加入 Caddy。
3. 将 `deploy/dongxue.service` 安装为 systemd 服务，执行 `sudo systemctl daemon-reload` 和 `sudo systemctl enable --now dongxue`，验证 Caddy 配置后启动或重载 Caddy。应用监听环回端口 8784，由 Caddy 对外提供 HTTPS。
4. 管理员私下打开服务生成的 `/var/lib/dongxue/teacher-first-setup.html` 中的首次设置链接，设置教师密码。向学生只发送普通首页地址。数据库和教师凭据保存在 `/var/lib/dongxue`，部署升级时保留该目录。
5. 用两个独立浏览器验收。学生在一个浏览器提交练习，教师在另一个浏览器登录并刷新。学生用原学号再次提交后，检查人数及该学生的明细。

GitHub 托管项目源码。师生共用网址由运行上述服务的主机提供。静态 Pages 无法运行 Python 或保存全班学习记录。原公开练习版浏览器中的个人历史不会自动迁移。
## 按需开启课程智能体

将教学网站、Caddy、Python 服务、SQLite 数据库与备份放在常开的 CPU 主机。GPU 主机只运行模型推理（Ollama）。Dify Chatflow 可以随 GPU 主机一起开关，也可放在另一台内网主机。教师端和学生端始终使用同一个教学网址。网站启动、记录提交、规则问诊和教师查阅均可在 GPU 关机时使用。

在 Dify 发布一个 Chatflow，在开始节点添加两个长文本输入 `course_context`、`recent_turns`。在模型节点的系统提示中引用前者作为本轮教学任务和资料，把后者作为最近对话的引用材料，用户消息使用系统变量 `sys.query`。连接回答节点输出模型正文。模型节点选内网 Ollama 模型，如另设嵌入、重排或跟踪服务，也应选择私有端点。用于计划评阅或语义问诊时，模型要遵循本轮任务要求的 JSON 格式。应用接口见 [Dify Chatflow 文档](https://docs.dify.ai/en/api-reference/guides/chatflow)。

在教学服务器的 `/etc/dongxue.env` 设置以下三项，再重启教学服务。密钥使用这个 Chatflow 的应用密钥，由服务器保管。私网 HTTPS 地址和证书须能由教学服务器验证，也可通过加密隧道映射至教学主机的环回 HTTP 地址。

```ini
LAB_AI_MODE=private-dify
LAB_DIFY_BASE_URL=https://dify.internal.example/v1
LAB_DIFY_KEY=替换为私有应用密钥
```

学生主动发送时，教学服务器将问题、课程材料和必要的脱敏上下文发送到该 Chatflow。教学数据库保存问答结果和失败状态。私有模式不会自动切换到外部模型。GPU 关闭时，已保存的记录及教师点评仍可查看，新问题可在服务恢复后由学生重试。关机前后可用同一学号各提交一次实验，在教师端核对个人明细。
