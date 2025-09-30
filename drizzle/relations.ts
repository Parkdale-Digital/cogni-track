import { relations } from "drizzle-orm/relations";
import { providerKeys, usageEvents, users } from "./schema";

export const usageEventsRelations = relations(usageEvents, ({one}) => ({
	providerKey: one(providerKeys, {
		fields: [usageEvents.keyId],
		references: [providerKeys.id]
	}),
}));

export const providerKeysRelations = relations(providerKeys, ({one, many}) => ({
	usageEvents: many(usageEvents),
	user: one(users, {
		fields: [providerKeys.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	providerKeys: many(providerKeys),
}));