export function getSharedResultIdFromSearch(search: string) {
  const params = new URLSearchParams(search);
  return params.get("result");
}

export function createSharedResultUrl({
  href,
  resultId,
}: {
  href: string;
  resultId: string;
}) {
  const url = new URL(href);
  url.searchParams.delete("room");
  url.searchParams.set("result", resultId);
  return url.toString();
}
