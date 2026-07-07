import { createRootRoute, createRouter } from "@tanstack/react-router";
import { App } from "./App";

const rootRoute = createRootRoute({ component: App });
export const router = createRouter({ routeTree: rootRoute });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
