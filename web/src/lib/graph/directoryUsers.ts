import { graphRequest } from "./client";

export type DirectoryUserRow = {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
};

export async function listDirectoryUsers(accessToken: string) {
  const data = await graphRequest<{ value: DirectoryUserRow[] }>(
    accessToken,
    "/users?$top=999&$select=id,displayName,mail,userPrincipalName&$orderby=displayName"
  );
  return data.value ?? [];
}
