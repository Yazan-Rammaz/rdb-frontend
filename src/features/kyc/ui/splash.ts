/**
 * Root shows a splash on a full document load and holds the camera prompt until
 * it has finished. rdb has no splash on these routes, so there is nothing to
 * wait for — kept as a seam so the ported screens are unchanged.
 */
export async function waitForSplash(): Promise<void> {}
