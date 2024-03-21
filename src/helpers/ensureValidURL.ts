export function ensureValidUrl(url: string): string {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) {
    // TODO: http or https?
    return "https://" + url;
  }
  return url;
}
