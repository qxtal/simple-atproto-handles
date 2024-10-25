import type { RequestHandler } from "@builder.io/qwik-city";
import { D1Orm } from "d1-orm";
import { UserModel } from "../../../../modles";
export const onGet: RequestHandler = async ({
  params,
  platform,
  send,
  headers,
}) => {
  const orm = new D1Orm(platform.env.DB);
  const user = await UserModel(orm).First({
    where: { handle: params.handle },
  });

  if (user?.did) {
    headers.set("content-type", "text/plain");
    send(200, user.did);
  } else {
    headers.set("content-type", "text/plain");
    send(404, "User not found");
  }
};
