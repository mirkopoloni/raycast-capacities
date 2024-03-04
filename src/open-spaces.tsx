import { Detail, List, ActionPanel, Action, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import OpenInCapacities from "./components/OpenInCapacities";
import { useEffect } from "react";

interface Preferences {
  bearerToken: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const markdown = "Bearer token incorrect. Please update it in extension preferences and try again.";
  const { isLoading, data, error } = useFetch("https://api.capacities.io/spaces", {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${preferences.bearerToken}`,
    },
  });

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
    <List isLoading={isLoading}>
      {data?.spaces.map((space) => (
        <List.Item
          key={space.id}
          title={space.title}
          subtitle={space.id}
          actions={
            <ActionPanel>
              <OpenInCapacities target={space.id} />
              <Action.CopyToClipboard content={space.id} title="Copy Space ID" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
