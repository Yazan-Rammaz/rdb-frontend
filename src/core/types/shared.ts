/**
 * SHARED UTILITY TYPES
 */
export interface FetchResponse<T = any> {
  data: T | null;
  error: string | null;
  status: number;
  isError?: boolean;
  url?: string;
  success: boolean;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
  deletedAt: any;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CursorPagination {
  startCursor: string;
  endCursor: string;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  total: number;
}
