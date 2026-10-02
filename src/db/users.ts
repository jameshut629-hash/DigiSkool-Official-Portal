// src/db/users.ts
import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name?: string) {
  try {
    const cleanEmail = email.toLowerCase().trim();
    const displayName = name || cleanEmail.split('@')[0];

    // First, check if a user already exists with either this UID or this email
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (existing.length > 0) {
      // Update existing record with the Firebase UID and latest name/timestamps
      const updated = await db.update(users)
        .set({
          uid,
          name: displayName,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.email, cleanEmail))
        .returning();

      return updated[0];
    }

    // Otherwise insert new user
    const result = await db.insert(users)
      .values({
        uid,
        email: cleanEmail,
        name: displayName,
        lastLoginAt: new Date(),
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user with Cloud SQL database.', { cause: error });
  }
}

export async function syncUserToCloudSql(userData: {
  email: string;
  name?: string;
  role?: string;
  permission_level?: string;
  campus_access?: string;
  allowed_modules?: string;
  phone?: string;
  status?: string;
}) {
  try {
    const cleanEmail = userData.email.toLowerCase().trim();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);

    if (existing.length > 0) {
      await db.update(users)
        .set({
          name: userData.name || existing[0].name,
          role: userData.role || existing[0].role,
          permissionLevel: userData.permission_level || existing[0].permissionLevel,
          campusAccess: userData.campus_access || existing[0].campusAccess,
          allowedModules: userData.allowed_modules !== undefined ? userData.allowed_modules : existing[0].allowedModules,
          phone: userData.phone !== undefined ? userData.phone : existing[0].phone,
          status: userData.status || existing[0].status,
          updatedAt: new Date(),
        })
        .where(eq(users.email, cleanEmail));
    } else {
      await db.insert(users)
        .values({
          email: cleanEmail,
          name: userData.name || cleanEmail.split('@')[0],
          role: userData.role || 'staff',
          permissionLevel: userData.permission_level || 'selective',
          campusAccess: userData.campus_access || 'all',
          allowedModules: userData.allowed_modules || 'all',
          phone: userData.phone || null,
          status: userData.status || 'active',
        });
    }
  } catch (error) {
    console.warn('Cloud SQL user sync notice:', error);
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
