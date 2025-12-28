# VirtualLocation

React Native / Expo 项目，用于在 Android 上模拟定位，支持手动输入或地图选点跳转，内置原生 mock 模块（Kotlin）。当前 Wi‑Fi/基站增强为占位，只有 GPS/Fused 定位被模拟。

## 环境要求
- Node.js ≥ 20（React Native 0.83.x 要求）
- npm（或 pnpm/yarn）
- Android SDK/NDK：可通过项目自带的 Docker 环境快速获取
- 真机需在开发者选项中将本应用设为“允许模拟位置信息的应用”

## 快速开始
```bash
cd VirtualLocation
npm install
```

### 使用 Docker（推荐保持一致的 Android 工具链）
```bash
# 进入容器
./scripts/dev.sh shell

# 容器内启动 Metro
npm run start

# 容器内编译并安装到设备
npm run run:android
```
`scripts/dev.sh` 还支持 `build` / `start` / `run-android` 等子命令；`shell` 会复用已运行的容器，避免每次新建。

## 地图与 Key
在 `.env` 中配置所需的 Web Key（不提交到仓库）：
```
EXPO_PUBLIC_AMAP_WEB_KEY=your_amap_key
EXPO_PUBLIC_BAIDU_MAP_KEY=your_baidu_key
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_key
```
未提供的 provider 会自动跳过。

## 签名打包
1. 生成发布签名（示例）：
   ```bash
   mkdir -p keystore
   keytool -genkeypair -v -storetype PKCS12 -keystore keystore/release.keystore \
     -alias virtuallocation -keyalg RSA -keysize 2048 -validity 3650
   ```
2. 在项目根目录创建 `keystore.properties`（已被忽略，不会提交）：
   ```
   storeFile=keystore/release.keystore
   storePassword=你的密码
   keyAlias=virtuallocation
   keyPassword=你的密码
   ```
3. 打包：
   ```bash
   cd android
   ./gradlew app:assembleRelease   # 产出 APK
   # 或 ./gradlew bundleRelease    # 产出 AAB
   ```
如果未提供签名配置，Release 构建会回落到 debug keystore 以保证 CI/开发可用；正式发布务必按上面步骤配置自己的签名。

## 功能提示
- “立即跳转”调用原生 mock 模块，按秒连续推送位置；“停止模拟”可中断推送。
- Wi‑Fi 模拟增强 / 基站模拟：目前仅占位提示，无 Root/特权权限时不会伪造扫描结果。

## 目录与版本控制
- `android/` 已纳入版本控制，包含自定义原生 mock 逻辑；`ios/` 仍被忽略（尚未维护）。
- `.env` 已在 `.gitignore` 中，避免提交敏感 key。
