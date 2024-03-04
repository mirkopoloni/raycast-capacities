import {
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  openExtensionPreferences,
  Form,
  Icon,
  showToast,
  showHUD,
  PopToRootType,
  Toast,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import { useEffect } from "react";
import axios from "axios";

interface Preferences {
  bearerToken: string;
}

interface NoteValues {
  spaceId: string;
  mdText: string;
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

  const spaces = data?.spaces || [];

  const { handleSubmit, itemProps, values } = useForm<NoteValues>({
    async onSubmit(values) {
      axios
        .post(
          "https://api.capacities.io/save-to-daily-note",
          {
            spaceId: values.spaceId,
            mdText: values.mdText,
          },
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${preferences.bearerToken}`,
              "Content-Type": "application/json",
            },
          },
        )
        .then(() => {
          showHUD(`Saved to daily note in ${activeSpace.title}`, {
            popToRootType: PopToRootType.Immediate,
          });
        })
        .catch((error) => {
          showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
        });
    },
    validation: {
      mdText: FormValidation.Required,
      spaceId: FormValidation.Required,
    },
  });

  const activeSpace = spaces && spaces.find((space) => space.id === values.spaceId);

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
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Daily Note" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Space" {...itemProps.spaceId}>
        {spaces && spaces.map((space) => <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea title="Markdown field" {...itemProps.mdText} />
    </Form>
  );
}
