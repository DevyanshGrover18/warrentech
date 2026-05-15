export const permissionDefaults = {
  view: false,
  add: false,
  modify: false,
  delete: false,
  full: false,
};

export const accessControlSections = [
  "management",
  "factories",
  "orders",
  "products",
  "distributors",
  "dealers",
  "sales",
  "customers",
  "replacement",
  "technicians",
  "notifications",
];

export const createEmptyAccessControl = () =>
  accessControlSections.reduce((acc, section) => {
    acc[section] = { ...permissionDefaults };
    return acc;
  }, {});
