declare module 'csv-writer' {
  export interface ObjectCsvWriterParams {
    path: string;
    header: Array<{id: string; title: string}>;
    encoding?: string;
    append?: boolean;
  }

  export interface CsvWriter {
    writeRecords(records: any[]): Promise<void>;
  }

  export function createObjectCsvWriter(params: ObjectCsvWriterParams): CsvWriter;
}