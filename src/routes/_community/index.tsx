import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$ } from "@builder.io/qwik-city";

import { D1Orm } from "d1-orm";
import { UserModel } from "~/modles";

import { AtpAgent } from "@atproto/api";

// Helper to chunk array into smaller parts
function chunkArray(array: string[], size: number) {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}

export const useGetUsers = routeLoader$(async ({ platform, url: { host } }) => {
  const orm = new D1Orm(platform.env.DB);
  const users = await UserModel(orm).All({});
  const userDids = users.results.map((user) => user.did);

  if (userDids.length === 0) {
    return { profiles: [] };
  }

  const chunks = chunkArray(userDids, 24);
  return { chunks, host };
});

export default component$(() => {
  const profiles = useSignal<any[]>([]);
  const Users = useGetUsers();
  console.log(Users.value.profiles);
  useTask$(async () => {
    const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
    const { chunks, host } = Users.value;

    if (chunks) {
      for (const chunk of chunks) {
        const response = await agent.getProfiles({ actors: chunk });
        const newProfiles = response.data.profiles.filter(
          (profile, index, array) => {
            // Deduplicate, validate handle and displayName, and match the host
            const isUnique =
              array.findIndex(({ did }) => did === profile.did) === index;
            const isValidHandle = profile.handle !== "handle.invalid";
            const isKnownUser = profile.displayName !== "Unknown User";
            const matchesHost = profile.handle.endsWith(host);

            return isUnique && isValidHandle && isKnownUser && matchesHost;
          },
        );

        // Add the new profiles to the profiles signal
        profiles.value = [...profiles.value, ...newProfiles];
      }
    } else {
      console.error("Chunks is undefined");
    }
  });

  return (
    <div class="min-h-screen bg-gradient-to-tr from-purple-200 to-blue-200 p-8">
      <section class="container mx-auto">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {profiles.value.map((profile) => (
            <div
              key={profile.did}
              class="overflow-hidden rounded-lg bg-white shadow-lg transition-transform duration-300 hover:scale-105"
            >
              {/* User Banner */}
              {profile.banner ? (
                <img
                  src={profile.banner}
                  alt={`${profile.displayName}'s banner`}
                  class="h-32 w-full object-cover"
                  width={128}
                  height={128}
                />
              ) : (
                <div class="h-32 w-full bg-gradient-to-r from-blue-200 to-purple-200"></div>
              )}

              <div class="p-6">
                {/* User Avatar */}
                <div class="-mt-16 flex justify-center">
                  <img
                    src={profile.avatar || "/default-avatar.png"}
                    alt={`${profile.displayName}'s avatar`}
                    class="h-24 w-24 rounded-full border-4 border-white object-cover"
                    width={96}
                    height={96}
                  />
                </div>

                {/* Display Name and Handle */}
                <div class="mt-4 text-center">
                  <h3 class="text-xl font-semibold text-gray-800">
                    {profile.displayName || "Unknown User"}
                  </h3>
                  <p class="text-sm text-gray-500">@{profile.handle}</p>
                </div>

                {/* Additional Info (Followers, Following) */}
                <div class="mt-4 text-center">
                  <p class="text-sm text-gray-600">
                    Followers: {profile.followersCount ?? "N/A"}
                  </p>
                  <p class="text-sm text-gray-600">
                    Following: {profile.followsCount ?? "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Welcome to Qwik",
  meta: [
    {
      name: "description",
      content: "Qwik site description",
    },
  ],
};
