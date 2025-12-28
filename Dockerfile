FROM node:22-bullseye

ARG ANDROID_SDK_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

ENV DEBIAN_FRONTEND=noninteractive \
    ANDROID_SDK_ROOT=/opt/android-sdk \
    ANDROID_HOME=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8

# 使用国内镜像源以提升 apt 下载稳定性
RUN cat <<'EOF' > /etc/apt/sources.list
deb https://mirrors.tuna.tsinghua.edu.cn/debian bullseye main contrib non-free
deb https://mirrors.tuna.tsinghua.edu.cn/debian bullseye-updates main contrib non-free
deb https://mirrors.tuna.tsinghua.edu.cn/debian-security bullseye-security main contrib non-free
EOF

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openjdk-17-jdk \
    unzip \
    git \
    curl \
    wget \
    python3 \
    python3-pip \
    build-essential \
    cmake \
    ninja-build \
    libglu1-mesa \
    libpulse0 \
    locales && \
    locale-gen en_US.UTF-8 && \
    rm -rf /var/lib/apt/lists/*

ARG HOST_PLUGDEV_GID=46
RUN set -eux; \
    if getent group plugdev >/dev/null; then \
    groupmod -g "${HOST_PLUGDEV_GID}" plugdev || true; \
    else \
    groupadd -g "${HOST_PLUGDEV_GID}" plugdev; \
    fi; \
    usermod -a -G plugdev node

RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
    cd /tmp && \
    curl -fSL --retry 5 --retry-delay 5 -o android_cmdline_tools.zip "${ANDROID_SDK_TOOLS_URL}" && \
    unzip -q android_cmdline_tools.zip -d /tmp && \
    rm android_cmdline_tools.zip && \
    rm -rf ${ANDROID_SDK_ROOT}/cmdline-tools/latest && \
    mv /tmp/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest

ENV PATH=$PATH:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/emulator

RUN env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY bash -c '\
    yes | sdkmanager --licenses && \
    sdkmanager \
      "platform-tools" \
      "platforms;android-34" \
      "build-tools;34.0.0" \
      "cmdline-tools;latest" \
      "emulator" \
      "system-images;android-34;google_apis;x86_64" \
'

RUN mkdir -p /home/node/.android && \
    chown -R node:node /home/node /opt/android-sdk

WORKDIR /app
USER node

CMD ["bash"]
