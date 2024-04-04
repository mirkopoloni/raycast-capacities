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
  closeMainWindow,
} from "@raycast/api";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { checkCapacitiesApp } from "./helpers/isCapacitiesInstalled";
import { useEffect, useRef } from "react";
import { useActiveTab } from "./helpers/useActiveTab";
import { ensureValidUrl } from "./helpers/ensureValidURL";
import axios, { AxiosError } from "axios";
import { isValidURL } from "./helpers/isValidURL";

interface Preferences {
  bearerToken: string;
}

interface WeblinkValues {
  spaceId: string;
  value: string;
  mdText?: string;
  tags?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  useEffect(() => {
    checkCapacitiesApp();
  }, []);

  const spacesDropdown = useRef<FormItemRef>(null);

  const markdown = "Bearer token incorrect. Please update it in extension preferences and try again.";
  const { isLoading, data, error } = useFetch("https://api.capacities.io/spaces", {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${preferences.bearerToken}`,
    },
  });

  const spaces = data?.spaces || [];

  const { handleSubmit, itemProps, setValue, values } = useForm<WeblinkValues>({
    async onSubmit(values) {
      const validUrl = ensureValidUrl(values.value);

      axios
        .post(
          "https://api.capacities.io/save-weblink",
          {
            spaceId: spaces.length === 1 ? spaces[0].id : values.spaceId,
            url: validUrl,
            mdText: values.mdText,
            tags: values.tags ? values.tags.split(",") : [],
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
          showHUD(`Weblink created ✌︎`, { popToRootType: PopToRootType.Immediate });
        })
        .catch((error: AxiosError) => {
          showToast({ style: Toast.Style.Failure, title: error.response?.data as string });
        });
      closeMainWindow();
    },
    validation: {
      value(value) {
        if (!value || value.trim() === "") {
          return "A link is required";
        }
        if (value && value.trim() !== "") {
          value = ensureValidUrl(value);
          setValue("value", value);
        }
        if (!isValidURL(value)) {
          return "Invalid URL";
        }
        try {
          new URL(value);
        } catch (_) {
          return "Invalid URL";
        }
        return undefined;
      },
      spaceId: spacesDropdown.current ? FormValidation.Required : undefined,
      tags(value) {
        if (value && value.split(",").length > 10) {
          return "Maximum of 10 tags allowed.";
        }
        return undefined;
      },
    },
  });

  const activeTab = useActiveTab();

  useEffect(() => {
    if (activeTab) {
      setValue("value", activeTab.url);
    }
  }, [activeTab]);

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
          <Action.SubmitForm title="Create Weblink" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {spaces.length > 1 && (
        <>
          <Form.Dropdown
            title="Space"
            {...itemProps.spaceId}
            storeValue
            onChange={() => setValue("tags", "")}
            ref={spacesDropdown}
          >
            {spaces &&
              spaces.map((space) => <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} />)}
          </Form.Dropdown>
          <Form.Separator />
        </>
      )}
      <Form.TextField title="Link" placeholder="Link here" {...itemProps.value} />
      <Form.TextField
        title="Tags"
        placeholder="Use a comma separated list of values."
        {...itemProps.tags}
        info="Tags to add to the weblink. Tags need to exactly match your tag names in Capacities, otherwise they will be created. You can add a maximum of 10 tags."
        storeValue
      />
      <Form.TextArea title="Notes" {...itemProps.mdText} />
    </Form>
  );
}
