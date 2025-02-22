# 项目安装指南

本指南将帮助您使用 Docker 快速安装和运行项目。

## 安装步骤

### 1. 构建 Docker 镜像

在项目的根目录下执行以下命令，以构建 Docker 镜像：

```bash
docker build -t ai-info:0.0.1 .
```

- `-t ai-info:0.0.1` 为镜像指定名称 `ai-info` 和版本号 `0.0.1`。
- `.` 表示 Dockerfile 位于当前目录。

### 2. 运行 Docker 容器

在构建完成后，运行以下命令启动 Docker 容器：

```bash
docker run --name ai-info -d -p 3128:3128 -v /home/www/ai/config.js:/home/www/ai/config.js ai-info:0.0.1 web
```

- `--name ai-info` 为容器指定名称 `ai-info`。
- `-d` 表示后台运行容器。
- `-p 3128:3128` 将主机的 3128 端口映射到容器的 3128 端口。
- `-v /home/www/ai/config.js:/home/www/ai/config.js` 挂载主机上的配置文件至容器内相同路径。
- `ai-info:0.0.1 web` 指定要运行的镜像版本和初始命令。

### 3. 测试是否安装成功

若容器启动正常，运行 `curl 127.0.0.1:3218/models` 查看是否正常访问。
正常访问时，将输出配置中支持的 model 列表

### 注意事项

- 确保 `/home/www/ai/config.js` 的配置文件存在且已正确配置。
- 请确认 Docker 已在您的系统中安装并正常运行。
- 如果需要修改配置，编辑本地的 `config.js` 文件，重启容器以应用更改。

以上步骤将帮助您成功安装和启动项目。如有任何问题，请自行查看源码解决或提 issue
