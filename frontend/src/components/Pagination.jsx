import React from "react";

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-between items-center p-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page === 1}
          className="px-3 py-1 bg-slate-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page === totalPages}
          className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;