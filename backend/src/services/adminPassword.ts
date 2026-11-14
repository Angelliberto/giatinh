import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

/** Keeps the admin login hash aligned with ADMIN_PASSWORD. */
export async function syncAdminPassword(): Promise<'created' | 'updated' | 'unchanged'> {
  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  const user = await User.findOne();

  if (!user) {
    await User.create({
      email: 'admin@studio.local',
      passwordHash,
    });
    return 'created';
  }

  const same = await bcrypt.compare(env.adminPassword, user.passwordHash);
  if (same) return 'unchanged';

  user.passwordHash = passwordHash;
  await user.save();
  return 'updated';
}
