import { UserRole } from '../types';

export const DEFAULT_PERMISSIONS_MATRIX: Record<string, Record<UserRole, boolean>> = {
  // Procurement
  'po-create': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'po-receive': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'branch-procurement-control': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: false },
  'inv-create': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },
  'inv-pay': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: true },

  // Warehouse
  'shipment-create': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'wh-receive-pullouts': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'wh-restrict-transfer': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: false },
  'shipment-history': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: true },

  // Branch operations
  'branch-transfer-create': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'branch-transfer-receive': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'branch-pullout-dispatch': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'branch-damage-mark': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },
  'branch-asset-assign': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },
  'stock-out': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: false },

  // Inventory master
  'prod-view': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: true },
  'prod-edit': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: false },
  'uom-manage': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: false },
  'stock-import-export': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },

  // Financials & Assets
  'assets-manage': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },
  'fin-statements': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: true },
  'vat-register': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: true },
  'stock-valuation': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },

  // Contacts
  'suppliers-manage': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: false, ACCOUNTANT: true },
  'customers-manage': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: true, FRONT_DESK: true, ACCOUNTANT: true },

  // Admin
  'admin-users': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: false },
  'admin-branches': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: false },
  'admin-audit': { SUPER_ADMIN: true, INVENTORY_MANAGER: true, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: true },
  'admin-fiscal': { SUPER_ADMIN: true, INVENTORY_MANAGER: false, BRANCH_MANAGER: false, FRONT_DESK: false, ACCOUNTANT: true },
};

export const getPermissionsMatrix = (): Record<string, Record<UserRole, boolean>> => {
  try {
    const stored = localStorage.getItem('izone_permissions_matrix');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error reading permissions matrix from localStorage', e);
  }
  return DEFAULT_PERMISSIONS_MATRIX;
};

export const savePermissionsMatrix = (matrix: Record<string, Record<UserRole, boolean>>) => {
  try {
    localStorage.setItem('izone_permissions_matrix', JSON.stringify(matrix));
    // Dispatch custom event for real-time app update
    window.dispatchEvent(new Event('izone_permissions_updated'));
  } catch (e) {
    console.error('Error saving permissions matrix', e);
  }
};

export const isOperationAllowed = (
  opId: string,
  userRole?: UserRole | string | null,
  allowBranchProcurement?: boolean
): boolean => {
  if (!userRole) return true; // Default allow if unauthenticated in dev

  // Check branch-level procurement restriction for procurement operations
  if (
    allowBranchProcurement === false &&
    (opId === 'po-create' || opId === 'po-receive' || opId === 'inv-create' || opId === 'inv-pay')
  ) {
    return false;
  }

  const roleKey = userRole as UserRole;

  // Super admin bypasses matrix EXCEPT for branch procurement restriction above
  if (roleKey === 'SUPER_ADMIN') {
    return true;
  }

  const matrix = getPermissionsMatrix();
  const opMap = matrix[opId];
  if (!opMap) return true; // Default allowed if not in matrix

  return opMap[roleKey] !== false;
};
