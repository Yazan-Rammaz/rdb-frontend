import { FetchResponse, UploadMediaApi } from "../types";
import { fetchServerData, processResponse } from "../utils";

export async function UploadMedia({
  file,
  token,
  authCookieName,
}: {
  file: File;
  token?: string;
  authCookieName?: string;
}) {
  let formData = new FormData();
  formData.append("file", file);
  formData.append("type", file.type?.split("/")[0]);

  let response: FetchResponse<UploadMediaApi> = await fetchServerData({
    method: "POST",
    body: formData,
    url: "/media/upload/direct",
    token,
    authCookieName,
    headers: {
      // Using "MULTIPART" flag so your fetch wrapper knows to DELETE the content-type header
      ContentType: "MULTIPART",
    },
  });

  return processResponse<UploadMediaApi>(response);
}
