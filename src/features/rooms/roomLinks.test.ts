import { describe, expect, it } from "vitest";
import {
  createRoomInviteUrl,
  getRoomAccessSecretFromSearch,
  getRoomIdFromSearch,
} from "./roomLinks";

describe("roomLinks", () => {
  it("reads a room id from the query string", () => {
    expect(getRoomIdFromSearch("?room=room-123")).toBe("room-123");
    expect(getRoomIdFromSearch("?tab=home")).toBeNull();
    expect(getRoomIdFromSearch("?room=%20%20")).toBeNull();
  });

  it("reads a room access secret from the query string", () => {
    expect(getRoomAccessSecretFromSearch("?room=room-123&roomKey=secret-123")).toBe(
      "secret-123",
    );
    expect(getRoomAccessSecretFromSearch("?room=room-123")).toBeNull();
  });

  it("creates an invite url while preserving the current origin and path", () => {
    expect(
      createRoomInviteUrl({
        href: "https://example.com/app?from=toss",
        roomId: "room-123",
        accessSecret: "secret-123",
      }),
    ).toBe("https://example.com/app?from=toss&room=room-123&roomKey=secret-123");
  });
});
