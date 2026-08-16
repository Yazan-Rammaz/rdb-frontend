import type { LivenessResult, IDDocument, MatchResult } from '@/core/types/verification';
import { fetchServerData, processResponse } from '@/core/utils';

export async function detectFace({
  faceImageData,
  token,
  authCookieName,
}: {
  faceImageData: string;
  token?: string;
  authCookieName?: string;
}): Promise<LivenessResult | { error: string }> {
  try {
    const response = await fetchServerData<LivenessResult>({
      method: 'POST',
      url: '/verification/liveness/detect',
      body: { faceImageData },
      token,
      authCookieName,
    });
    return processResponse<LivenessResult>(response);
  } catch (error) {
    console.error('detectFace Error:', error);
    return { error: String(error) };
  }
}

export async function captureID({
  imageData,
  side,
  token,
  authCookieName,
}: {
  imageData: string;
  side: 'front' | 'back';
  token?: string;
  authCookieName?: string;
}): Promise<Partial<IDDocument> | { error: string }> {
  try {
    const response = await fetchServerData<Partial<IDDocument>>({
      method: 'POST',
      url: '/verification/id/capture',
      body: { imageData, side },
      token,
      authCookieName,
    });
    return processResponse<Partial<IDDocument>>(response);
  } catch (error) {
    console.error('captureID Error:', error);
    return { error: String(error) };
  }
}

export async function matchFaceToID({
  faceData,
  idData,
  token,
  authCookieName,
}: {
  faceData: string;
  idData: string;
  token?: string;
  authCookieName?: string;
}): Promise<MatchResult | { error: string }> {
  try {
    const response = await fetchServerData<MatchResult>({
      method: 'POST',
      url: '/verification/face/match',
      body: { faceData, idData },
      token,
      authCookieName,
    });
    return processResponse<MatchResult>(response);
  } catch (error) {
    console.error('matchFaceToID Error:', error);
    return { error: String(error) };
  }
}

export async function startVideoCall({
  sessionId,
  token,
  authCookieName,
}: {
  sessionId: string;
  token?: string;
  authCookieName?: string;
}): Promise<{ streamUrl: string } | { error: string }> {
  try {
    const response = await fetchServerData<{ streamUrl: string }>({
      method: 'POST',
      url: '/verification/video/start',
      body: { sessionId },
      token,
      authCookieName,
    });
    return processResponse<{ streamUrl: string }>(response);
  } catch (error) {
    console.error('startVideoCall Error:', error);
    return { error: String(error) };
  }
}

export async function endVideoCall({
  sessionId,
  token,
  authCookieName,
}: {
  sessionId: string;
  token?: string;
  authCookieName?: string;
}): Promise<{ success: boolean } | { error: string }> {
  try {
    const response = await fetchServerData<{ success: boolean }>({
      method: 'POST',
      url: '/verification/video/end',
      body: { sessionId },
      token,
      authCookieName,
    });
    return processResponse<{ success: boolean }>(response);
  } catch (error) {
    console.error('endVideoCall Error:', error);
    return { error: String(error) };
  }
}
