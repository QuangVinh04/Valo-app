export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface CursorPaginationOptions {
  limit: number;
  cursor?: string;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function getPaginationOptions(query: {
  page?: unknown;
  limit?: unknown;
}): PaginationOptions {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  totalItems: number,
  options: PaginationOptions
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: options.page,
      limit: options.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / options.limit)
    }
  };
}

export function buildCursorPaginatedResult<T extends { id: string }>(
  data: T[],
  limit: number
): CursorPaginatedResult<T> {
  const hasNextPage = data.length > limit;
  const pageItems = hasNextPage ? data.slice(0, limit) : data;
  const lastItem = pageItems.at(-1);

  return {
    data: pageItems,
    meta: {
      limit,
      nextCursor: hasNextPage && lastItem ? lastItem.id : null,
      hasNextPage
    }
  };
}
