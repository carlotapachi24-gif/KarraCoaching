import { UserRole } from '../types';

interface UserIdentity {
  firstName: string;
  fullName: string;
}

function capitalize(value: string): string {
  if (!value) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function deriveUserIdentity(email: string, role: UserRole): UserIdentity {
  if (role === UserRole.COACH) {
    return { firstName: 'Carlota', fullName: 'Carlota' };
  }

  const localPart = (email.split('@')[0] || '').trim();
  const rawParts = localPart.split(/[._-]+/).filter(Boolean);

  if (rawParts.length === 0) {
    return { firstName: 'Cliente', fullName: 'Cliente' };
  }

  const parts = rawParts.map((part) => capitalize(part));
  return {
    firstName: parts[0],
    fullName: parts.join(' '),
  };
}
