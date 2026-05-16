import type { DataSource } from "@/core/dataSource";
import type { JobsDataset } from "@/core/types";

/** 从 /public 加载 JSON，可替换为任意 URL 或 API */
export function createStaticJsonSource(
  id: string,
  label: string,
  publicPath: string,
): DataSource {
  return {
    id,
    label,
    async load(): Promise<JobsDataset> {
      const res = await fetch(publicPath);
      if (!res.ok) throw new Error(`加载数据集失败: ${publicPath}`);
      const data = (await res.json()) as JobsDataset;
      if (data.schemaVersion !== 1) {
        throw new Error(
          `不支持的 schemaVersion: ${String((data as JobsDataset).schemaVersion)}`,
        );
      }
      return data;
    },
  };
}
