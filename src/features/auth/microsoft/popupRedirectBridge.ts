export async function relayMicrosoftPopupResponse() {
  const { broadcastResponseToMainFrame } = await import('@azure/msal-browser/redirect-bridge')
  await broadcastResponseToMainFrame()
}
