import type { DataSource } from "@/core/dataSource";
import { createStaticJsonSource } from "@/data/sources/staticJsonSource";

/**
 * 数据集目录：新增实现 `DataSource` 的模块后在此注册，
 * 再在 `main.tsx` 选择默认数据源或做 UI 切换。
 */
/** 与 Vite base 一致，部署在 GitHub Pages 子路径时仍能加载 public 下的 JSON */
const sampleDataPath = `${import.meta.env.BASE_URL}data/jobs.sample.json`;

export const dataSourceCatalog: DataSource[] = [
  createStaticJsonSource("sample", "演示样本", sampleDataPath),
];
