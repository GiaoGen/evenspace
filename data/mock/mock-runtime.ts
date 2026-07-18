import "server-only";

export function assertMockRuntimeAllowed() {
  const isProductionDeployment = process.env.EVENTSPACE_DEPLOYMENT === "production"
    || process.env.VERCEL_ENV === "production"
    || process.env.NETLIFY === "true" && process.env.CONTEXT === "production";

  if (isProductionDeployment && process.env.EVENTSPACE_MODE !== "mock") {
    throw new Error("Mock room data is disabled for production deployments unless EVENTSPACE_MODE=mock explicitly enables a controlled preview.");
  }
}
