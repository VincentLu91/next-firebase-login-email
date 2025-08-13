// Send a Blob or an ArrayBuffer; the API returns an MP3 public URL + storage path
export async function storeAsMp3({
  blobOrArrayBuffer,
  userId,
  table,
  baseName,
}) {
  const body =
    blobOrArrayBuffer instanceof Blob
      ? await blobOrArrayBuffer.arrayBuffer()
      : blobOrArrayBuffer;

  const resp = await fetch("/api/store-audio-mp3", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "x-user-id": userId,
      "x-table": table, // "mic_recordings" | "call_recordings"
      "x-basename": baseName, // without extension
    },
    body,
  });
  const json = await resp.json();
  if (!resp.ok || !json?.ok)
    throw new Error(json?.error || "store-audio-mp3 failed");
  return json; // { publicUrl, path, bucket, contentType }
}
