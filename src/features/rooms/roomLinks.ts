export function getRoomIdFromSearch(search: string) {
  const roomId = new URLSearchParams(search).get("room")?.trim();
  return roomId && roomId.length > 0 ? roomId : null;
}

export function getRoomAccessSecretFromSearch(search: string) {
  const roomKey = new URLSearchParams(search).get("roomKey")?.trim();
  return roomKey && roomKey.length > 0 ? roomKey : null;
}

export function createRoomInviteUrl({
  href,
  roomId,
  accessSecret,
}: {
  href: string;
  roomId: string;
  accessSecret?: string;
}) {
  const url = new URL(href);
  url.searchParams.set("room", roomId);
  if (accessSecret) {
    url.searchParams.set("roomKey", accessSecret);
  }
  return url.toString();
}
