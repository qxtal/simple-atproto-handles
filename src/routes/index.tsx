import { component$ } from "@builder.io/qwik";
import { type DocumentHead, type RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ status, headers, send }) => {
  status(503);
  headers.set('Content-Type', 'text/plain');
  send(new Response('This AT Protocol handle service is currently not open for new registrations at this moment.'));
};

export default component$(() => {
  return <></>;
});

export const head: DocumentHead = {
  title: "",
  meta: [],
};
