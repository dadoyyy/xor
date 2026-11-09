export type MaterialStatus = "uploaded" | "processing" | "ready" | "failed";

export type MaterialRow = {
  id: string;
  title: string;
  filePath: string | null;
  fileSize: number | null;
  status: MaterialStatus;
  pageCount: number | null;
  error: string | null;
  uploadedBy: string;
  uploader: string;
  createdAt: string;
  processingStartedAt: string | null;
  isNew?: boolean;
};

