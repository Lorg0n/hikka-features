import { createSignal, Show, onMount } from "solid-js";
import { MountableElement, render } from "solid-js/web";
import { Transition } from "solid-transition-group";
import { Button } from "@/components/ui/button";
import MaterialSymbolsArrowRightAltRounded from "~icons/material-symbols/arrow-right-alt-rounded";

async function fetchDetailedData(content: any) {
  const malId = content.entry.mal_id;
  const response = await fetch(`https://api.hikka.io/integrations/mal/anime/${malId}`);
  if (!response.ok) throw new Error(`API request failed with status code ${response.status}`);
  return response.json();
}

export default async function recommendationBlock(anime_data: any, recommendationBlockLocation?: MountableElement) {
  if (document.body.querySelector("#recommendation-block")) return;

  const [blockState, setBlockState] = createSignal(await recommendationBlockState.getValue());
  recommendationBlockState.watch(setBlockState);

  const [recommendations, setRecommendations] = createSignal<any[]>([]);
  const [loading, setLoading] = createSignal(true);
  const title = anime_data.title_ja || anime_data.title_en || anime_data.title_original || anime_data.name_en;
  const mal_id = anime_data.mal_id;

  let maxSingleVotes = 0;

  async function fetchRecommendations() {
    try {
      const recommendationResponse = await fetch(`https://api.jikan.moe/v4/anime/${mal_id}/recommendations`);
      const recommendationData = await recommendationResponse.json();
      const result = await Promise.all(recommendationData.data.slice(0, 4).map(async (element: any) => {
        try {
          const hikkaData = await fetchDetailedData(element);
          if (element.votes > maxSingleVotes) maxSingleVotes = element.votes;
          return { ...hikkaData, mal: { ...element } };
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 700));
          const hikkaData = await fetchDetailedData(element);
          if (element.votes > maxSingleVotes) maxSingleVotes = element.votes;
          return { ...hikkaData, mal: { ...element } };
        }
      }));
      setRecommendations(result);
    } catch (error) {
      console.error("Error during requests:", error);
    } finally {
      setLoading(false);
    }
  }

  onMount(fetchRecommendations);

  render(
    () => (
      <Transition name="slide-fade">
        <Show when={blockState()}>
          <div class="flex flex-col gap-4 lg:gap-8" id="recommendation-block">
            <div class="flex items-center justify-between gap-2">
              <h3 class="scroll-m-20 font-display text-lg font-bold tracking-normal">Схожий контент</h3>
              <Button size="icon-sm" variant="outline" disabled={loading() || recommendations().length === 0}>
                <a href={`https://myanimelist.net/anime/${mal_id}`} target="_blank">
                  <MaterialSymbolsArrowRightAltRounded class="text-lg" />
                </a>
              </Button>
            </div>
            <div class="relative -my-4 grid gap-4 py-4 lg:gap-8 md:grid-cols-4 no-scrollbar -mx-4 auto-cols-scroll grid-flow-col grid-cols-scroll overflow-x-scroll px-4 gradient-mask-r-90-d md:gradient-mask-none">
              {loading()
                ? Array.from({ length: 4 }).map(() => (
                    <div class="skeleton animate-pulse bg-secondary/60 rounded-md" style={{ "padding-bottom": "142.857%" }} />
                  ))
                : recommendations().map((item) => (
                    <a href={`https://hikka.io/anime/${item.slug}`} target="_blank" rel="noopener noreferrer">
                      <div class="group relative flex w-full flex-col gap-2">
                        <div class="relative rounded-md overflow-hidden" style={{ "padding-bottom": "142.857%" }}>
                          <img class="object-cover w-full h-full absolute inset-0 bg-secondary/30" src={item.image} alt={item.title_ua || item.title_en || item.title_ja} loading="lazy" />
                          <p class={`absolute top-2 left-2 px-2 py-1 rounded-md bg-secondary/80 text-sm ${
                            Math.round(item?.mal.votes / maxSingleVotes * 100) > 90
                              ? "text-success"
                              : Math.round(item?.mal.votes / maxSingleVotes * 100) > 50
                              ? "text-warning"
                              : "text-destructive"
                          }`}>
                            {Math.round(item?.mal.votes / maxSingleVotes * 100)}
                          </p>
                        </div>
                        <label class="text-sm font-medium leading-5 line-clamp-2">{item?.title_ua || item?.title_en || item?.title_ja}</label>
                      </div>
                    </a>
                  ))}
            </div>
          </div>
        </Show>
      </Transition>
    ),
    recommendationBlockLocation || document.querySelector("body > div > main > div > div.flex.flex-col.gap-12 > div.grid.grid-cols-1.gap-12 > div.relative.order-2.flex.flex-col.gap-12")!
  );
}