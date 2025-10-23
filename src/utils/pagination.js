// utils/pagination.js

/**
 * Utility function to paginate data.
 * @param {Array} data - The full dataset.
 * @param {Object} filters - The filters to apply.
 * @param {number} page - The current page.
 * @param {number} limit - The number of results per page.
 * @returns {Object} - Paginated response with metadata.
 */
const paginate = (data, filters, page = 1, limit = 10) => {
  const filteredData = data.filter((item) => {
    let isValid = true;
    for (const [key, value] of Object.entries(filters)) {
      if (item[key] !== value) {
        isValid = false;
        break;
      }
    }
    return isValid;
  });

  // Pagination logic
  const total = filteredData.length;
  const pageNumber = parseInt(page, 10);
  const pageSize = parseInt(limit, 10);
  const paginatedData = filteredData.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize
  );

  return {
    page: pageNumber,
    limit: pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    data: paginatedData,
  };
};

module.exports = paginate;
