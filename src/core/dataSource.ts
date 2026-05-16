import type { JobsDataset } from "./types";

export interface DataSource {
  id: string;
  label: string;
  load(): Promise<JobsDataset>;
}
