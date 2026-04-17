import { emit } from "./eventBus";

export function connectServerEvents() {
  const source = new EventSource("/api/events");

  source.addEventListener("grant:created", (e) => {
    emit("grant:created", JSON.parse(e.data));
  });

  source.addEventListener("grant:updated", (e) => {
    emit("grant:updated", JSON.parse(e.data));
  });

  source.addEventListener("grant:sectionImproved", (e) => {
    emit("grant:sectionImproved", JSON.parse(e.data));
  });

  return source;
}
