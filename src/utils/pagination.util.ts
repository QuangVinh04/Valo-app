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
