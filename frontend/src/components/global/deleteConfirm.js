let openDeleteConfirm = null;

export const registerDeleteConfirm = (handler) => {
  openDeleteConfirm = handler;
};

export const buildDeleteMessage = ({
  entityLabel = "item",
  entityLabelPlural,
  count = 1,
  itemName,
}) => {
  const pluralLabel = entityLabelPlural || `${entityLabel}s`;

  if (count > 1) {
    return `Delete ${count} ${pluralLabel}?`;
  }

  if (itemName) {
    return `Delete ${entityLabel} "${itemName}"?`;
  }

  return `Delete this ${entityLabel}?`;
};

export const confirmDelete = (options = {}) => {
  if (!openDeleteConfirm) {
    return Promise.resolve(
      window.confirm(options.message || buildDeleteMessage(options)),
    );
  }

  return openDeleteConfirm(options);
};
