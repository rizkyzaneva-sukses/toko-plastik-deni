import { Role } from '../types';

export const TAB_ROLES: Record<string, Role[]> = {
  dashboard: [Role.OWNER, Role.MANAGER, Role.KASIR, Role.GUDANG],
  kasir: [Role.OWNER, Role.MANAGER, Role.KASIR],
  transaksi: [Role.OWNER, Role.MANAGER, Role.KASIR],
  pengeluaran: [Role.OWNER, Role.MANAGER, Role.KASIR],
  modal: [Role.OWNER],
  pecah: [Role.OWNER, Role.MANAGER, Role.GUDANG],
  piutang: [Role.OWNER, Role.MANAGER, Role.KASIR],
  stok: [Role.OWNER, Role.MANAGER, Role.GUDANG],
  laporan: [Role.OWNER, Role.MANAGER],
  master: [Role.OWNER, Role.MANAGER],
};

export function canAccessTab(role: Role, tab: string): boolean {
  const allowed = TAB_ROLES[tab];
  if (!allowed) return role === Role.OWNER;
  return allowed.includes(role);
}
