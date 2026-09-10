import { describe, expect, it } from "vitest";

import type { Notification } from "./hooks/useNotificationsQuery";
import { getNotificationResultPath } from "./notification-navigation";

const notification = (overrides: Partial<Notification>): Notification => ({
  id: 1,
  title: "Model status",
  message: "Status changed",
  type: "success",
  read: false,
  created_at: "2026-08-31T10:00:00Z",
  ...overrides,
});

describe("getNotificationResultPath", () => {
  it("links successful model-completion notifications to results", () => {
    expect(getNotificationResultPath(notification({ model_id: 42 }))).toBe("/app/model-results/42");
  });

  it("does not send failed calculations to a missing results page", () => {
    expect(getNotificationResultPath(notification({ type: "error", model_id: 42 }))).toBeNull();
  });

  it("ignores success notifications that are unrelated to a model", () => {
    expect(getNotificationResultPath(notification({ model_id: undefined }))).toBeNull();
  });
});
