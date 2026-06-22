import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 親ディレクトリの別ロックファイルを誤検出させず、このプロジェクトをルートに固定する
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
