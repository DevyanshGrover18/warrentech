const parsePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
        return fallback;
    }

    return parsedValue;
};

export const parsePaginatedListQuery = (query = {}, options = {}) => {
    const {
        defaultLimit = 25,
        maxLimit = 100,
        defaultSortBy = 'createdAt',
        defaultSortOrder = 'desc',
    } = options;

    const page = parsePositiveInteger(query.page, 1);
    const requestedLimit = parsePositiveInteger(query.limit, defaultLimit);
    const limit = Math.min(requestedLimit, maxLimit);
    const sortBy = query.sortBy || defaultSortBy;
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : defaultSortOrder;

    return {
        paginate: query.paginate === 'true',
        page,
        limit,
        sortBy,
        sortOrder,
        skip: (page - 1) * limit,
    };
};

export const buildPaginatedAggregationResponse = (facetResult = [], meta = {}) => {
    const [{ items = [], totalCount = [] } = {}] = facetResult;
    const totalItems = totalCount[0]?.count || 0;
    const limit = meta.limit || 25;
    const page = meta.page || 1;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

    return {
        items,
        page,
        limit,
        totalItems,
        totalPages,
        appliedFilters: meta.appliedFilters || {},
    };
};
