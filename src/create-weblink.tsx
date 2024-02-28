import {
  Detail,
  List,
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
import OpenInCapacities from "./components/OpenInCapacities";
import { useEffect } from "react";
import { useActiveTab } from "./helpers/useActiveTab";
import { ensureValidUrl } from "./helpers/ensureValidURL";
import axios from "axios";

interface Preferences {
  bearerToken: string;
}

interface WeblinkValues {
  spaceId: string;
  value: string;
  title?: string;
  mdText?: string;
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

  const { handleSubmit, itemProps, setValue, values } = useForm<WeblinkValues>({
    async onSubmit(values) {
      const validUrl = ensureValidUrl(values.value);

      axios
        .post(
          "https://api.capacities.io/save-weblink",
          {
            spaceId: values.spaceId,
            url: validUrl,
            titleOverwrite: values.title,
            mdText: values.mdText,
            // TODO: add tags
            // tagsExpand allarray<string><= 10 items
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
          showHUD(`Created in ${activeSpace.title}`, {
            popToRootType: PopToRootType.Immediate,
          });
        })
        .catch((error) => {
          showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
        });
    },
    validation: {
      value: FormValidation.Required,
      spaceId: FormValidation.Required,
    },
  });

  const activeTab = useActiveTab();

  useEffect(() => {
    if (activeTab) {
      setValue("value", activeTab.url);
      setValue("title", activeTab.title);
    }
  }, [activeTab]);

  useEffect(() => {
    if (values.value === "") {
      setValue("title", undefined);
    }
  }, [values.value]);

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
          <Action.SubmitForm title="Create Weblink" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Space" {...itemProps.spaceId}>
        {spaces && spaces.map((space) => <Form.Dropdown.Item key={space.id} value={space.id} title={space.title} />)}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Link" placeholder="Link here" {...itemProps.value} />
      <Form.TextField title="Custom title" {...itemProps.title} />
      <Form.TextArea title="Markdown field" {...itemProps.mdText} />
    </Form>
  );
}
