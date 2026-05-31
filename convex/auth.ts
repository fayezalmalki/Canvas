import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Email + password auth. Run `npx @convex-dev/auth` once to generate the
// JWT keys/JWKS in your Convex deployment, then `npx convex deploy`.
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Password()],
});
