# 本地服务器

后端使用 Python 3.11 + FastAPI，默认监听 0.0.0.0:21512。首次启动会创建 server/data/calendar.db。

运行：

    cd server
    .\start.ps1

当前 /api/v1/parse 提供无需模型即可运行的规则解析兜底。安装 Qwen/llama.cpp 后，可在 parse_event 位置替换为模型编排器。

本地开发模式暂时跳过真实邮箱验证码（注册接口返回 verificationRequired: false），方便先联调页面。正式使用前需增加 SMTP 配置、验证码表和 /auth/verify-email 流程，并将未验证账号禁止登录。
