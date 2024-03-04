import { Detail, List, ActionPanel, Action, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import OpenInCapacities from "./components/OpenInCapacities";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";

interface Preferences {
  bearerToken: string;
}

type Space = { title: string; id: string };

enum ContentType {
  RootSpace = "Space",
  RootDatabase = "Collection",
  RootQuery = "Query",
  RootPage = "Page",
  MediaImage = "Image",
  MediaPDF = "PDF",
  MediaAudio = "Audio",
  MediaVideo = "Video",
  MediaWebResource = "Weblink",
  MediaFile = "File",
  MediaTweet = "Tweet",
  RootAIChat = "AIChat",
  RootSimpleTable = "Table",
  RootDailyNote = "DailyNote",
  RootTag = "Tag",
  RootStructure = "Structure",
}

function SpaceDropdown(props: { spaces: Space[]; onSpaceChange: (newValue: string) => void }) {
  const { spaces, onSpaceChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Space"
      storeValue={true}
      onChange={(newValue) => {
        onSpaceChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Spaces">
        <List.Dropdown.Item key="All" title="All spaces" value="all" />
        {spaces.map((space) => (
          <List.Dropdown.Item key={space.id} title={space.title} value={space.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  useEffect(() => {
    checkCapacitiesApp();
  }, []);
  const markdown = "Bearer token incorrect. Please update it in extension preferences and try again.";

  const [searchText, setSearchText] = useState("");

  let spaces: Space[] = [];
  let spaceIDs: string[] = [];

  const { data } = useFetch("https://api.capacities.io/spaces", {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${preferences.bearerToken}`,
    },
  });

  spaces = data?.spaces || [];
  spaceIDs = spaces.map((space) => space.id);

  // How many items will be loaded? Does the backend have a limit?
  // Should we expose this to the user/settings?
  const {
    isLoading,
    data: dataSearch,
    error,
  } = useFetch("https://api.capacities.io/search", {
    method: "POST",
    body: JSON.stringify({
      mode: "title",
      searchTerm: searchText,
      spaceIds: spaceIDs,
    }),
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${preferences.bearerToken}`,
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
  });

  const onSpaceChange = (newValue: string) => {
    if (newValue === "all") {
      spaceIDs = spaces.map((space) => space.id);
    } else {
      spaceIDs = [newValue];
    }
  };

  return error ? (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={<SpaceDropdown spaces={spaces} onSpaceChange={onSpaceChange} />}
    >
      {searchText === "" || dataSearch?.results.length === 0 ? (
        <List.EmptyView title="Type something to get started" />
      ) : (
        dataSearch.results
          .filter((result) => result.title)
          .map((result) => {
            // TODO: remove this
            console.log(result);
            return (
              <List.Item
                key={result.id}
                title={result.title}
                accessories={[
                  {
                    // TODO: Add icon/colors for each content type
                    // and check if we can display the custom type created by the user.
                    // Some have stranges structureIds like:
                    // {
                    // spaceId: 'd38be211-54c0-4675-af4a-435e48559631',
                    // id: '49c81a7b-b87c-48db-b849-8d261735824a',
                    // structureId: 'b5eb756d-5166-4055-bb8f-83d8bf065dc0',
                    // title: 'Zettel #1',
                    // highlights: [ { context: [Object], snippets: [Array] } ]
                    // }
                    // It happens for zettel and projects.
                    // Get infos from space-info endpoint.
                    // TODO: add spaceName to content search if all spaces are selected
                    // TODO: show space selection only if more than one space
                    text: ContentType[result.structureId as keyof typeof ContentType] || "Unknown",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <OpenInCapacities target={`${result.spaceId}/${result.id}`} />
                  </ActionPanel>
                }
              />
            );
          })
      )}
    </List>
  );
}
