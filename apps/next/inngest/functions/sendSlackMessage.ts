import env from "@/env";
import { inngest } from "@/inngest/client";

export default inngest.createFunction(
  { id: "send-slack-message" },
  { event: "slack.message.send" },
  async ({ event, step }) => {
    const { text, username, channel } = event.data;

    const webhookUrl = `https://hooks.slack.com/services/${env.SLACK_WEBHOOK_URL}`;

    await step.run("send-slack-message", async () => {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          channel: `#${channel || env.SLACK_WEBHOOK_CHANNEL}`,
          username,
        }),
      });

      return response.ok;
    });
  },
);
