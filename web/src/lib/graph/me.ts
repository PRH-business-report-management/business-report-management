import { graphRequest } from "./client";

export type GraphMe = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

export async function getMe(accessToken: string) {
  return graphRequest<GraphMe>(
    accessToken,
    "/me?$select=id,displayName,mail,userPrincipalName"
  );
}
