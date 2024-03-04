import {
  Detail,
  List,
  ActionPanel,
  Action,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import OpenInCapacities from "./components/OpenInCapacities";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import axios from "axios";

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

  let spaces: Space[] = [];
  const [spaceIDs, setSpaceIDs] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [results, setResults] = useState<any[]>();

  const { data, error, isLoading } = useFetch("https://api.capacities.io/spaces", {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${preferences.bearerToken}`,
    },
  });

  spaces = data?.spaces || [];

  useEffect(() => {
    setSpaceIDs(spaces.map((space) => space.id));
  }, []);

  useEffect(() => {
    searchContent();
  }, [searchText, spaceIDs]);

  // TODO: How many items will be loaded? Does the backend have a limit?
  // Should we expose this to the user/settings?
  const searchContent = () => {
    axios
      .post(
        "https://api.capacities.io/search",
        {
          mode: "title",
          searchTerm: searchText,
          spaceIds: spaceIDs,
        },
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${preferences.bearerToken}`,
            "Content-Type": "application/json",
          },
        },
      )
      .then((response) => {
        setResults(response.data.results);
      })
      .catch((error) => {
        showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
      });
  };

  const onSpaceChange = (newValue: string) => {
    if (newValue === "all") {
      setSpaceIDs(spaces.map((space) => space.id));
    } else {
      setSpaceIDs([newValue]);
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
      searchBarAccessory={spaces.length > 1 ? <SpaceDropdown spaces={spaces} onSpaceChange={onSpaceChange} /> : null}
    >
      {searchText === "" || !results || results.length === 0 ? (
        <List.EmptyView title="Type something to get started" />
      ) : (
        results
          .filter((result) => result.title)
          .map((result, index) => {
            // TODO: remove this
            console.log(result);
            return (
              <List.Item
                key={result.id + index}
                title={result.title}
                accessories={[
                  // TODO: Add icon/colors for each content type
                  // Get infos from space-info endpoint.
                  spaceIDs.length > 1
                    ? {
                        tag: {
                          value: spaces.find((space) => space.id === result.spaceId)?.title || "Unknown",
                          color: Color.Blue,
                        },
                        icon: Icon.Globe,
                      }
                    : {},
                  {
                    tag: {
                      value: ContentType[result.structureId as keyof typeof ContentType] || "Unknown",
                      color: Color.PrimaryText,
                    },
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
